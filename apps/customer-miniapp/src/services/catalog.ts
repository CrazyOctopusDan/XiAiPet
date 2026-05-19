import { catalogCategories, catalogProducts, homeModules } from '../data/catalog';
import type {
  CatalogCategory,
  CatalogProduct,
  CatalogSection,
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
}

interface CatalogProductsResponse {
  ok?: boolean;
  products?: unknown[];
}

let cachedCatalogCategories = cloneCategories(catalogCategories);
let cachedCatalogProducts = cloneProducts(catalogProducts);

const DEFAULT_PRODUCT_DETAIL_IMAGES = ['/assets/catalog/detail-long-reference.png'];

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

export function getCatalogCategories() {
  return cloneCategories(cachedCatalogCategories);
}

export function getCategoryById(categoryId: string) {
  return cachedCatalogCategories.find((category) => category.id === categoryId) ?? null;
}

export function getDeliveryModes(): Array<{ id: DeliveryMode; label: string }> {
  return [
    { id: 'pickup', label: '自取' },
    { id: 'delivery', label: '配送' },
    { id: 'express', label: '快递' }
  ];
}

export function buildCatalogSections(mode: DeliveryMode): CatalogSection[] {
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
  return cachedCatalogProducts.find((product) => product.id === productId) ?? null;
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

  return asset.variants.find((variant) => variant.name === variantName)?.url ?? asset.url;
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
  const thumbnail =
    getVariantUrl(imageAsset, 'thumbnail') ??
    asString(product.thumbnail, asString(product.imagePreviewUrl, asString(product.imageFileId)));

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
    imageAsset,
    gallery: introductionImageAssets?.length
      ? introductionImageAssets.map((asset) => getVariantUrl(asset, 'display') ?? asset.url)
      : getArray(product.gallery).filter((item): item is string => typeof item === 'string'),
    introductionImageAssets,
    detailImages: detailImageAssets?.length
      ? detailImageAssets.map((asset) => getVariantUrl(asset, 'detail') ?? asset.url)
      : getArray(product.detailImages).filter((item): item is string => typeof item === 'string').length
        ? getArray(product.detailImages).filter((item): item is string => typeof item === 'string')
        : DEFAULT_PRODUCT_DETAIL_IMAGES,
    detailImageAssets,
    specs
  };
}

function cloneCategories(categories: CatalogCategory[]): CatalogCategory[] {
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

export function resolveCatalogProductAssetUrls(product: CatalogProduct): CatalogProduct {
  const thumbnail = getVariantUrl(product.imageAsset, 'thumbnail') ?? product.imageAsset?.url ?? product.thumbnail;
  const gallery = product.introductionImageAssets?.length
    ? product.introductionImageAssets.map((asset) => getVariantUrl(asset, 'display') ?? asset.url)
    : product.gallery;
  const detailImages = product.detailImageAssets?.length
    ? product.detailImageAssets.map((asset) => getVariantUrl(asset, 'detail') ?? asset.url)
    : product.detailImages.length
      ? product.detailImages
      : DEFAULT_PRODUCT_DETAIL_IMAGES;

  return {
    ...product,
    thumbnail,
    gallery,
    detailImages
  };
}

export function resetCatalogCache() {
  cachedCatalogCategories = cloneCategories(catalogCategories);
  cachedCatalogProducts = cloneProducts(catalogProducts);
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
    cachedCatalogCategories = cloneCategories(categoriesResponse.categories.map(normalizeCategory).filter(Boolean) as CatalogCategory[]);
  }
  if (Array.isArray(productsResponse.products)) {
    cachedCatalogProducts = cloneProducts(productsResponse.products.map(normalizeProduct).filter(Boolean) as CatalogProduct[]);
  }

  return {
    categories: getCatalogCategories(),
    products: cloneProducts(cachedCatalogProducts)
  };
}
