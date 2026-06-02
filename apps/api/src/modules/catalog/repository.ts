import type { Prisma } from '@prisma/client';

import type { DbClient } from '../../db/types';
import { PRODUCT_STATUS, toSharedEnum } from '../../db/enums';
import { getPrismaClient } from '../../db/prisma';

export interface CatalogOssAssetReference {
  provider: 'oss';
  role: string;
  bucket: string;
  region: string;
  objectKey: string;
  url: string;
  width: number;
  height: number;
  sizeBytes: number;
  contentType: string;
  uploadedAt: string;
  variants: unknown[];
}

export interface CatalogCategoryRecord {
  id: string;
  name: string;
  iconToken: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type CatalogDeliveryModeFilter = 'pickup' | 'delivery' | 'express';
export type CatalogAvailabilityFilter = 'available' | 'soldOut';

export interface CatalogPageInfo {
  hasMore: boolean;
  nextCursor: string | null;
}

export interface CatalogProductPage<T> extends CatalogPageInfo {
  items: T[];
}

export interface CustomerCategorySummaryRecord extends CatalogCategoryRecord {
  availableCount: number;
  soldOutCount: number;
  previewCount: number;
  firstProductUpdatedAt: string | null;
}

export interface CatalogProductRecord {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  imageFileId: string;
  imageAsset?: CatalogOssAssetReference;
  imagePreviewUrl?: string;
  introductionImageAssets?: CatalogOssAssetReference[];
  detailImageAssets?: CatalogOssAssetReference[];
  memberLevelId: string | null;
  status: 'draft' | 'published' | 'archived';
  stock: number;
  trackInventory: boolean;
  fulfillmentModes: unknown[];
  basePrice: number;
  specs: unknown[];
  formulas: unknown[];
  priceOverrides: unknown[];
  purchaseLimit: unknown;
  detailContent: string;
  createdAt: string;
  updatedAt: string;
}

export type CatalogProductSummaryRecord = Pick<
  CatalogProductRecord,
  | 'id'
  | 'name'
  | 'description'
  | 'categoryId'
  | 'imageFileId'
  | 'imageAsset'
  | 'imagePreviewUrl'
  | 'memberLevelId'
  | 'stock'
  | 'trackInventory'
  | 'fulfillmentModes'
  | 'basePrice'
  | 'specs'
  | 'formulas'
  | 'priceOverrides'
  | 'updatedAt'
>;

interface CategoryRow {
  id: string;
  name: string;
  iconToken: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ProductRow {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  imageFileId: string;
  imageAsset: unknown | null;
  imagePreviewUrl: string | null;
  introductionImageAssets: unknown | null;
  detailImageAssets: unknown | null;
  memberLevelId: string | null;
  status: string;
  stock: number;
  trackInventory: boolean;
  fulfillmentModes: unknown;
  basePrice: { toNumber(): number };
  specs: unknown;
  formulas: unknown;
  priceOverrides: unknown;
  purchaseLimit: unknown;
  detailContent: string;
  createdAt: Date;
  updatedAt: Date;
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toAssetArray(value: unknown): CatalogOssAssetReference[] | undefined {
  return Array.isArray(value) ? (value as CatalogOssAssetReference[]) : undefined;
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function asOptionalJson(value: unknown): Prisma.InputJsonValue | undefined {
  return value === undefined ? undefined : asJson(value);
}

export function mapProduct(row: ProductRow): CatalogProductRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    categoryId: row.categoryId,
    imageFileId: row.imageFileId,
    imageAsset: row.imageAsset ? (row.imageAsset as CatalogOssAssetReference) : undefined,
    imagePreviewUrl: row.imagePreviewUrl ?? undefined,
    introductionImageAssets: toAssetArray(row.introductionImageAssets),
    detailImageAssets: toAssetArray(row.detailImageAssets),
    memberLevelId: row.memberLevelId,
    status: toSharedEnum(row.status, PRODUCT_STATUS),
    stock: row.stock,
    trackInventory: row.trackInventory,
    fulfillmentModes: toArray(row.fulfillmentModes),
    basePrice: row.basePrice.toNumber(),
    specs: toArray(row.specs),
    formulas: toArray(row.formulas),
    priceOverrides: toArray(row.priceOverrides),
    purchaseLimit: row.purchaseLimit,
    detailContent: row.detailContent,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export function mapCategory(row: CategoryRow): CatalogCategoryRecord {
  return {
    id: row.id,
    name: row.name,
    iconToken: row.iconToken,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export function createCatalogRepository(client: DbClient = getPrismaClient()) {
  return {
    async listCategories(): Promise<CatalogCategoryRecord[]> {
      const categories = await client.category.findMany({
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }]
      });
      return categories.map(mapCategory);
    },

    async listPublishedProducts(): Promise<CatalogProductRecord[]> {
      const products = await client.product.findMany({
        where: { status: PRODUCT_STATUS.published },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }]
      });
      return products.map(mapProduct);
    },

    async listProducts(filters: { categoryId?: string; status?: 'draft' | 'published' | 'archived' } = {}): Promise<CatalogProductRecord[]> {
      const products = await client.product.findMany({
        where: {
          categoryId: filters.categoryId,
          status: filters.status ? PRODUCT_STATUS[filters.status] : undefined
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }]
      });
      return products.map(mapProduct);
    },

    async countProductsByCategory(categoryId: string): Promise<number> {
      return client.product.count({
        where: {
          categoryId
        }
      });
    },

    async getProductById(productId: string): Promise<CatalogProductRecord | null> {
      const product = await client.product.findUnique({
        where: { id: productId }
      });
      return product ? mapProduct(product) : null;
    },

    async decrementStock(productId: string, quantity: number): Promise<void> {
      await client.product.update({
        where: { id: productId },
        data: {
          stock: {
            decrement: quantity
          }
        }
      });
    },

    async upsertCategory(input: { id: string; name: string; iconToken: string; sortOrder?: number }): Promise<CatalogCategoryRecord> {
      const category = await client.category.upsert({
        where: { id: input.id },
        update: {
          name: input.name,
          iconToken: input.iconToken,
          sortOrder: input.sortOrder ?? 0
        },
        create: {
          id: input.id,
          name: input.name,
          iconToken: input.iconToken,
          sortOrder: input.sortOrder ?? 0
        }
      });
      return mapCategory(category);
    },

    async deleteCategory(categoryId: string): Promise<void> {
      await client.category.delete({
        where: {
          id: categoryId
        }
      });
    },

    async deleteProduct(productId: string): Promise<void> {
      await client.product.delete({
        where: {
          id: productId
        }
      });
    },

    async upsertProduct(input: CatalogProductRecord): Promise<CatalogProductRecord> {
      const product = await client.product.upsert({
        where: { id: input.id },
        update: {
          name: input.name,
          description: input.description,
          categoryId: input.categoryId,
          imageFileId: input.imageFileId,
          imageAsset: asOptionalJson(input.imageAsset),
          imagePreviewUrl: input.imagePreviewUrl,
          introductionImageAssets: asOptionalJson(input.introductionImageAssets),
          detailImageAssets: asOptionalJson(input.detailImageAssets),
          memberLevelId: input.memberLevelId,
          status: PRODUCT_STATUS[input.status],
          stock: input.stock,
          trackInventory: input.trackInventory,
          fulfillmentModes: asJson(input.fulfillmentModes),
          basePrice: input.basePrice,
          specs: asJson(input.specs),
          formulas: asJson(input.formulas),
          priceOverrides: asJson(input.priceOverrides),
          purchaseLimit: asJson(input.purchaseLimit),
          detailContent: input.detailContent
        },
        create: {
          id: input.id,
          name: input.name,
          description: input.description,
          categoryId: input.categoryId,
          imageFileId: input.imageFileId,
          imageAsset: asOptionalJson(input.imageAsset),
          imagePreviewUrl: input.imagePreviewUrl,
          introductionImageAssets: asOptionalJson(input.introductionImageAssets),
          detailImageAssets: asOptionalJson(input.detailImageAssets),
          memberLevelId: input.memberLevelId,
          status: PRODUCT_STATUS[input.status],
          stock: input.stock,
          trackInventory: input.trackInventory,
          fulfillmentModes: asJson(input.fulfillmentModes),
          basePrice: input.basePrice,
          specs: asJson(input.specs),
          formulas: asJson(input.formulas),
          priceOverrides: asJson(input.priceOverrides),
          purchaseLimit: asJson(input.purchaseLimit),
          detailContent: input.detailContent
        }
      });
      return mapProduct(product);
    }
  };
}
