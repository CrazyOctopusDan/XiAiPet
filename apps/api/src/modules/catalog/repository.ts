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

export type MerchantProductStatusFilter = 'draft' | 'published' | 'archived';
export type CatalogProductSort = 'latest';

export type MerchantProductSummaryRecord = CatalogProductSummaryRecord & Pick<CatalogProductRecord, 'status'>;

export interface MerchantProductSummaryCounts {
  totalProducts: number;
  publishedProducts: number;
  draftProducts: number;
  archivedProducts: number;
  stockWarnings: number;
}

export interface MerchantProductSummaryPage extends CatalogProductPage<MerchantProductSummaryRecord> {
  summary: MerchantProductSummaryCounts;
  snapshotKey: string;
}

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

interface ProductSummaryRow {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  imageFileId: string;
  imageAsset: unknown | null;
  imagePreviewUrl: string | null;
  memberLevelId: string | null;
  status: string;
  stock: number;
  trackInventory: boolean;
  fulfillmentModes: unknown;
  basePrice: { toNumber(): number };
  specs: unknown;
  formulas: unknown;
  priceOverrides: unknown;
  updatedAt: Date;
}

interface CatalogCursor {
  updatedAt: string;
  id: string;
}

const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 100;

const productSummarySelect = {
  id: true,
  name: true,
  description: true,
  categoryId: true,
  imageFileId: true,
  imageAsset: true,
  imagePreviewUrl: true,
  memberLevelId: true,
  status: true,
  stock: true,
  trackInventory: true,
  fulfillmentModes: true,
  basePrice: true,
  specs: true,
  formulas: true,
  priceOverrides: true,
  updatedAt: true
} satisfies Prisma.ProductSelect;

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

function mapProductSummary(row: ProductSummaryRow): MerchantProductSummaryRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    categoryId: row.categoryId,
    imageFileId: row.imageFileId,
    imageAsset: row.imageAsset ? (row.imageAsset as CatalogOssAssetReference) : undefined,
    imagePreviewUrl: row.imagePreviewUrl ?? undefined,
    memberLevelId: row.memberLevelId,
    status: toSharedEnum(row.status, PRODUCT_STATUS),
    stock: row.stock,
    trackInventory: row.trackInventory,
    fulfillmentModes: toArray(row.fulfillmentModes),
    basePrice: row.basePrice.toNumber(),
    specs: toArray(row.specs),
    formulas: toArray(row.formulas),
    priceOverrides: toArray(row.priceOverrides),
    updatedAt: row.updatedAt.toISOString()
  };
}

function clampPageLimit(limit: number | undefined) {
  if (!Number.isInteger(limit) || !limit || limit <= 0) {
    return DEFAULT_PAGE_LIMIT;
  }

  return Math.min(limit, MAX_PAGE_LIMIT);
}

function encodeCatalogCursor(item: Pick<CatalogProductSummaryRecord, 'updatedAt' | 'id'>): string {
  return Buffer.from(JSON.stringify({ updatedAt: item.updatedAt, id: item.id }), 'utf8').toString('base64url');
}

function decodeCatalogCursor(cursor: string | undefined): CatalogCursor | null {
  if (!cursor) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as Partial<CatalogCursor>;
    if (typeof decoded.updatedAt === 'string' && typeof decoded.id === 'string') {
      return { updatedAt: decoded.updatedAt, id: decoded.id };
    }
  } catch {
    return null;
  }

  return null;
}

function createCursorWhere(cursor: string | undefined): Prisma.ProductWhereInput | undefined {
  const decoded = decodeCatalogCursor(cursor);
  if (!decoded) {
    return undefined;
  }

  const updatedAt = new Date(decoded.updatedAt);
  if (Number.isNaN(updatedAt.getTime())) {
    return undefined;
  }

  return {
    OR: [
      { updatedAt: { lt: updatedAt } },
      {
        updatedAt,
        id: { gt: decoded.id }
      }
    ]
  };
}

function createKeywordWhere(keyword: string | undefined): Prisma.ProductWhereInput | undefined {
  const trimmed = keyword?.trim();
  if (!trimmed) {
    return undefined;
  }

  return {
    OR: [
      { name: { contains: trimmed } },
      { description: { contains: trimmed } }
    ]
  };
}

function matchesDeliveryMode(product: Pick<CatalogProductSummaryRecord, 'fulfillmentModes'>, deliveryMode: CatalogDeliveryModeFilter | undefined) {
  if (!deliveryMode) {
    return true;
  }

  const modes = product.fulfillmentModes.filter(
    (mode): mode is CatalogDeliveryModeFilter => mode === 'pickup' || mode === 'delivery' || mode === 'express'
  );
  return modes.length === 0 || modes.includes(deliveryMode);
}

