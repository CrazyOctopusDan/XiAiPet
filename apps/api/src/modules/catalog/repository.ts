import { Prisma } from '@prisma/client';

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
const MAX_FILTER_SCAN_ROWS = 180;
const PRODUCT_STATUS_DB_VALUE = {
  draft: 'draft',
  published: 'published',
  archived: 'archived'
} as const;

function isPrismaErrorCode(error: unknown, code: string) {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: unknown }).code === code);
}

function createVisibleMerchantProductWhere(baseWhere: Prisma.ProductWhereInput): Prisma.ProductWhereInput {
  return {
    ...baseWhere,
    status: { not: PRODUCT_STATUS.archived }
  };
}

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

function createAvailabilityWhere(availability: CatalogAvailabilityFilter): Prisma.ProductWhereInput {
  if (availability === 'soldOut') {
    return {
      trackInventory: true,
      stock: { lte: 0 }
    };
  }

  return {
    OR: [
      { trackInventory: false },
      { stock: { gt: 0 } }
    ]
  };
}

function createAvailabilitySql(availability: CatalogAvailabilityFilter) {
  if (availability === 'soldOut') {
    return Prisma.sql`AND trackInventory = true AND stock <= 0`;
  }

  return Prisma.sql`AND (trackInventory = false OR stock > 0)`;
}

function createDeliveryModeSql(deliveryMode: CatalogDeliveryModeFilter | undefined) {
  if (!deliveryMode) {
    return Prisma.empty;
  }

  return Prisma.sql`AND (JSON_LENGTH(fulfillmentModes) = 0 OR JSON_CONTAINS(fulfillmentModes, JSON_QUOTE(${deliveryMode})))`;
}

