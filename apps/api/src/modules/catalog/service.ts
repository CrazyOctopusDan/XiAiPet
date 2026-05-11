import { ApiError } from '../../lib/errors';
import { createCatalogRepository, type CatalogProductRecord } from './repository';
import type { MerchantContext } from '../auth/types';

interface CatalogProductEditorPayload {
  basicInfo: {
    name: string;
    description: string;
    categoryId: string;
    imageFileId: string;
    imagePreviewUrl?: string;
    memberLevelId: string | null;
    stock: number;
  };
  pricing: {
    basePrice: number;
    specs: unknown[];
    formulas: unknown[];
    overrides: unknown[];
    purchaseLimit: unknown;
    detailContent: string;
  };
  publishSettings: {
    status: 'draft' | 'published' | 'archived';
    trackInventory: boolean;
    fulfillmentModes: unknown[];
  };
}

function isCatalogProductEditorPayload(value: unknown): value is CatalogProductEditorPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  const basicInfo = candidate.basicInfo as Record<string, unknown> | undefined;
  const pricing = candidate.pricing as Record<string, unknown> | undefined;
  const publishSettings = candidate.publishSettings as Record<string, unknown> | undefined;
  return Boolean(
    basicInfo &&
      pricing &&
      publishSettings &&
      typeof basicInfo.name === 'string' &&
      typeof basicInfo.description === 'string' &&
      typeof basicInfo.categoryId === 'string' &&
      typeof basicInfo.imageFileId === 'string' &&
      typeof basicInfo.stock === 'number' &&
      typeof pricing.basePrice === 'number' &&
      Array.isArray(pricing.specs) &&
      Array.isArray(pricing.formulas) &&
      Array.isArray(pricing.overrides) &&
      typeof pricing.detailContent === 'string' &&
      (publishSettings.status === 'draft' || publishSettings.status === 'published' || publishSettings.status === 'archived') &&
      typeof publishSettings.trackInventory === 'boolean' &&
      Array.isArray(publishSettings.fulfillmentModes)
  );
}

export function createCatalogService(catalogRepository = createCatalogRepository()) {
  return {
    async queryCustomerCategories() {
      const categories = await catalogRepository.listCategories();
      return { ok: true as const, categories };
    },

    async queryCustomerProducts(filters: { categoryId?: string } = {}) {
      const products = await catalogRepository.listProducts({
        categoryId: filters.categoryId,
        status: 'published'
      });
      return { ok: true as const, products };
    },

    async queryMerchantCategories(_filters: Record<string, unknown> = {}) {
      const categories = await catalogRepository.listCategories();
      return { ok: true as const, categories };
    },

    async upsertMerchantCategory(
      _merchantContext: MerchantContext,
      categoryId: string,
      payload: unknown
    ) {
      if (!payload || typeof payload !== 'object') {
        throw new ApiError('INVALID_CATEGORY', 'Invalid category payload', 400);
      }
      const candidate = payload as Record<string, unknown>;
      if (typeof candidate.name !== 'string' || typeof candidate.iconToken !== 'string') {
        throw new ApiError('INVALID_CATEGORY', 'Invalid category payload', 400);
      }
      const category = await catalogRepository.upsertCategory({
        id: categoryId,
        name: candidate.name,
        iconToken: candidate.iconToken,
        sortOrder: typeof candidate.sortOrder === 'number' ? candidate.sortOrder : 0
      });
      return { ok: true as const, category };
    },

    async deleteMerchantCategory(_merchantContext: MerchantContext, categoryId: string) {
      const linkedProductCount = await catalogRepository.countProductsByCategory(categoryId);
      if (linkedProductCount > 0) {
        throw new ApiError('CATEGORY_HAS_PRODUCTS', 'Category has linked products', 409);
      }

      await catalogRepository.deleteCategory(categoryId);
      return { ok: true as const, deletedCategoryId: categoryId };
    },

    async queryMerchantProducts(filters: { categoryId?: string } = {}) {
      const products = await catalogRepository.listProducts({ categoryId: filters.categoryId });
      return { ok: true as const, products };
    },

    async upsertMerchantProduct(
      _merchantContext: MerchantContext,
      productId: string,
      payload: unknown
    ) {
      if (!isCatalogProductEditorPayload(payload)) {
        throw new ApiError('INVALID_PRODUCT', 'Invalid product payload', 400);
      }
      const product: CatalogProductRecord = {
        id: productId,
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const saved = await catalogRepository.upsertProduct(product);
      return { ok: true as const, product: saved };
    }
  };
}