function matchesAvailability(product: Pick<CatalogProductSummaryRecord, 'trackInventory' | 'stock'>, availability: CatalogAvailabilityFilter) {
  const soldOut = product.trackInventory && product.stock <= 0;
  return availability === 'soldOut' ? soldOut : !soldOut;
}

function createPage<T extends Pick<CatalogProductSummaryRecord, 'id' | 'updatedAt'>>(items: T[], limit: number): CatalogProductPage<T> {
  const pageItems = items.slice(0, limit);
  const hasMore = items.length > limit;
  const lastItem = pageItems.at(-1);

  return {
    items: pageItems,
    hasMore,
    nextCursor: hasMore && lastItem ? encodeCatalogCursor(lastItem) : null
  };
}

async function createBoundedFilteredSummaryPage(
  client: DbClient,
  input: {
    where: Prisma.ProductWhereInput;
    limit: number;
    cursor?: string;
    filter(product: MerchantProductSummaryRecord): boolean;
  }
): Promise<CatalogProductPage<CatalogProductSummaryRecord>> {
  const collected: MerchantProductSummaryRecord[] = [];
  const chunkSize = Math.min(MAX_PAGE_LIMIT, Math.max(input.limit + 1, input.limit * 3));
  let currentCursor = input.cursor;

  while (collected.length <= input.limit) {
    const products = await client.product.findMany({
      where: {
        ...input.where,
        AND: [
          ...(Array.isArray(input.where.AND) ? input.where.AND : []),
          createCursorWhere(currentCursor)
        ].filter(Boolean) as Prisma.ProductWhereInput[]
      },
      select: productSummarySelect,
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      take: chunkSize
    });

    if (products.length === 0) {
      break;
    }

    const summaries = products.map(mapProductSummary);
    collected.push(...summaries.filter(input.filter));

    if (products.length < chunkSize) {
      break;
    }

    currentCursor = encodeCatalogCursor(summaries[summaries.length - 1]);
  }

  return createPage(collected, input.limit);
}

function createSnapshotKey(parts: unknown[]) {
  return Buffer.from(JSON.stringify(parts), 'utf8').toString('base64url');
}

