import { ApiError } from '../../lib/errors';
import {
  createCatalogRepository,
  type CatalogAvailabilityFilter,
  type CatalogCategoryRecord,
  type CatalogDeliveryModeFilter,
  type CatalogPageInfo,
  type CatalogProductPage,
  type CatalogProductRecord,
  type CatalogProductSummaryRecord,
  type CustomerCategorySummaryRecord
} from './repository';
import type { MerchantContext } from '../auth/types';
import type { CatalogOssAssetReference } from './repository';

type CustomerDeliveryMode = CatalogDeliveryModeFilter;

const DEFAULT_PRODUCT_DETAIL_IMAGES: string[] = [];

interface CustomerCatalogCategory {
  id: string;
  name: string;
  shortName: string;
  iconText: string;
  sectionTitle: string;
  availableCount?: number;
  soldOutCount?: number;
  previewCount?: number;
  firstProductUpdatedAt?: string | null;
}

interface MerchantCatalogCategory extends CatalogCategoryRecord {
  linkedProductCount: number;
  canDelete: boolean;
}

interface CustomerProductSpecOption {
  id: string;
  label: string;
  price: number;
}

interface CustomerCatalogProduct {
  id: string;
  name: string;
  summary: string;
  description: string;
  price: number;
  stock: number;
  soldOut: boolean;
  cartActionLabel: '选规格' | '直接加购';
  memberLevelLabel: string;
  categoryId: string;
  deliveryModes: CustomerDeliveryMode[];
  thumbnail: string;
  imageAsset?: CatalogOssAssetReference;
  gallery: string[];
  introductionImageAssets?: CatalogOssAssetReference[];
  detailImages: string[];
  detailImageAssets?: CatalogOssAssetReference[];
  specs: CustomerProductSpecOption[];
}

interface CustomerProductListItem {
  id: string;
  name: string;
  summary: string;
  categoryId: string;
  minPrice: number;
  stock: number;
  soldOut: boolean;
  cartActionLabel: '选规格' | '直接加购';
  memberLevelLabel: string;
  thumbnail: string;
  updatedAt: string;
}

interface CatalogProductEditorPayload {
  basicInfo: {
    name: string;
    description: string;
    categoryId: string;
    imageFileId: string;
    imageAsset?: CatalogOssAssetReference;
    imagePreviewUrl?: string;
    introductionImageAssets?: CatalogOssAssetReference[];
    detailImageAssets?: CatalogOssAssetReference[];
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

type CatalogRepository = ReturnType<typeof createCatalogRepository>;

interface CatalogSummaryRepositoryMethods {
  listCustomerCatalogCategories(filters: { deliveryMode?: CustomerDeliveryMode }): Promise<CustomerCategorySummaryRecord[]>;
  createCustomerCategorySnapshotKey(filters: { deliveryMode?: CustomerDeliveryMode }): Promise<string>;
  listCustomerCategoryProductSummaries(input: {
    categoryId: string;
    deliveryMode?: CustomerDeliveryMode;
    availability: CatalogAvailabilityFilter;
    limit?: number;
    cursor?: string;
  }): Promise<CatalogProductPage<CatalogProductSummaryRecord>>;
  createCustomerCategoryProductsSnapshotKey(input: {
    categoryId: string;
    deliveryMode?: CustomerDeliveryMode;
    availability: CatalogAvailabilityFilter;
  }): Promise<string>;
}

type CatalogRepositoryContract = CatalogRepository & Partial<CatalogSummaryRepositoryMethods>;

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isCustomerDeliveryMode(value: unknown): value is CustomerDeliveryMode {
  return value === 'pickup' || value === 'delivery' || value === 'express';
}

interface PricingOption {
  id: string;
  label: string;
  surcharge?: number;
}

interface PriceOverride {
  specId: string;
  formulaId: string;
  price: number;
}

type CustomerProductPricingSource = Pick<CatalogProductRecord, 'basePrice' | 'specs' | 'formulas' | 'priceOverrides'>;

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function isPricingOption(value: unknown): value is PricingOption {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    typeof value.label === 'string' &&
    (value.surcharge === undefined || (typeof value.surcharge === 'number' && Number.isFinite(value.surcharge)))
  );
}

function isPriceOverride(value: unknown): value is PriceOverride {
  return (
    isObject(value) &&
    typeof value.specId === 'string' &&
    typeof value.formulaId === 'string' &&
    typeof value.price === 'number' &&
    Number.isFinite(value.price)
  );
}

function getAssetUrl(asset: CatalogOssAssetReference | undefined, variantName: string) {
  if (!asset) {
    return undefined;
  }

  const variants = Array.isArray(asset.variants) ? asset.variants : [];
  const variant = variants.find(
    (item): item is { name: string; url: string } =>
      isObject(item) && item.name === variantName && typeof item.url === 'string'
  );

  return normalizeImageUrlForDisplay(variant?.url ?? asset.url);
}

function getAssetUrls(assets: CatalogOssAssetReference[] | undefined, variantName: string) {
  return (assets ?? []).map((asset) => getAssetUrl(asset, variantName) ?? normalizeImageUrlForDisplay(asset.url) ?? '');
}

function normalizeImageUrlForDisplay(value: string | undefined): string | undefined {
  const trimmed = value?.trim();

  if (!trimmed) {
    return trimmed;
  }

  if (trimmed.startsWith('https://')) {
    return trimmed;
  }

  if (trimmed.startsWith('http://')) {
    return `https://${trimmed.slice('http://'.length)}`;
  }

  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('cloud://') ||
    trimmed.startsWith('oss://') ||
    /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
  ) {
    return trimmed;
  }

