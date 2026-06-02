import { catalogCategories, catalogProducts, homeModules } from '../data/catalog';
import type {
  CatalogCategory,
  CatalogCategoryWithCounts,
  CatalogPageInfo,
  CatalogProduct,
  CatalogProductSummary,
  CatalogSection,
  CatalogSectionState,
  DeliveryMode,
  HomeModule,
  ProductSpecOption
} from '../types/catalog';
import type { OssAssetReference, OssAssetVariantName } from '@xiaipet/shared/types/assets';

import { customerApiRequest, type CustomerApiRequestOptions } from './api-client';

export interface HomeModuleDisplay extends HomeModule {
  imageSrc: string;
}

type HomeModuleImageResolver = (fileIds: string[]) => Promise<Record<string, string>>;
type CatalogApiRequester = <T>(path: string, options?: CustomerApiRequestOptions) => Promise<T>;

interface CatalogCategoriesResponse {
  ok?: boolean;
  categories?: unknown[];
  snapshotKey?: string;
}

interface CatalogProductsResponse {
  ok?: boolean;
  products?: unknown[];
}

type CatalogProductAvailability = 'available' | 'soldOut';

interface CustomerCategoryProductsResponse {
  ok?: boolean;
  categoryId?: string;
  availability?: CatalogProductAvailability;
  items?: unknown[];
  pageInfo?: Partial<CatalogPageInfo>;
  snapshotKey?: string;
}

interface CustomerCatalogSearchResponse {
  ok?: boolean;
  items?: unknown[];
  pageInfo?: Partial<CatalogPageInfo>;
  snapshotKey?: string;
}

interface CustomerProductDetailResponse {
  ok?: boolean;
  product?: unknown;
}

const DEFAULT_PRODUCT_DETAIL_IMAGES: string[] = [];
const CATEGORY_PRODUCTS_PAGE_SIZE = 20;
const OSS_DISPLAY_RULES: Partial<Record<OssAssetVariantName, string>> = {
  thumbnail: 'image/resize,m_fill,w_360,h_360/format,webp/quality,q_76',
  display: 'image/resize,m_fill,w_720,h_720/format,webp/quality,q_80',
  detail: 'image/resize,m_lfit,w_720/format,webp/quality,q_78',
  banner: 'image/resize,m_lfit,w_750/format,webp/quality,q_80'
};
const OSS_ROLE_DISPLAY_RULES: Partial<Record<OssAssetReference['role'], Partial<Record<OssAssetVariantName, string>>>> = {
  'product-introduction': {
    display: 'image/resize,m_fill,w_750,h_670/format,webp/quality,q_80'
  }
};

function shouldUseLocalCatalogFixtures() {
  return (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV === 'test';
}

let cachedCatalogCategories = shouldUseLocalCatalogFixtures() ? cloneCategories(catalogCategories.map(toCategoryWithCounts)) : [];
let cachedCatalogProducts = shouldUseLocalCatalogFixtures() ? cloneProducts(catalogProducts) : [];
const categoryCache = new Map<DeliveryMode, CatalogCategoryWithCounts[]>();
const sectionCache = new Map<string, CatalogSectionState>();
const productDetailCache = new Map<string, CatalogProduct>();

export function getHomeModules(): HomeModule[] {
  return homeModules;
}

async function defaultResolveHomeModuleImages(): Promise<Record<string, string>> {
  return {};
}

export async function resolveHomeModuleImageSources(
  resolveImages: HomeModuleImageResolver = defaultResolveHomeModuleImages
): Promise<HomeModuleDisplay[]> {
  const modules = getHomeModules();
  const resolvedImages = await resolveImages(modules.map((module) => module.imageFileId));

  return modules.map((module) => ({
    ...module,
    imageSrc: resolvedImages[module.imageFileId] ?? module.imageFileId
  }));
}

export function getCatalogCategories(mode?: DeliveryMode): CatalogCategoryWithCounts[] {
  if (mode) {
    return cloneCategories(categoryCache.get(mode) ?? []);
  }

  return cloneCategories(cachedCatalogCategories);
}

export function getCategoryById(categoryId: string, mode?: DeliveryMode) {
  const categories = mode ? categoryCache.get(mode) ?? [] : cachedCatalogCategories;
  return categories.find((category) => category.id === categoryId) ?? null;
}

export function getDeliveryModes(): Array<{ id: DeliveryMode; label: string }> {
  return [
    { id: 'pickup', label: '自取' },
    { id: 'delivery', label: '配送' },
    { id: 'express', label: '快递' }
  ];
}

export function buildCatalogSections(mode: DeliveryMode): CatalogSection[] {
  const sectionStates = getCatalogSectionStates(mode);

  if (sectionStates.length) {
    return sectionStates.map((section) => ({
      category: section.category,
      availableProducts: section.availableProducts.map((product) => summaryToCatalogProduct(product, mode)),
      soldOutProducts: section.soldOutProducts.map((product) => summaryToCatalogProduct(product, mode))
    }));
  }

  return cachedCatalogCategories
    .map((category) => {
      const products = cachedCatalogProducts.filter(
        (product) => product.categoryId === category.id && product.deliveryModes.includes(mode)
      );

      return {
        category,
        availableProducts: products.filter((product) => !product.soldOut),
        soldOutProducts: products.filter((product) => product.soldOut)
      };
    })
    .filter((section) => section.availableProducts.length > 0 || section.soldOutProducts.length > 0);
}

export function searchProducts(keyword: string): CatalogProduct[] {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) {
    return [];
  }

  return cachedCatalogProducts.filter((product) => {
    const haystack = `${product.name} ${product.summary} ${product.description}`.toLowerCase();
    return haystack.includes(normalizedKeyword);
  });
}

