export const RUNTIME_CONFIG_SECTION_IDS = [
  'store-profile',
  'delivery-rules',
  'membership-tiers',
  'banner',
  'custom-notice'
] as const;

export type RuntimeConfigSectionId = (typeof RUNTIME_CONFIG_SECTION_IDS)[number];

export interface RuntimeConfigUpdatedBy {
  openid: string;
  name: string;
}

export interface RuntimeConfigSectionMeta {
  sectionId: RuntimeConfigSectionId;
  updatedAt: string;
  updatedBy: RuntimeConfigUpdatedBy;
}

export interface StoreProfileRuntimeConfigValue {
  address: string;
  latitude: number;
  longitude: number;
  contactPhone: string;
}

export interface DeliveryRuleTierRow {
  distanceKm: number;
  minimumOrderAmount: number | null;
  deliveryFee: number;
  explainer: string;
}

export interface DeliveryRulesRuntimeConfigValue {
  tiers: DeliveryRuleTierRow[];
}

export interface MembershipTierConfig {
  tierId: string;
  threshold: number;
  name: string;
  description: string;
}

export interface MembershipTiersRuntimeConfigValue {
  tiers: MembershipTierConfig[];
}

export interface BannerRuntimeConfigValue {
  fileId: string;
  altText: string;
}

export interface CustomNoticeRuntimeConfigValue {
  enabled: boolean;
  content: string;
}

export interface StoreProfileRuntimeConfigSection extends RuntimeConfigSectionMeta {
  sectionId: 'store-profile';
  value: StoreProfileRuntimeConfigValue;
}

export interface DeliveryRulesRuntimeConfigSection extends RuntimeConfigSectionMeta {
  sectionId: 'delivery-rules';
  value: DeliveryRulesRuntimeConfigValue;
}

export interface MembershipTiersRuntimeConfigSection extends RuntimeConfigSectionMeta {
  sectionId: 'membership-tiers';
  value: MembershipTiersRuntimeConfigValue;
}

export interface BannerRuntimeConfigSection extends RuntimeConfigSectionMeta {
  sectionId: 'banner';
  value: BannerRuntimeConfigValue;
}

export interface CustomNoticeRuntimeConfigSection extends RuntimeConfigSectionMeta {
  sectionId: 'custom-notice';
  value: CustomNoticeRuntimeConfigValue;
}

export type RuntimeConfigSectionDocument =
  | StoreProfileRuntimeConfigSection
  | DeliveryRulesRuntimeConfigSection
  | MembershipTiersRuntimeConfigSection
  | BannerRuntimeConfigSection
  | CustomNoticeRuntimeConfigSection;