  return `https://${trimmed.replace(/^\/+/, '')}`;
}

function normalizeAssetReference(asset: CatalogOssAssetReference | undefined): CatalogOssAssetReference | undefined {
  if (!asset) {
    return undefined;
  }

  return {
    ...asset,
    url: normalizeImageUrlForDisplay(asset.url) ?? asset.url,
    variants: Array.isArray(asset.variants)
      ? asset.variants.map((variant) =>
          isObject(variant) && typeof variant.url === 'string'
            ? { ...variant, url: normalizeImageUrlForDisplay(variant.url) ?? variant.url }
            : variant
        )
      : asset.variants
  };
}

function normalizeAssetReferences(assets: CatalogOssAssetReference[] | undefined): CatalogOssAssetReference[] | undefined {
  return assets?.map((asset) => normalizeAssetReference(asset) ?? asset);
}

function normalizeProductImageUrls(product: CatalogProductRecord): CatalogProductRecord {
  return {
    ...product,
    imageAsset: normalizeAssetReference(product.imageAsset),
    imagePreviewUrl: normalizeImageUrlForDisplay(product.imagePreviewUrl),
    introductionImageAssets: normalizeAssetReferences(product.introductionImageAssets),
    detailImageAssets: normalizeAssetReferences(product.detailImageAssets)
  };
}

function normalizeProductSummaryImageUrls(product: CatalogProductSummaryRecord): CatalogProductSummaryRecord {
  return {
    ...product,
    imageAsset: normalizeAssetReference(product.imageAsset),
    imagePreviewUrl: normalizeImageUrlForDisplay(product.imagePreviewUrl)
  };
}

function mapCustomerCategory(category: CatalogCategoryRecord | CustomerCategorySummaryRecord): CustomerCatalogCategory {
  const mapped: CustomerCatalogCategory = {
    id: category.id,
    name: category.name,
    shortName: category.name,
    iconText: category.iconToken,
    sectionTitle: category.name
  };

  if ('availableCount' in category) {
    mapped.availableCount = category.availableCount;
    mapped.soldOutCount = category.soldOutCount;
    mapped.previewCount = category.previewCount;
    mapped.firstProductUpdatedAt = category.firstProductUpdatedAt;
  }

  return mapped;
}

async function mapMerchantCategory(
  category: CatalogCategoryRecord,
  countProductsByCategory: (categoryId: string) => Promise<number>
): Promise<MerchantCatalogCategory> {
  const linkedProductCount = await countProductsByCategory(category.id);

  return {
    ...category,
    linkedProductCount,
    canDelete: linkedProductCount === 0
  };
}

function getCustomerDeliveryModes(product: CatalogProductRecord): CustomerDeliveryMode[] {
  const modes = product.fulfillmentModes.filter(isCustomerDeliveryMode);
  return modes.length ? modes : ['pickup', 'delivery', 'express'];
}

function getPriceOverride(product: CustomerProductPricingSource, specId: string, formulaId: string) {
  return product.priceOverrides.find(
    (override): override is PriceOverride =>
      isPriceOverride(override) && override.specId === specId && override.formulaId === formulaId
  )?.price;
}

function getCustomerSpecs(product: CustomerProductPricingSource): CustomerProductSpecOption[] {
  const specs = product.specs.filter(isPricingOption);
  const formulas = product.formulas.filter(isPricingOption);

  if (specs.length && formulas.length) {
    return specs.flatMap((spec) =>
      formulas.map((formula) => ({
        id: `${spec.id}__${formula.id}`,
        label: `${spec.label} ${formula.label}`,
        price: roundCurrency(
          getPriceOverride(product, spec.id, formula.id) ??
            product.basePrice + (spec.surcharge ?? 0) + (formula.surcharge ?? 0)
        )
      }))
    );
  }

  const singleAxisOptions = specs.length ? specs : formulas;
  return singleAxisOptions.map((option) => ({
    id: option.id,
    label: option.label,
    price: roundCurrency(product.basePrice + (option.surcharge ?? 0))
  }));
}