function maxUpdatedAt(products: Pick<CatalogProductSummaryRecord, 'updatedAt'>[]) {
  return products.reduce<string | null>((latest, product) => {
    if (!latest || product.updatedAt > latest) {
      return product.updatedAt;
    }

    return latest;
  }, null);
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

    async listCustomerCatalogCategories(filters: { deliveryMode?: CatalogDeliveryModeFilter } = {}): Promise<CustomerCategorySummaryRecord[]> {
      const [categories, products] = await Promise.all([
        client.category.findMany({
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }]
        }),
        client.product.findMany({
          where: { status: PRODUCT_STATUS.published },
          select: productSummarySelect,
          orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }]
        })
      ]);
      const summaries = products.map(mapProductSummary).filter((product) => matchesDeliveryMode(product, filters.deliveryMode));

      return categories.map((category) => {
        const categoryProducts = summaries.filter((product) => product.categoryId === category.id);
        const availableCount = categoryProducts.filter((product) => matchesAvailability(product, 'available')).length;
        const soldOutCount = categoryProducts.filter((product) => matchesAvailability(product, 'soldOut')).length;

        return {
          ...mapCategory(category),
          availableCount,
          soldOutCount,
          previewCount: availableCount,
          firstProductUpdatedAt: maxUpdatedAt(categoryProducts)
        };
      });
    },

    async listCustomerCategoryProductSummaries(input: {
      categoryId: string;
      deliveryMode?: CatalogDeliveryModeFilter;
      availability: CatalogAvailabilityFilter;
      keyword?: string;
      sort?: CatalogProductSort;
      limit?: number;
      cursor?: string;
    }): Promise<CatalogProductPage<CatalogProductSummaryRecord>> {
      const limit = clampPageLimit(input.limit);
      return createBoundedFilteredSummaryPage(client, {
        where: {
          status: PRODUCT_STATUS.published,
          categoryId: input.categoryId,
          AND: [createKeywordWhere(input.keyword)].filter(Boolean) as Prisma.ProductWhereInput[]
        },
        limit,
        cursor: input.cursor,
        filter: (product) =>
          matchesDeliveryMode(product, input.deliveryMode) &&
          matchesAvailability(product, input.availability)
      });
    },

    async searchCustomerProductSummaries(input: {
      deliveryMode?: CatalogDeliveryModeFilter;
      keyword?: string;
      limit?: number;
      cursor?: string;
    }): Promise<CatalogProductPage<CatalogProductSummaryRecord>> {
      const limit = clampPageLimit(input.limit);
      return createBoundedFilteredSummaryPage(client, {
        where: {
          status: PRODUCT_STATUS.published,
          AND: [createKeywordWhere(input.keyword)].filter(Boolean) as Prisma.ProductWhereInput[]
        },
        limit,
        cursor: input.cursor,
        filter: (product) => matchesDeliveryMode(product, input.deliveryMode)
      });
    },

    async createCustomerCategorySnapshotKey(filters: { deliveryMode?: CatalogDeliveryModeFilter } = {}): Promise<string> {
      const categories = await this.listCustomerCatalogCategories(filters);
      return createSnapshotKey([
        'customer-categories',
        filters.deliveryMode ?? 'all',
        categories.length,
        categories.reduce((total, category) => total + category.availableCount + category.soldOutCount, 0),
        categories.reduce<string | null>((latest, category) => {
          if (!category.firstProductUpdatedAt) {
            return latest;
          }

          return !latest || category.firstProductUpdatedAt > latest ? category.firstProductUpdatedAt : latest;
        }, null)
      ]);
    },

    async createCustomerCategoryProductsSnapshotKey(input: {
      categoryId: string;
      deliveryMode?: CatalogDeliveryModeFilter;
      availability: CatalogAvailabilityFilter;
      keyword?: string;
      sort?: CatalogProductSort;
    }): Promise<string> {
      const products = await client.product.findMany({
        where: {
          status: PRODUCT_STATUS.published,
          categoryId: input.categoryId,
          AND: [createKeywordWhere(input.keyword)].filter(Boolean) as Prisma.ProductWhereInput[]
        },
        select: productSummarySelect,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }]
      });
      const filtered = products
        .map(mapProductSummary)
        .filter((product) => matchesDeliveryMode(product, input.deliveryMode))
        .filter((product) => matchesAvailability(product, input.availability));

      return createSnapshotKey([
        'customer-category-products',
        input.categoryId,
        input.deliveryMode ?? 'all',
        input.availability,
        input.keyword?.trim() ?? '',
        input.sort ?? 'latest',
        filtered.length,
        maxUpdatedAt(filtered)
      ]);
    },

    async listMerchantProductSummaries(input: {
      categoryId?: string;
      status?: MerchantProductStatusFilter;
      keyword?: string;
      sort?: CatalogProductSort;
      limit?: number;
      cursor?: string;
    } = {}): Promise<MerchantProductSummaryPage> {
      const limit = clampPageLimit(input.limit);
      const baseWhere: Prisma.ProductWhereInput = {
        categoryId: input.categoryId,
        AND: [createKeywordWhere(input.keyword)].filter(Boolean) as Prisma.ProductWhereInput[]
      };
      const pageWhere: Prisma.ProductWhereInput = {
        ...baseWhere,
        status: input.status ? PRODUCT_STATUS[input.status] : undefined,
        AND: [
          ...(Array.isArray(baseWhere.AND) ? baseWhere.AND : []),
          createCursorWhere(input.cursor)
        ].filter(Boolean) as Prisma.ProductWhereInput[]
      };
      const [countScopeProducts, pageProducts] = await Promise.all([
        client.product.findMany({
          where: baseWhere,
          select: productSummarySelect,
          orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }]
        }),
        client.product.findMany({
          where: pageWhere,
          select: productSummarySelect,
          orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
          take: limit + 1
        })
      ]);
      const countScope = countScopeProducts.map(mapProductSummary);
      const page = createPage(pageProducts.map(mapProductSummary), limit);
      const summary: MerchantProductSummaryCounts = {
        totalProducts: countScope.length,
        publishedProducts: countScope.filter((product) => product.status === 'published').length,
        draftProducts: countScope.filter((product) => product.status === 'draft').length,
        archivedProducts: countScope.filter((product) => product.status === 'archived').length,
        stockWarnings: countScope.filter((product) => product.trackInventory && product.stock <= 0).length
      };

      return {
        ...page,
        summary,
        snapshotKey: createSnapshotKey([
          'merchant-products',
          input.categoryId ?? 'all',
          input.status ?? 'all',
          input.keyword?.trim() ?? '',
          input.sort ?? 'latest',
          countScope.length,
          maxUpdatedAt(countScope)
        ])
      };
    },

    async getCustomerProductDetail(productId: string): Promise<CatalogProductRecord | null> {
      return this.getProductById(productId);
    },

    async getMerchantProductDetail(productId: string): Promise<CatalogProductRecord | null> {
      return this.getProductById(productId);
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
