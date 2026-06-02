import type { OssAssetReference } from '@xiaipet/shared/types/assets';

export type DeliveryMode = 'pickup' | 'delivery' | 'express';

export interface HomeModule {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  accent: string;
  imageFileId: string;
  imageAltText: string;
}

export interface CatalogCategory {
  id: string;
  name: string;
  shortName: string;
  iconText: string;
  sectionTitle: string;
}

export interface CatalogPageInfo {
  hasMore: boolean;
  nextCursor: string | null;
}

export interface CatalogCategoryWithCounts extends CatalogCategory {
  availableCount: number;
  soldOutCount: number;
  previewCount?: number;
  firstProductUpdatedAt?: string | null;
}

export interface ProductSpecOption {
  id: string;
  label: string;
  price: number;
}

export interface CatalogProduct {
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
  deliveryModes: DeliveryMode[];
  thumbnail: string;
  quickBuyImage?: string;
  imageAsset?: OssAssetReference;
  gallery: string[];
  introductionImageAssets?: OssAssetReference[];
  detailImages: string[];
  detailImageAssets?: OssAssetReference[];
  specs: ProductSpecOption[];
}

export type CatalogProductSummary = Pick<
  CatalogProduct,
  | 'id'
  | 'name'
  | 'summary'
  | 'categoryId'
  | 'stock'
  | 'soldOut'
  | 'cartActionLabel'
  | 'memberLevelLabel'
  | 'deliveryModes'
  | 'thumbnail'
  | 'specs'
> & {
  price: number;
  updatedAt: string;
};

export interface CatalogSection {
  category: CatalogCategory;
  availableProducts: CatalogProduct[];
  soldOutProducts: CatalogProduct[];
}

export interface CatalogSectionState {
  category: CatalogCategoryWithCounts;
  availableProducts: CatalogProductSummary[];
  soldOutProducts: CatalogProductSummary[];
  availablePageInfo: CatalogPageInfo;
  soldOutPageInfo: CatalogPageInfo;
  isAvailableLoading: boolean;
  isSoldOutLoading: boolean;
}