export function getProductById(productId: string): CatalogProduct | null {
  const detailProduct = productDetailCache.get(productId);
  if (detailProduct) {
    return cloneProducts([detailProduct])[0] ?? null;
  }

  const cachedProduct = cachedCatalogProducts.find((product) => product.id === productId);
  if (cachedProduct) {
    return cloneProducts([cachedProduct])[0] ?? null;
  }

  if (shouldUseLocalCatalogFixtures()) {
    const fixtureProduct = catalogProducts.find((product) => product.id === productId);
    if (fixtureProduct) {
      return cloneProducts([fixtureProduct])[0] ?? null;
    }
  }

  const summaryProduct = findLoadedProductSummary(productId);
  if (summaryProduct) {
    return summaryToCatalogProduct(summaryProduct.product, summaryProduct.deliveryMode);
  }

  return null;
}

export function resolveProductSpec(product: CatalogProduct, specId: string): ProductSpecOption | null {
  if (!product.specs.length) {
    return null;
  }

  return product.specs.find((item) => item.id === specId) ?? product.specs[0] ?? null;
}

export function getProductDisplayPrice(product: CatalogProduct, specId = ''): number {
  return resolveProductSpec(product, specId)?.price ?? product.price;
}

export function getProductSelectedSpecLabel(product: CatalogProduct, specId: string): string {
  return resolveProductSpec(product, specId)?.label ?? '';
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function normalizeImageUrlForDisplay(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
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

function imageUrl(value: string | undefined) {
  return value ? normalizeImageUrlForDisplay(value) : value;
}

function appendOssProcess(url: string, process: string) {
  const [base, query = ''] = url.split('?');
  const params = query
    .split('&')
    .filter(Boolean)
    .filter((param) => !param.startsWith('x-oss-process='));
  const queryPrefix = params.length ? `${params.join('&')}&` : '';
  return `${base}?${queryPrefix}x-oss-process=${process}`;
}

function getOssDisplayProcess(asset: OssAssetReference, variantName: OssAssetVariantName) {
  return OSS_ROLE_DISPLAY_RULES[asset.role]?.[variantName] ?? OSS_DISPLAY_RULES[variantName];
}

function asNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function isDeliveryMode(value: unknown): value is DeliveryMode {
  return value === 'pickup' || value === 'delivery' || value === 'express';
}

function getArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeCategory(category: unknown): CatalogCategory | null {
  if (!isObject(category)) {
    return null;
  }

  const id = asString(category.id, asString(category._id));
  const name = asString(category.name);

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    shortName: asString(category.shortName, name),
    iconText: asString(category.iconText, asString(category.iconToken, name.slice(0, 1))),
    sectionTitle: asString(category.sectionTitle, name)
  };
}

function toCategoryWithCounts(category: CatalogCategory): CatalogCategoryWithCounts {
  return {
    ...category,
    availableCount: 'availableCount' in category ? asNumber((category as CatalogCategoryWithCounts).availableCount) : 0,
    soldOutCount: 'soldOutCount' in category ? asNumber((category as CatalogCategoryWithCounts).soldOutCount) : 0,
    previewCount: 'previewCount' in category ? asNumber((category as CatalogCategoryWithCounts).previewCount) : undefined,
    firstProductUpdatedAt:
      'firstProductUpdatedAt' in category ? (category as CatalogCategoryWithCounts).firstProductUpdatedAt : undefined
  };
}

function normalizeCategoryWithCounts(category: unknown): CatalogCategoryWithCounts | null {
  const normalized = normalizeCategory(category);
  if (!normalized) {
    return null;
  }

  const source = isObject(category) ? category : {};

  return {
    ...normalized,
    availableCount: asNumber(source.availableCount),
    soldOutCount: asNumber(source.soldOutCount),
    previewCount: source.previewCount === undefined ? undefined : asNumber(source.previewCount),
    firstProductUpdatedAt:
      typeof source.firstProductUpdatedAt === 'string' || source.firstProductUpdatedAt === null
        ? source.firstProductUpdatedAt
        : undefined
  };
}

function isAssetReference(value: unknown): value is OssAssetReference {
  return (
    isObject(value) &&
    value.provider === 'oss' &&
    typeof value.url === 'string' &&
    Array.isArray(value.variants)
  );
}

function getVariantUrl(asset: OssAssetReference | undefined, variantName: OssAssetVariantName) {
  if (!asset) {
    return undefined;
  }

  const rawUrl = imageUrl(asset.variants.find((variant) => variant.name === variantName)?.url ?? asset.url);
  const process = getOssDisplayProcess(asset, variantName);
  if (!rawUrl || !process || !/^https?:\/\//.test(rawUrl)) {
    return rawUrl;
  }

  return appendOssProcess(rawUrl, process);
}

function normalizeAssetArray(value: unknown): OssAssetReference[] | undefined {
  const assets = getArray(value).filter(isAssetReference);
  return assets.length ? assets : undefined;
}

function normalizeDeliveryModes(product: Record<string, unknown>) {
  const source = getArray(product.deliveryModes).length ? product.deliveryModes : product.fulfillmentModes;
  const modes = getArray(source).filter(isDeliveryMode);
  return modes.length ? modes : (['pickup', 'delivery', 'express'] satisfies DeliveryMode[]);
}

function normalizeProductSpecs(product: Record<string, unknown>, basePrice: number): ProductSpecOption[] {
  return getArray(product.specs)
    .filter(isObject)
    .map((spec) => {
      const price = asNumber(spec.price, basePrice + asNumber(spec.surcharge));
      return {
        id: asString(spec.id),
        label: asString(spec.label),
        price
      };
    })
    .filter((spec) => spec.id && spec.label);
}

function normalizeProduct(product: unknown): CatalogProduct | null {
  if (!isObject(product)) {
    return null;
  }

  const id = asString(product.id, asString(product._id));
  const name = asString(product.name);
  const categoryId = asString(product.categoryId);

  if (!id || !name || !categoryId) {
    return null;
  }

  const imageAsset = isAssetReference(product.imageAsset) ? product.imageAsset : undefined;
  const introductionImageAssets = normalizeAssetArray(product.introductionImageAssets);
  const detailImageAssets = normalizeAssetArray(product.detailImageAssets);
  const price = asNumber(product.price, asNumber(product.basePrice));
  const specs = normalizeProductSpecs(product, price);
  const thumbnail = imageUrl(
    getVariantUrl(imageAsset, 'thumbnail') ??
      asString(product.thumbnail, asString(product.imagePreviewUrl, asString(product.imageFileId)))
  ) ?? '';

  const gallery = introductionImageAssets?.length
    ? introductionImageAssets.map((asset) => imageUrl(getVariantUrl(asset, 'display') ?? asset.url) ?? '')
    : getArray(product.gallery)
        .filter((item): item is string => typeof item === 'string')
        .map(normalizeImageUrlForDisplay);
  const detailImages = detailImageAssets?.length
    ? detailImageAssets.map((asset) => imageUrl(getVariantUrl(asset, 'detail') ?? asset.url) ?? '')
    : getArray(product.detailImages).filter((item): item is string => typeof item === 'string').length
      ? getArray(product.detailImages)
          .filter((item): item is string => typeof item === 'string')
          .map(normalizeImageUrlForDisplay)
      : DEFAULT_PRODUCT_DETAIL_IMAGES;

  return {
    id,
    name,
    summary: asString(product.summary, asString(product.description)),
    description: asString(product.detailContent, asString(product.description, asString(product.summary))),
    price,
    stock: asNumber(product.stock),
    soldOut:
      typeof product.soldOut === 'boolean'
        ? product.soldOut
        : Boolean(product.trackInventory) && asNumber(product.stock) <= 0,
    cartActionLabel:
      product.cartActionLabel === '直接加购' || product.cartActionLabel === '选规格'
        ? product.cartActionLabel
        : specs.length
          ? '选规格'
          : '直接加购',
    memberLevelLabel: asString(product.memberLevelLabel, product.memberLevelId ? '会员可购' : '普通会员可购'),
    categoryId,
    deliveryModes: normalizeDeliveryModes(product),
    thumbnail,
    quickBuyImage: imageUrl(getVariantUrl(imageAsset, 'display') ?? gallery[0] ?? thumbnail) ?? '',
    imageAsset,
    gallery,
    introductionImageAssets,
    detailImages,
    detailImageAssets,
    specs
  };
}

function normalizeProductSummary(product: unknown): CatalogProductSummary | null {
  if (!isObject(product)) {
    return null;
  }

  const id = asString(product.id, asString(product._id));
  const name = asString(product.name);
  const categoryId = asString(product.categoryId);

  if (!id || !name || !categoryId) {
    return null;
  }

  const price = asNumber(product.price, asNumber(product.minPrice, asNumber(product.basePrice)));
  const specs = normalizeProductSpecs(product, price);
  const imageAsset = isAssetReference(product.imageAsset) ? product.imageAsset : undefined;
  const thumbnail = imageUrl(
    getVariantUrl(imageAsset, 'thumbnail') ??
      asString(product.thumbnail, asString(product.imagePreviewUrl, asString(product.imageFileId)))
  ) ?? '';

  return {
    id,
    name,
    summary: asString(product.summary, asString(product.description)),
    price,
    stock: asNumber(product.stock),
    soldOut:
      typeof product.soldOut === 'boolean'
        ? product.soldOut
        : Boolean(product.trackInventory) && asNumber(product.stock) <= 0,
    cartActionLabel:
      product.cartActionLabel === '直接加购' || product.cartActionLabel === '选规格'
        ? product.cartActionLabel
        : specs.length
          ? '选规格'
          : '直接加购',
    memberLevelLabel: asString(product.memberLevelLabel, product.memberLevelId ? '会员可购' : '普通会员可购'),
    categoryId,
    deliveryModes: normalizeDeliveryModes(product),
    thumbnail,
    specs,
    updatedAt: asString(product.updatedAt)
  };
}

function cloneCategories<T extends CatalogCategory>(categories: T[]): T[] {
  return categories.map((category) => ({ ...category }));
}

function cloneProducts(products: CatalogProduct[]): CatalogProduct[] {
  return products.map((product) => {
    const resolved = resolveCatalogProductAssetUrls(product);
    return {
      ...resolved,
      deliveryModes: [...resolved.deliveryModes],
      gallery: [...resolved.gallery],
      detailImages: [...resolved.detailImages],
      specs: resolved.specs.map((spec) => ({ ...spec }))
    };
  });
}

function cloneProductSummaries(products: CatalogProductSummary[]): CatalogProductSummary[] {
  return products.map((product) => ({
    ...product,
    deliveryModes: [...product.deliveryModes],
    specs: product.specs.map((spec) => ({ ...spec }))
  }));
}

function clonePageInfo(pageInfo: CatalogPageInfo): CatalogPageInfo {
  return { ...pageInfo };
}

function defaultPageInfo(): CatalogPageInfo {
  return { hasMore: false, nextCursor: null };
}

function normalizePageInfo(pageInfo: Partial<CatalogPageInfo> | undefined): CatalogPageInfo {
  return {
    hasMore: Boolean(pageInfo?.hasMore),
    nextCursor: typeof pageInfo?.nextCursor === 'string' && pageInfo.nextCursor ? pageInfo.nextCursor : null
  };
}

function sectionKey(mode: DeliveryMode, categoryId: string) {
  return `${mode}:${categoryId}`;
}

function parseSectionKey(key: string): { mode: DeliveryMode; categoryId: string } | null {
  const [mode, ...categoryIdParts] = key.split(':');
  if (!isDeliveryMode(mode)) {
    return null;
  }

  return { mode, categoryId: categoryIdParts.join(':') };
}

function createFallbackCategory(categoryId: string): CatalogCategoryWithCounts {
  return {
    id: categoryId,
    name: categoryId,
    shortName: categoryId,
    iconText: categoryId.slice(0, 1),
    sectionTitle: categoryId,
    availableCount: 0,
    soldOutCount: 0
  };
}

function createEmptySectionState(category: CatalogCategoryWithCounts): CatalogSectionState {
  return {
    category: { ...category },
    availableProducts: [],
    soldOutProducts: [],
    availablePageInfo: defaultPageInfo(),
    soldOutPageInfo: defaultPageInfo(),
    isAvailableLoading: false,
    isSoldOutLoading: false
  };
}

function cloneSectionState(section: CatalogSectionState): CatalogSectionState {
  return {
    category: { ...section.category },
    availableProducts: cloneProductSummaries(section.availableProducts),
    soldOutProducts: cloneProductSummaries(section.soldOutProducts),
    availablePageInfo: clonePageInfo(section.availablePageInfo),
    soldOutPageInfo: clonePageInfo(section.soldOutPageInfo),
    isAvailableLoading: section.isAvailableLoading,
    isSoldOutLoading: section.isSoldOutLoading
  };
}

function findCachedCategory(mode: DeliveryMode, categoryId: string): CatalogCategoryWithCounts | null {
  return (
    categoryCache.get(mode)?.find((category) => category.id === categoryId) ??
    cachedCatalogCategories.find((category) => category.id === categoryId) ??
    null
  );
}

function ensureSectionState(mode: DeliveryMode, categoryId: string): CatalogSectionState {
  const key = sectionKey(mode, categoryId);
  const cached = sectionCache.get(key);
  if (cached) {
    return cached;
  }

  const category = findCachedCategory(mode, categoryId) ?? createFallbackCategory(categoryId);
  const section = createEmptySectionState(category);
  sectionCache.set(key, section);
  return section;
}

function summaryToCatalogProduct(product: CatalogProductSummary, deliveryMode: DeliveryMode): CatalogProduct {
  return {
    id: product.id,
    name: product.name,
    summary: product.summary,
    description: product.summary,
    price: product.price,
    stock: product.stock,
    soldOut: product.soldOut,
    cartActionLabel: product.cartActionLabel,
    memberLevelLabel: product.memberLevelLabel,
    categoryId: product.categoryId,
    deliveryModes: product.deliveryModes.length ? [...product.deliveryModes] : [deliveryMode],
    thumbnail: product.thumbnail,
    quickBuyImage: product.thumbnail,
    gallery: product.thumbnail ? [product.thumbnail] : [],
    detailImages: [],
    specs: product.specs.map((spec) => ({ ...spec }))
  };
}

function findLoadedProductSummary(productId: string): { product: CatalogProductSummary; deliveryMode: DeliveryMode } | null {
  for (const [key, section] of sectionCache) {
    const parsedKey = parseSectionKey(key);
    if (!parsedKey) {
      continue;
    }

    const product = [...section.availableProducts, ...section.soldOutProducts].find((item) => item.id === productId);
    if (product) {
      return { product, deliveryMode: parsedKey.mode };
    }
  }

  return null;
}

function mergeProductSummaries(
  existingProducts: CatalogProductSummary[],
  incomingProducts: CatalogProductSummary[]
): CatalogProductSummary[] {
  const productsById = new Map<string, CatalogProductSummary>();
  const orderedIds: string[] = [];

  existingProducts.forEach((product) => {
    productsById.set(product.id, product);
    orderedIds.push(product.id);
  });
  incomingProducts.forEach((product) => {
    if (!productsById.has(product.id)) {
      orderedIds.push(product.id);
    }
    productsById.set(product.id, product);
  });

  return orderedIds
    .map((productId) => productsById.get(productId))
    .filter((product): product is CatalogProductSummary => Boolean(product));
}

function pruneSectionCacheForMode(mode: DeliveryMode, categoryIds: Set<string>) {
  Array.from(sectionCache.keys()).forEach((key) => {
    const parsedKey = parseSectionKey(key);
    if (parsedKey?.mode === mode && !categoryIds.has(parsedKey.categoryId)) {
      sectionCache.delete(key);
    }
  });
}

export function resolveCatalogProductAssetUrls(product: CatalogProduct): CatalogProduct {
  const thumbnail = imageUrl(getVariantUrl(product.imageAsset, 'thumbnail') ?? product.imageAsset?.url ?? product.thumbnail) ?? '';
  const gallery = product.introductionImageAssets?.length
    ? product.introductionImageAssets.map((asset) => imageUrl(getVariantUrl(asset, 'display') ?? asset.url) ?? '')
    : product.gallery.map(normalizeImageUrlForDisplay);
  const detailImages = product.detailImageAssets?.length
    ? product.detailImageAssets.map((asset) => imageUrl(getVariantUrl(asset, 'detail') ?? asset.url) ?? '')
    : product.detailImages.length
      ? product.detailImages.map(normalizeImageUrlForDisplay)
      : DEFAULT_PRODUCT_DETAIL_IMAGES;
  const quickBuyImage = imageUrl(getVariantUrl(product.imageAsset, 'display') ?? gallery[0] ?? product.quickBuyImage ?? thumbnail) ?? '';

  return {
    ...product,
    thumbnail,
    quickBuyImage,
    gallery,
    detailImages
  };
}

export function resetCatalogCache(options: { useLocalFixtures?: boolean } = {}) {
  const useLocalFixtures = options.useLocalFixtures ?? shouldUseLocalCatalogFixtures();
  cachedCatalogCategories = useLocalFixtures ? cloneCategories(catalogCategories.map(toCategoryWithCounts)) : [];
  cachedCatalogProducts = useLocalFixtures ? cloneProducts(catalogProducts) : [];
  categoryCache.clear();
  sectionCache.clear();
  productDetailCache.clear();
}

export async function hydrateCatalogCategories(
  mode: DeliveryMode,
  request: CatalogApiRequester = customerApiRequest
) {
  const response = await request<CatalogCategoriesResponse>(
    `/api/v1/customer/catalog/categories?deliveryMode=${mode}`,
    {
      method: 'GET',
      auth: 'none'
    }
  );
  const categories = Array.isArray(response.categories)
    ? (response.categories.map(normalizeCategoryWithCounts).filter(Boolean) as CatalogCategoryWithCounts[])
    : [];

  categoryCache.set(mode, cloneCategories(categories));
  pruneSectionCacheForMode(mode, new Set(categories.map((category) => category.id)));
  categories.forEach((category) => {
    const key = sectionKey(mode, category.id);
    const existing = sectionCache.get(key);
    if (existing) {
      sectionCache.set(key, { ...existing, category: { ...category } });
      return;
    }
    sectionCache.set(key, createEmptySectionState(category));
  });

  return getCatalogCategories(mode);
}

export async function loadCategoryProducts(
  input: {
    deliveryMode: DeliveryMode;
    categoryId: string;
    availability: CatalogProductAvailability;
    cursor?: string;
  },
  request: CatalogApiRequester = customerApiRequest
) {
  const params = [
    `deliveryMode=${input.deliveryMode}`,
    `availability=${input.availability}`,
    `limit=${CATEGORY_PRODUCTS_PAGE_SIZE}`
  ];
  if (input.cursor) {
    params.push(`cursor=${encodeURIComponent(input.cursor)}`);
  }

  const section = ensureSectionState(input.deliveryMode, input.categoryId);
  if (input.availability === 'soldOut') {
    section.isSoldOutLoading = true;
  } else {
    section.isAvailableLoading = true;
  }

  try {
    const response = await request<CustomerCategoryProductsResponse>(
      `/api/v1/customer/catalog/categories/${input.categoryId}/products?${params.join('&')}`,
      {
        method: 'GET',
        auth: 'none'
      }
    );
    const products = Array.isArray(response.items)
      ? (response.items.map(normalizeProductSummary).filter(Boolean) as CatalogProductSummary[])
      : [];

    if (input.availability === 'soldOut') {
      section.soldOutProducts = input.cursor ? mergeProductSummaries(section.soldOutProducts, products) : products;
      section.soldOutPageInfo = normalizePageInfo(response.pageInfo);
      section.isSoldOutLoading = false;
    } else {
      section.availableProducts = input.cursor ? mergeProductSummaries(section.availableProducts, products) : products;
      section.availablePageInfo = normalizePageInfo(response.pageInfo);
      section.isAvailableLoading = false;
    }
  } catch (error) {
    section.isAvailableLoading = false;
    section.isSoldOutLoading = false;
    throw error;
  }

  return getCatalogSectionState(input.deliveryMode, input.categoryId);
}

export function getCatalogSectionState(mode: DeliveryMode, categoryId: string): CatalogSectionState {
  return cloneSectionState(ensureSectionState(mode, categoryId));
}

export function getCatalogSectionStates(mode: DeliveryMode): CatalogSectionState[] {
  const categories = categoryCache.get(mode);
  if (categories?.length) {
    return categories.map((category) => cloneSectionState(ensureSectionState(mode, category.id)));
  }

  return Array.from(sectionCache.entries())
    .filter(([key]) => key.startsWith(`${mode}:`))
    .map(([, section]) => cloneSectionState(section));
}

export async function searchCatalogProducts(
  input: { keyword: string; deliveryMode?: DeliveryMode; cursor?: string },
  request: CatalogApiRequester = customerApiRequest
) {
  const keyword = input.keyword.trim();
  if (!keyword) {
    return {
      items: [] as CatalogProductSummary[],
      pageInfo: defaultPageInfo(),
      snapshotKey: ''
    };
  }

  const params = [`keyword=${encodeURIComponent(keyword)}`];
  if (input.deliveryMode) {
    params.push(`deliveryMode=${input.deliveryMode}`);
  }
  params.push('limit=20');
  if (input.cursor) {
    params.push(`cursor=${encodeURIComponent(input.cursor)}`);
  }

  const response = await request<CustomerCatalogSearchResponse>(
    `/api/v1/customer/catalog/products/search?${params.join('&')}`,
    {
      method: 'GET',
      auth: 'none'
    }
  );

  return {
    items: Array.isArray(response.items)
      ? (response.items.map(normalizeProductSummary).filter(Boolean) as CatalogProductSummary[])
      : [],
    pageInfo: normalizePageInfo(response.pageInfo),
    snapshotKey: asString(response.snapshotKey)
  };
}

export async function getProductDetail(
  productId: string,
  request: CatalogApiRequester = customerApiRequest
): Promise<CatalogProduct | null> {
  const cached = productDetailCache.get(productId);
  if (cached) {
    return cloneProducts([cached])[0] ?? null;
  }

  const response = await request<CustomerProductDetailResponse>(`/api/v1/customer/catalog/products/${productId}`, {
    method: 'GET',
    auth: 'none'
  });
  const product = normalizeProduct(response.product);
  if (!product) {
    return null;
  }

  productDetailCache.set(product.id, product);
  return cloneProducts([product])[0] ?? null;
}

export async function hydrateCatalog(request: CatalogApiRequester = customerApiRequest) {
  const [categoriesResponse, productsResponse] = await Promise.all([
    request<CatalogCategoriesResponse>('/api/v1/customer/catalog/categories', {
      method: 'GET',
      auth: 'none'
    }),
    request<CatalogProductsResponse>('/api/v1/customer/catalog/products', {
      method: 'GET',
      auth: 'none'
    })
  ]);

  if (Array.isArray(categoriesResponse.categories)) {
    cachedCatalogCategories = cloneCategories(
      categoriesResponse.categories.map(normalizeCategoryWithCounts).filter(Boolean) as CatalogCategoryWithCounts[]
    );
    categoryCache.clear();
    sectionCache.clear();
  }
  if (Array.isArray(productsResponse.products)) {
    cachedCatalogProducts = cloneProducts(productsResponse.products.map(normalizeProduct).filter(Boolean) as CatalogProduct[]);
    productDetailCache.clear();
  }

  return {
    categories: getCatalogCategories(),
    products: cloneProducts(cachedCatalogProducts)
  };
}
