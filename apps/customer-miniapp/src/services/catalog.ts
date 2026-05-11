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
  categories?: CatalogCategory[];
}

interface CatalogProductsResponse {
  ok?: boolean;
  products?: CatalogProduct[];
}

let cachedCatalogCategories = cloneCategories(catalogCategories);
let cachedCatalogProducts = cloneProducts(catalogProducts);

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

function getAssetUrl(asset: OssAssetReference | undefined, variantName: OssAssetVariantName) {
  if (!asset) {
    return undefined;
  }

  return asset.variants.find((variant) => variant.name === variantName)?.url ?? asset.url;
}

export function resolveCatalogProductAssetUrls(product: CatalogProduct): CatalogProduct {
  const thumbnail = getAssetUrl(product.imageAsset, 'thumbnail') ?? product.imageAsset?.url ?? product.thumbnail;
  const gallery = product.introductionImageAssets?.length
    ? product.introductionImageAssets.map((asset) => getAssetUrl(asset, 'display') ?? asset.url)
    : product.gallery;
  const detailImages = product.detailImageAssets?.length
    ? product.detailImageAssets.map((asset) => getAssetUrl(asset, 'detail') ?? asset.url)
    : product.detailImages;

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
    cachedCatalogCategories = cloneCategories(categoriesResponse.categories);
  }
  if (Array.isArray(productsResponse.products)) {
    cachedCatalogProducts = cloneProducts(productsResponse.products);
  }

  return {
    categories: getCatalogCategories(),
    products: cloneProducts(cachedCatalogProducts)
  };
}
