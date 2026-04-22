declare const wx: any;

import { catalogCategories, catalogProducts, homeModules } from '../data/catalog';
import type {
  CatalogProduct,
  CatalogSection,
  DeliveryMode,
  HomeModule,
  ProductSpecOption
} from '../types/catalog';

export interface HomeModuleDisplay extends HomeModule {
  imageSrc: string;
}

type HomeModuleImageResolver = (fileIds: string[]) => Promise<Record<string, string>>;

export function getHomeModules(): HomeModule[] {
  return homeModules;
}

async function defaultResolveHomeModuleImages(fileIds: string[]): Promise<Record<string, string>> {
  if (!fileIds.length || !wx?.cloud?.getTempFileURL) {
    return {};
  }

  try {
    const response = (await wx.cloud.getTempFileURL({
      fileList: fileIds
    })) as {
      fileList?: Array<{
        fileID?: string;
        tempFileURL?: string;
      }>;
    };

    return Object.fromEntries(
      (response.fileList ?? [])
        .filter((item) => item.fileID && item.tempFileURL)
        .map((item) => [item.fileID as string, item.tempFileURL as string])
    );
  } catch {
    return {};
  }
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
  return catalogCategories;
}

export function getCategoryById(categoryId: string) {
  return catalogCategories.find((category) => category.id === categoryId) ?? null;
}

export function getDeliveryModes(): Array<{ id: DeliveryMode; label: string }> {
  return [
    { id: 'pickup', label: '自取' },
    { id: 'delivery', label: '配送' },
    { id: 'express', label: '快递' }
  ];
}

export function buildCatalogSections(mode: DeliveryMode): CatalogSection[] {
  return catalogCategories
    .map((category) => {
      const products = catalogProducts.filter(
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

  return catalogProducts.filter((product) => {
    const haystack = `${product.name} ${product.summary} ${product.description}`.toLowerCase();
    return haystack.includes(normalizedKeyword);
  });
}

export function getProductById(productId: string): CatalogProduct | null {
  return catalogProducts.find((product) => product.id === productId) ?? null;
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