function isCustomerProductSoldOut(product: Pick<CatalogProductSummaryRecord, 'trackInventory' | 'stock'>) {
  return product.trackInventory && product.stock <= 0;
}

function matchesCustomerDeliveryMode(product: CatalogProductSummaryRecord, deliveryMode: CustomerDeliveryMode | undefined) {
  if (!deliveryMode) {
    return true;
  }

  const modes = product.fulfillmentModes.filter(isCustomerDeliveryMode);
  return modes.length === 0 || modes.includes(deliveryMode);
}

function pickProductSummary(product: CatalogProductRecord): CatalogProductSummaryRecord {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    categoryId: product.categoryId,
    imageFileId: product.imageFileId,
    imageAsset: product.imageAsset,
    imagePreviewUrl: product.imagePreviewUrl,
    memberLevelId: product.memberLevelId,
    stock: product.stock,
    trackInventory: product.trackInventory,
    fulfillmentModes: product.fulfillmentModes,
    basePrice: product.basePrice,
    specs: product.specs,
    formulas: product.formulas,
    priceOverrides: product.priceOverrides,
    updatedAt: product.updatedAt
  };
}

function createFallbackProductSummaryPage(
  products: CatalogProductRecord[],
  input: {
    deliveryMode?: CustomerDeliveryMode;
    availability: CatalogAvailabilityFilter;
    limit?: number;
  }
): CatalogProductPage<CatalogProductSummaryRecord> {
  const filtered = products
    .map(pickProductSummary)
    .filter((product) => matchesCustomerDeliveryMode(product, input.deliveryMode))
    .filter((product) => {
      const soldOut = isCustomerProductSoldOut(product);
      return input.availability === 'soldOut' ? soldOut : !soldOut;
    });
  const limit = typeof input.limit === 'number' && input.limit > 0 ? input.limit : filtered.length;

  return {
    items: filtered.slice(0, limit),
    hasMore: filtered.length > limit,
    nextCursor: null
  };
}

function mapCustomerProduct(product: CatalogProductRecord): CustomerCatalogProduct {
  const normalizedProduct = normalizeProductImageUrls(product);
  const specs = getCustomerSpecs(product);
  const thumbnail =
    getAssetUrl(normalizedProduct.imageAsset, 'thumbnail') ??
    normalizedProduct.imagePreviewUrl ??
    normalizedProduct.imageAsset?.url ??
    normalizedProduct.imageFileId;
  const gallery = getAssetUrls(normalizedProduct.introductionImageAssets, 'display');
  const detailImages = getAssetUrls(normalizedProduct.detailImageAssets, 'detail');

  return {
    id: normalizedProduct.id,
    name: normalizedProduct.name,
    summary: normalizedProduct.description,
    description: normalizedProduct.detailContent || normalizedProduct.description,
    price: roundCurrency(normalizedProduct.basePrice),
    stock: normalizedProduct.stock,
    soldOut: normalizedProduct.trackInventory && normalizedProduct.stock <= 0,
    cartActionLabel: specs.length ? '选规格' : '直接加购',
    memberLevelLabel: normalizedProduct.memberLevelId ? '会员可购' : '普通会员可购',
    categoryId: normalizedProduct.categoryId,
    deliveryModes: getCustomerDeliveryModes(normalizedProduct),
    thumbnail,
    imageAsset: normalizedProduct.imageAsset,
    gallery: gallery.length ? gallery : thumbnail ? [thumbnail] : [],
    introductionImageAssets: normalizedProduct.introductionImageAssets,
    detailImages: detailImages.length ? detailImages : DEFAULT_PRODUCT_DETAIL_IMAGES,
    detailImageAssets: normalizedProduct.detailImageAssets,
    specs
  };
}

function mapCustomerProductSummary(product: CatalogProductSummaryRecord): CustomerProductListItem {
  const normalizedProduct = normalizeProductSummaryImageUrls(product);
  const specs = getCustomerSpecs(normalizedProduct);
  const thumbnail =
    getAssetUrl(normalizedProduct.imageAsset, 'thumbnail') ??
    normalizedProduct.imagePreviewUrl ??
    normalizedProduct.imageAsset?.url ??
    normalizedProduct.imageFileId;
  const specPrices = specs.map((spec) => spec.price);

  return {
    id: normalizedProduct.id,
    name: normalizedProduct.name,
    summary: normalizedProduct.description,
    categoryId: normalizedProduct.categoryId,
    minPrice: roundCurrency(specPrices.length ? Math.min(...specPrices) : normalizedProduct.basePrice),
    stock: normalizedProduct.stock,
    soldOut: isCustomerProductSoldOut(normalizedProduct),
    cartActionLabel: specs.length ? '选规格' : '直接加购',
    memberLevelLabel: normalizedProduct.memberLevelId ? '会员可购' : '普通会员可购',
    thumbnail,
    updatedAt: normalizedProduct.updatedAt
  };
}