function createKeywordSql(keyword: string | undefined) {
  const trimmed = keyword?.trim();
  if (!trimmed) {
    return Prisma.empty;
  }

  return Prisma.sql`AND (name LIKE ${`%${trimmed}%`} OR description LIKE ${`%${trimmed}%`})`;
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
  let scannedCount = 0;
  let lastScannedProduct: MerchantProductSummaryRecord | undefined;
  let stoppedAtScanCap = false;

  while (collected.length <= input.limit && scannedCount < MAX_FILTER_SCAN_ROWS) {
    const take = Math.min(chunkSize, MAX_FILTER_SCAN_ROWS - scannedCount);
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
      take
    });

    if (products.length === 0) {
      break;
    }

    const summaries = products.map(mapProductSummary);
    scannedCount += summaries.length;
    const scannedLastProduct = summaries[summaries.length - 1];
    if (!scannedLastProduct) {
      break;
    }
    lastScannedProduct = scannedLastProduct;
    collected.push(...summaries.filter(input.filter));

    if (products.length < take) {
      break;
    }

    currentCursor = encodeCatalogCursor(scannedLastProduct);
    stoppedAtScanCap = scannedCount >= MAX_FILTER_SCAN_ROWS;
  }

  if (stoppedAtScanCap && collected.length <= input.limit && lastScannedProduct) {
    return {
      items: collected,
      hasMore: true,
      nextCursor: encodeCatalogCursor(lastScannedProduct)
    };
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

function toCount(value: unknown) {
  if (typeof value === 'bigint') {
    return Number(value);
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    return Number.parseInt(value, 10);
  }
  return 0;
}

async function countCustomerCategoryProducts(
  client: DbClient,
  input: {
    categoryId: string;
    availability: CatalogAvailabilityFilter;
    deliveryMode?: CatalogDeliveryModeFilter;
  }
) {
  const rows = await client.$queryRaw<Array<{ count: bigint | number | string }>>(Prisma.sql`
    SELECT COUNT(*) AS count
    FROM products
    WHERE status = ${PRODUCT_STATUS_DB_VALUE.published}
      AND categoryId = ${input.categoryId}
      ${createAvailabilitySql(input.availability)}
      ${createDeliveryModeSql(input.deliveryMode)}
  `);
  return toCount(rows[0]?.count);
}

async function getCustomerCategoryLatestUpdatedAt(
  client: DbClient,
  input: {
    categoryId: string;
    deliveryMode?: CatalogDeliveryModeFilter;
  }
) {
  const rows = await client.$queryRaw<Array<{ maxUpdatedAt: Date | null }>>(Prisma.sql`
    SELECT MAX(updatedAt) AS maxUpdatedAt
    FROM products
    WHERE status = ${PRODUCT_STATUS_DB_VALUE.published}
      AND categoryId = ${input.categoryId}
      ${createDeliveryModeSql(input.deliveryMode)}
  `);
  return rows[0]?.maxUpdatedAt?.toISOString() ?? null;
}

async function getCustomerSearchSnapshotMetadata(
  client: DbClient,
  input: {
    deliveryMode?: CatalogDeliveryModeFilter;
    keyword?: string;
  }
) {
  const [countRows, maxRows] = await Promise.all([
    client.$queryRaw<Array<{ count: bigint | number | string }>>(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM products
      WHERE status = ${PRODUCT_STATUS_DB_VALUE.published}
        ${createKeywordSql(input.keyword)}
        ${createDeliveryModeSql(input.deliveryMode)}
    `),
    client.$queryRaw<Array<{ maxUpdatedAt: Date | null }>>(Prisma.sql`
      SELECT MAX(updatedAt) AS maxUpdatedAt
      FROM products
      WHERE status = ${PRODUCT_STATUS_DB_VALUE.published}
        ${createKeywordSql(input.keyword)}
        ${createDeliveryModeSql(input.deliveryMode)}
    `)
  ]);

  return {
    count: toCount(countRows[0]?.count),
    maxUpdatedAt: maxRows[0]?.maxUpdatedAt?.toISOString() ?? null
  };
}

function createCategoryAvailabilityWhere(categoryId: string, availability: CatalogAvailabilityFilter): Prisma.ProductWhereInput {
  return {
    status: PRODUCT_STATUS.published,
    categoryId,
    ...createAvailabilityWhere(availability)
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
          status: filters.status ? PRODUCT_STATUS[filters.status] : { not: PRODUCT_STATUS.archived }
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }]
      });
      return products.map(mapProduct);
    },

    async listCustomerCatalogCategories(filters: { deliveryMode?: CatalogDeliveryModeFilter } = {}): Promise<CustomerCategorySummaryRecord[]> {
      const categories = await client.category.findMany({
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }]
      });

      return Promise.all(categories.map(async (category) => {
        const [availableCount, soldOutCount, latestProduct] = await Promise.all([
          countCustomerCategoryProducts(client, {
            categoryId: category.id,
            availability: 'available',
            deliveryMode: filters.deliveryMode
          }),
          countCustomerCategoryProducts(client, {
            categoryId: category.id,
            availability: 'soldOut',
            deliveryMode: filters.deliveryMode
          }),
          getCustomerCategoryLatestUpdatedAt(client, {
            categoryId: category.id,
            deliveryMode: filters.deliveryMode
          })
        ]);
        return {
          ...mapCategory(category),
          availableCount,
          soldOutCount,
          previewCount: availableCount,
          firstProductUpdatedAt: latestProduct
        };
      }));
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
          ...createAvailabilityWhere(input.availability),
          AND: [createKeywordWhere(input.keyword)].filter(Boolean) as Prisma.ProductWhereInput[]
        },
        limit,
        cursor: input.cursor,
        filter: (product) => matchesDeliveryMode(product, input.deliveryMode)
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
      const where: Prisma.ProductWhereInput = {
        status: PRODUCT_STATUS.published,
        categoryId: input.categoryId,
        ...createAvailabilityWhere(input.availability),
        AND: [createKeywordWhere(input.keyword)].filter(Boolean) as Prisma.ProductWhereInput[]
      };
      const [count, aggregate] = await Promise.all([
        client.product.count({ where }),
        client.product.aggregate({
          where,
          _max: { updatedAt: true }
        })
      ]);

      return createSnapshotKey([
        'customer-category-products',
        input.categoryId,
        input.deliveryMode ?? 'all',
        input.availability,
        input.keyword?.trim() ?? '',
        input.sort ?? 'latest',
        count,
        aggregate._max.updatedAt?.toISOString() ?? null
      ]);
    },

    async createCustomerSearchSnapshotKey(input: {
      deliveryMode?: CatalogDeliveryModeFilter;
      keyword?: string;
    }): Promise<string> {
      const metadata = await getCustomerSearchSnapshotMetadata(client, input);
      return createSnapshotKey([
        'customer-search',
        input.deliveryMode ?? 'all',
        input.keyword?.trim() ?? '',
        metadata.count,
        metadata.maxUpdatedAt
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
      const currentWhere: Prisma.ProductWhereInput = input.status
        ? { ...baseWhere, status: PRODUCT_STATUS[input.status] }
        : createVisibleMerchantProductWhere(baseWhere);
      const pageWhere: Prisma.ProductWhereInput = {
        ...baseWhere,
        status: input.status ? PRODUCT_STATUS[input.status] : { not: PRODUCT_STATUS.archived },
        AND: [
          ...(Array.isArray(baseWhere.AND) ? baseWhere.AND : []),
          createCursorWhere(input.cursor)
        ].filter(Boolean) as Prisma.ProductWhereInput[]
      };
      const [
        totalProducts,
        publishedProducts,
        draftProducts,
        archivedProducts,
        stockWarnings,
        latestProduct,
        pageProducts
      ] = await Promise.all([
        client.product.count({ where: currentWhere }),
        client.product.count({ where: { ...baseWhere, status: PRODUCT_STATUS.published } }),
        client.product.count({ where: { ...baseWhere, status: PRODUCT_STATUS.draft } }),
        client.product.count({ where: { ...baseWhere, status: PRODUCT_STATUS.archived } }),
        client.product.count({
          where: {
            ...currentWhere,
            trackInventory: true,
            stock: { lte: 0 }
          }
        }),
        client.product.aggregate({
          where: currentWhere,
          _max: { updatedAt: true }
        }),
        client.product.findMany({
          where: pageWhere,
          select: productSummarySelect,
          orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
          take: limit + 1
        })
      ]);
      const page = createPage(pageProducts.map(mapProductSummary), limit);
      const summary: MerchantProductSummaryCounts = {
        totalProducts,
        publishedProducts,
        draftProducts,
        archivedProducts,
        stockWarnings
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
          totalProducts,
          latestProduct._max.updatedAt?.toISOString() ?? null
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
          categoryId,
          status: { not: PRODUCT_STATUS.archived }
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
      try {
        await client.product.delete({
          where: {
            id: productId
          }
        });
      } catch (error) {
        if (!isPrismaErrorCode(error, 'P2003')) {
          throw error;
        }

        await client.product.update({
          where: {
            id: productId
          },
          data: {
            status: PRODUCT_STATUS.archived
          }
        });
      }
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
