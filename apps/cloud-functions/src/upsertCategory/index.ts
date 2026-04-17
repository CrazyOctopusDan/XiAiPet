import type { CatalogCategoryRecord } from '@xiaipet/shared/types/catalog-admin';
import { isCatalogCategoryRecord } from '../../../../packages/shared/src/schema/catalog-admin';

import { main as assertMerchantAccess } from '../assertMerchantAccess/index';
import { type FunctionContextLike } from '../shared/auth-context';
import { resolveRuntimeEnv } from '../shared/env';

type UpsertCategoryAction = 'create' | 'update' | 'delete';

export interface UpsertCategoryEvent {
  action?: UpsertCategoryAction;
  category?: unknown;
  categoryId?: string;
  merchantUser?: unknown;
  openid?: string;
}

export interface CategoryMutationRepository {
  saveCategory(category: CatalogCategoryRecord): Promise<CatalogCategoryRecord>;
  deleteCategory(categoryId: string): Promise<void>;
  countProductsByCategory(categoryId: string): Promise<number>;
}

function createCategoryMutationRepository(): CategoryMutationRepository {
  try {
    const cloud = require('wx-server-sdk') as {
      init?: () => void;
      database?: () => {
        collection: (name: string) => {
          doc: (id: string) => {
            set: (options: { data: CatalogCategoryRecord }) => Promise<unknown>;
            remove: () => Promise<unknown>;
          };
          where: (query: Record<string, unknown>) => {
            get: () => Promise<{ data: Array<Record<string, unknown>> }>;
          };
        };
      };
    };

    cloud.init?.();
    const db = cloud.database?.();

    return {
      async saveCategory(category) {
        if (!db) {
          return category;
        }

        await db.collection('categories').doc(category.id).set({
          data: category
        });
        return category;
      },
      async deleteCategory(categoryId) {
        if (!db) {
          return;
        }

        await db.collection('categories').doc(categoryId).remove();
      },
      async countProductsByCategory(categoryId) {
        if (!db) {
          return 0;
        }

        const result = await db.collection('products').where({ categoryId }).get();
        return result.data.length;
      }
    };
  } catch (error) {
    return {
      async saveCategory(category) {
        return category;
      },
      async deleteCategory() {
        return;
      },
      async countProductsByCategory() {
        return 0;
      }
    };
  }
}

export async function main(
  event: UpsertCategoryEvent = {},
  context?: FunctionContextLike,
  repository: CategoryMutationRepository = createCategoryMutationRepository()
) {
  resolveRuntimeEnv(process.env.CLOUDBASE_ENV_NAME ?? 'dev');
  const access = await assertMerchantAccess(event, context);

  if (!access.allowed) {
    throw new Error('MERCHANT_FORBIDDEN');
  }

  if (event.action === 'delete') {
    if (!event.categoryId) {
      throw new Error('INVALID_CATEGORY_ID');
    }

    const linkedProductCount = await repository.countProductsByCategory(event.categoryId);

    if (linkedProductCount > 0) {
      throw new Error(`CATEGORY_HAS_LINKED_PRODUCTS:${linkedProductCount}`);
    }

    await repository.deleteCategory(event.categoryId);
    return {
      ok: true,
      deletedCategoryId: event.categoryId
    };
  }

  if (!isCatalogCategoryRecord(event.category)) {
    throw new Error('INVALID_CATEGORY_PAYLOAD');
  }

  return {
    ok: true,
    category: await repository.saveCategory(event.category)
  };
}