function isOssAssetReference(value: unknown): value is CatalogOssAssetReference {
  return (
    isObject(value) &&
    value.provider === 'oss' &&
    typeof value.role === 'string' &&
    typeof value.bucket === 'string' &&
    typeof value.region === 'string' &&
    typeof value.objectKey === 'string' &&
    typeof value.url === 'string' &&
    typeof value.width === 'number' &&
    typeof value.height === 'number' &&
    typeof value.sizeBytes === 'number' &&
    typeof value.contentType === 'string' &&
    typeof value.uploadedAt === 'string' &&
    Array.isArray(value.variants)
  );
}

function isProductBasicImageAssets(value: unknown) {
  return value === undefined || (Array.isArray(value) && value.length <= 3 && value.every(isOssAssetReference));
}

function isProductDetailImageAssets(value: unknown) {
  return value === undefined || (Array.isArray(value) && value.length <= 9 && value.every(isOssAssetReference));
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
      (basicInfo.imageAsset === undefined || isOssAssetReference(basicInfo.imageAsset)) &&
      isProductBasicImageAssets(basicInfo.introductionImageAssets) &&
      isProductDetailImageAssets(basicInfo.detailImageAssets) &&
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

export function createCatalogService(catalogRepository: CatalogRepositoryContract = createCatalogRepository()) {
  return {
    async queryCustomerCategories(filters: { deliveryMode?: CustomerDeliveryMode } = {}) {
      if (catalogRepository.listCustomerCatalogCategories) {
        const categories = await catalogRepository.listCustomerCatalogCategories(filters);
        const snapshotKey = catalogRepository.createCustomerCategorySnapshotKey
          ? await catalogRepository.createCustomerCategorySnapshotKey(filters)
          : '';

        return {
          ok: true as const,
          categories: categories.map(mapCustomerCategory),
          snapshotKey
        };
      }

      const categories = await catalogRepository.listCategories();
      return { ok: true as const, categories: categories.map(mapCustomerCategory), snapshotKey: '' };
    },

    async queryCustomerProducts(filters: { categoryId?: string } = {}) {
      const products = await catalogRepository.listProducts({
        categoryId: filters.categoryId,
        status: 'published'
      });
      return { ok: true as const, products: products.map(mapCustomerProduct) };
    },

    async queryCustomerCategoryProducts(input: {
      categoryId: string;
      deliveryMode?: CustomerDeliveryMode;
      availability: CatalogAvailabilityFilter;
      limit?: number;
      cursor?: string;
    }) {
      const page = catalogRepository.listCustomerCategoryProductSummaries
        ? await catalogRepository.listCustomerCategoryProductSummaries(input)
        : createFallbackProductSummaryPage(
            await catalogRepository.listProducts({
              categoryId: input.categoryId,
              status: 'published'
            }),
            input
          );
      const pageInfo: CatalogPageInfo = {
        hasMore: page.hasMore,
        nextCursor: page.nextCursor
      };
      const snapshotKey = catalogRepository.createCustomerCategoryProductsSnapshotKey
        ? await catalogRepository.createCustomerCategoryProductsSnapshotKey({
            categoryId: input.categoryId,
            deliveryMode: input.deliveryMode,
            availability: input.availability
          })
        : '';

      return {
        ok: true as const,
        categoryId: input.categoryId,
        availability: input.availability,
        items: page.items.map(mapCustomerProductSummary),
        pageInfo,
        snapshotKey
      };
    },

    async queryMerchantCategories(_filters: Record<string, unknown> = {}) {
      const categories = await catalogRepository.listCategories();
      return {
        ok: true as const,
        categories: await Promise.all(
          categories.map((category) =>
            mapMerchantCategory(category, catalogRepository.countProductsByCategory)
          )
        )
      };
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
      return { ok: true as const, products: products.map(normalizeProductImageUrls) };
    },

    async deleteMerchantProduct(
      _merchantContext: MerchantContext,
      productId: string
    ) {
      await catalogRepository.deleteProduct(productId);
      return { ok: true as const, deletedProductId: productId };
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
        imageAsset: payload.basicInfo.imageAsset,
        imagePreviewUrl: payload.basicInfo.imagePreviewUrl,
        introductionImageAssets: payload.basicInfo.introductionImageAssets,
        detailImageAssets: payload.basicInfo.detailImageAssets,
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
      const saved = await catalogRepository.upsertProduct(normalizeProductImageUrls(product));
      return { ok: true as const, product: saved };
    }
  };
}
