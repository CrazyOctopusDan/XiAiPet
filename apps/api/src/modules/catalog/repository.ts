import type { DbClient } from '../../db/types';
import { PRODUCT_STATUS, toSharedEnum } from '../../db/enums';
import { getPrismaClient } from '../../db/prisma';

export interface CatalogProductRecord {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  imageFileId: string;
  imagePreviewUrl?: string;
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

interface ProductRow {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  imageFileId: string;
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
  purchaseLimit: unknown;
  detailContent: string;
  createdAt: Date;
  updatedAt: Date;
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function mapProduct(row: ProductRow): CatalogProductRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    categoryId: row.categoryId,
    imageFileId: row.imageFileId,
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
    purchaseLimit: row.purchaseLimit,
    detailContent: row.detailContent,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export function createCatalogRepository(client: DbClient = getPrismaClient()) {
  return {
    async listPublishedProducts(): Promise<CatalogProductRecord[]> {
      const products = await client.product.findMany({
        where: { status: PRODUCT_STATUS.published },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }]
      });
      return products.map(mapProduct);
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
    }
  };
}
