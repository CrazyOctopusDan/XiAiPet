import type {
  CatalogProductAdminRecord,
  CatalogProductEditorPayload
} from '@xiaipet/shared/types/catalog-admin';
import { isCatalogProductAdminRecord, isCatalogProductEditorPayload } from '../../../../packages/shared/src/schema/catalog-admin';
import { resolveProductCombinationPrice, validateProductSavePricingContract } from '../../../../packages/shared/src/rules/product-pricing';

import { main as assertMerchantAccess } from '../assertMerchantAccess/index';
import { type FunctionContextLike } from '../shared/auth-context';
import { resolveRuntimeEnv } from '../shared/env';

type UpsertProductPayload = CatalogProductEditorPayload | CatalogProductAdminRecord;

export interface UpsertProductEvent {
  payload?: unknown;
  merchantUser?: unknown;
  openid?: string;
  now?: string;
}

export interface ProductMutationRepository {
  saveProduct(product: CatalogProductAdminRecord): Promise<CatalogProductAdminRecord>;
  getProductById(productId: string): Promise<CatalogProductAdminRecord | null>;
  categoryExists(categoryId: string): Promise<boolean>;
}

function createProductMutationRepository(): ProductMutationRepository {
  try {
    const cloud = require('wx-server-sdk') as {
      init?: () => void;
      database?: () => {
        collection: (name: string) => {
          doc: (id: string) => {
            get: () => Promise<{ data: CatalogProductAdminRecord | null }>;
            set: (options: { data: CatalogProductAdminRecord }) => Promise<unknown>;
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
      async saveProduct(product) {
        if (!db) {
          return product;
        }

        await db.collection('products').doc(product.id).set({
          data: product
        });
        return product;
      },
      async getProductById(productId) {
        if (!db) {
          return null;
        }

        const result = await db.collection('products').doc(productId).get();
        return result.data ?? null;
      },
      async categoryExists(categoryId) {
        if (!db) {
          return true;
        }

        const result = await db.collection('categories').where({ id: categoryId }).get();
        return result.data.length > 0;
      }
    };
  } catch (error) {
    return {
      async saveProduct(product) {
        return product;
      },
      async getProductById() {
        return null;
      },
      async categoryExists() {
        return true;
      }
    };
  }
}

function normalizePayload(
  payload: UpsertProductPayload,
  now: string,
  existing?: CatalogProductAdminRecord | null
): CatalogProductAdminRecord {
  if (isCatalogProductAdminRecord(payload)) {
    return {
      ...payload,
      createdAt: existing?.createdAt ?? payload.createdAt,
      updatedAt: now
    };
  }

  if (!isCatalogProductEditorPayload(payload)) {
    throw new Error('INVALID_PRODUCT_PAYLOAD');
  }

  return {
    id: payload.basicInfo.productId,
    name: payload.basicInfo.name,
    description: payload.basicInfo.description,
    categoryId: payload.basicInfo.categoryId,
    imageFileId: payload.basicInfo.imageFileId,
    imagePreviewUrl: payload.basicInfo.imagePreviewUrl,
    memberLevelId: payload.basicInfo.memberLevelId,
    status: payload.publishSettings.status,
    stock: payload.basicInfo.stock,
    trackInventory: payload.publishSettings.trackInventory,
    fulfillmentModes: payload.publishSettings.fulfillmentModes,
    basePrice: payload.pricing.basePrice,
    specs: payload.pricing.specs,
    formulas: payload.pricing.formulas,
    priceOverrides: payload.pricing.overrides,
    purchaseLimit: payload.pricing.purchaseLimit,
    detailContent: payload.pricing.detailContent,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };
}

function validateResolvedProduct(product: CatalogProductAdminRecord) {
  const saveContract = validateProductSavePricingContract(product);

  if (!saveContract.valid) {
    throw new Error(`INVALID_PRODUCT_SAVE_CONTRACT:${saveContract.issues.join(',')}`);
  }

  product.priceOverrides.forEach((override) => {
    resolveProductCombinationPrice(product, {
      specId: override.specId,
      formulaId: override.formulaId
    });
  });
}

export async function main(
  event: UpsertProductEvent = {},
  context?: FunctionContextLike,
  repository: ProductMutationRepository = createProductMutationRepository()
) {
  resolveRuntimeEnv(process.env.CLOUDBASE_ENV_NAME ?? 'dev');
  const access = await assertMerchantAccess(event, context);

  if (!access.allowed) {
    throw new Error('MERCHANT_FORBIDDEN');
  }

  if (!event.payload) {
    throw new Error('INVALID_PRODUCT_PAYLOAD');
  }

  const payload = event.payload as UpsertProductPayload;
  const productId = isCatalogProductAdminRecord(payload) ? payload.id : isCatalogProductEditorPayload(payload) ? payload.basicInfo.productId : null;
  const existing = productId ? await repository.getProductById(productId) : null;
  const product = normalizePayload(payload, event.now ?? new Date().toISOString(), existing);

  if (!(await repository.categoryExists(product.categoryId))) {
    throw new Error('CATEGORY_NOT_FOUND');
  }

  validateResolvedProduct(product);

  return {
    ok: true,
    product: await repository.saveProduct(product)
  };
}
