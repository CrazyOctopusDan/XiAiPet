import type { CatalogProductAdminRecord } from '@xiaipet/shared/types/catalog-admin';

import { main as assertMerchantAccess } from '../assertMerchantAccess/index';
import { type FunctionContextLike } from '../shared/auth-context';
import { resolveRuntimeEnv } from '../shared/env';

export interface QueryProductsEvent {
  categoryId?: string;
  merchantUser?: unknown;
  openid?: string;
}

export interface ProductRepository {
  listProducts(): Promise<CatalogProductAdminRecord[]>;
}

function createProductRepository(): ProductRepository {
  try {
    const cloud = require('wx-server-sdk') as {
      init?: () => void;
      database?: () => {
        collection: (name: string) => {
          get: () => Promise<{ data: CatalogProductAdminRecord[] }>;
        };
      };
    };

    cloud.init?.();
    const db = cloud.database?.();

    return {
      async listProducts() {
        if (!db) {
          return [];
        }

        const result = await db.collection('products').get();
        return result.data ?? [];
      }
    };
  } catch (error) {
    return {
      async listProducts() {
        return [];
      }
    };
  }
}

export async function main(
  event: QueryProductsEvent = {},
  context?: FunctionContextLike,
  repository: ProductRepository = createProductRepository()
) {
  resolveRuntimeEnv(process.env.CLOUDBASE_ENV_NAME ?? 'dev');
  const access = await assertMerchantAccess(event, context);

  if (!access.allowed) {
    throw new Error('MERCHANT_FORBIDDEN');
  }

  const products = await repository.listProducts();
  const filtered = event.categoryId
    ? products.filter((product) => product.categoryId === event.categoryId)
    : products;

  return {
    ok: true,
    products: [...filtered].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
  };
}
