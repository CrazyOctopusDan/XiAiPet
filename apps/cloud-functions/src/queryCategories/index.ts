import type { CatalogCategoryRecord } from '@xiaipet/shared/types/catalog-admin';

import { main as assertMerchantAccess } from '../assertMerchantAccess/index';
import { type FunctionContextLike } from '../shared/auth-context';
import { resolveRuntimeEnv } from '../shared/env';

export interface CategoryListItem extends CatalogCategoryRecord {
  linkedProductCount: number;
  canDelete: boolean;
}

export interface QueryCategoriesEvent {
  merchantUser?: unknown;
  openid?: string;
}

export interface CategoryRepository {
  listCategories(): Promise<CatalogCategoryRecord[]>;
  countProductsByCategory(categoryId: string): Promise<number>;
}

function createCategoryRepository(): CategoryRepository {
  try {
    const cloud = require('wx-server-sdk') as {
      init?: () => void;
      database?: () => {
        collection: (name: string) => {
          get: () => Promise<{ data: CatalogCategoryRecord[] }>;
          where: (query: Record<string, unknown>) => {
            get: () => Promise<{ data: Array<Record<string, unknown>> }>;
          };
        };
      };
    };

    cloud.init?.();
    const db = cloud.database?.();

    return {
      async listCategories() {
        if (!db) {
          return [];
        }

        const result = await db.collection('categories').get();
        return result.data ?? [];
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
      async listCategories() {
        return [];
      },
      async countProductsByCategory() {
        return 0;
      }
    };
  }
}

function sortCategories(list: CategoryListItem[]) {
  return [...list].sort((left, right) => {
    const updatedAtDiff = right.updatedAt.localeCompare(left.updatedAt);

    if (updatedAtDiff !== 0) {
      return updatedAtDiff;
    }

    return left.name.localeCompare(right.name);
  });
}

export async function main(
  event: QueryCategoriesEvent = {},
  context?: FunctionContextLike,
  repository: CategoryRepository = createCategoryRepository()
) {
  resolveRuntimeEnv(process.env.CLOUDBASE_ENV_NAME ?? 'dev');
  const access = await assertMerchantAccess(event, context);

  if (!access.allowed) {
    throw new Error('MERCHANT_FORBIDDEN');
  }

  const categories = await repository.listCategories();
  const items = await Promise.all(
    categories.map(async (category) => {
      const linkedProductCount = await repository.countProductsByCategory(category.id);
      return {
        ...category,
        linkedProductCount,
        canDelete: linkedProductCount === 0
      };
    })
  );

  return {
    ok: true,
    categories: sortCategories(items)
  };
}
