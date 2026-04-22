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
  gallery: string[];
  detailImages: string[];
  specs: ProductSpecOption[];
}

export interface CatalogSection {
  category: CatalogCategory;
  availableProducts: CatalogProduct[];
  soldOutProducts: CatalogProduct[];
}
