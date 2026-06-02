import type { OrderFulfillmentMode } from './order';
import type { OssAssetReference } from './assets';

export type CatalogCategoryIconToken = string;
export type CatalogProductStatus = 'draft' | 'published' | 'archived';
export type CatalogProductEditorStep = 'basicInfo' | 'pricing' | 'publishSettings';

export interface CatalogCategoryRecord {
  id: string;
  name: string;
  iconToken: CatalogCategoryIconToken;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogCategoryDeletePreflight {
  categoryId: string;
  linkedProductCount: number;
  canDelete: boolean;
}

export interface CatalogProductSpecOption {
  id: string;
  label: string;
  surcharge: number;
}

export interface CatalogProductFormulaOption {
  id: string;
  label: string;
  surcharge: number;
}

export interface CatalogProductPriceOverride {
  specId: string;
  formulaId: string;
  price: number;
}

export interface CatalogPurchaseLimit {
  enabled: boolean;
  maxQuantity: number | null;
}

export interface CatalogProductEditorBasicInfo {
  productId: string;
  name: string;
  description: string;
  categoryId: string;
  imageFileId: string;
  imageAsset?: OssAssetReference;
  imagePreviewUrl?: string;
  introductionImageAssets?: OssAssetReference[];
  detailImageAssets?: OssAssetReference[];
  memberLevelId: string | null;
  stock: number;
}

export interface CatalogProductEditorPricing {
  basePrice: number;
  specs: CatalogProductSpecOption[];
  formulas: CatalogProductFormulaOption[];
  overrides: CatalogProductPriceOverride[];
  purchaseLimit: CatalogPurchaseLimit;
  detailContent: string;
}

export interface CatalogProductPublishSettings {
  status: CatalogProductStatus;
  fulfillmentModes: OrderFulfillmentMode[];
  trackInventory: boolean;
}

export interface CatalogProductEditorPayload {
  basicInfo: CatalogProductEditorBasicInfo;
  pricing: CatalogProductEditorPricing;
  publishSettings: CatalogProductPublishSettings;
}

export interface CatalogProductAdminRecord {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  imageFileId: string;
  imageAsset?: OssAssetReference;
  imagePreviewUrl?: string;
  introductionImageAssets?: OssAssetReference[];
  detailImageAssets?: OssAssetReference[];
  memberLevelId: string | null;
  status: CatalogProductStatus;
  stock: number;
  trackInventory: boolean;
  fulfillmentModes: OrderFulfillmentMode[];
  basePrice: number;
  specs: CatalogProductSpecOption[];
  formulas: CatalogProductFormulaOption[];
  priceOverrides: CatalogProductPriceOverride[];
  purchaseLimit: CatalogPurchaseLimit;
  detailContent: string;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogPageInfo {
  hasMore: boolean;
  nextCursor: string | null;
}

export interface CatalogProductAdminListItem {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  status: CatalogProductStatus;
  stock: number;
  trackInventory: boolean;
  minPrice: number;
  maxPrice: number;
  fulfillmentModes: OrderFulfillmentMode[];
  thumbnail: string;
  updatedAt: string;
}

export interface CatalogProductAdminListSummary {
  totalProducts: number;
  publishedProducts: number;
  draftProducts: number;
  archivedProducts: number;
  stockWarnings: number;
}

export interface CatalogProductAdminListResponse {
  items: Array<CatalogProductAdminListItem | CatalogProductAdminRecord>;
  summary: CatalogProductAdminListSummary;
  pageInfo: CatalogPageInfo;
  snapshotKey: string;
}
