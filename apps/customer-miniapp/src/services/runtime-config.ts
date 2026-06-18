import type {
  BannerRuntimeConfigValue,
  CustomNoticeRuntimeConfigValue,
  DeliveryRulesRuntimeConfigValue,
  MembershipTierConfig,
  MembershipTiersRuntimeConfigValue,
  RuntimeConfigSectionDocument,
  StoreProfileRuntimeConfigValue
} from '@xiaipet/shared/types/runtime-config';

import { customerApiRequest } from './api-client';

const LOCKED_DELIVERY_RULE_ROWS: DeliveryRulesRuntimeConfigValue['tiers'] = [
  { distanceKm: 5, minimumOrderAmount: 98, deliveryFee: 0, explainer: '5.0 公里内 98 元起送，配送费 0 元' },
  { distanceKm: 10, minimumOrderAmount: 98, deliveryFee: 15, explainer: '10.0 公里内 98 元起送，配送费 15 元' },
  { distanceKm: 15, minimumOrderAmount: null, deliveryFee: 25, explainer: '15.0 公里内，配送费 25 元' },
  { distanceKm: 20, minimumOrderAmount: null, deliveryFee: 40, explainer: '20.0 公里内，配送费 40 元' },
  { distanceKm: 25, minimumOrderAmount: null, deliveryFee: 50, explainer: '25.0 公里内，配送费 50 元' },
  { distanceKm: 30, minimumOrderAmount: null, deliveryFee: 60, explainer: '30.0 公里内，配送费 60 元' },
  { distanceKm: 35, minimumOrderAmount: null, deliveryFee: 65, explainer: '35.0 公里内，配送费 65 元' },
  { distanceKm: 40, minimumOrderAmount: null, deliveryFee: 70, explainer: '40.0 公里内，配送费 70 元' },
  { distanceKm: 45, minimumOrderAmount: null, deliveryFee: 75, explainer: '45.0 公里内，配送费 75 元' },
  { distanceKm: 50, minimumOrderAmount: null, deliveryFee: 80, explainer: '50.0 公里内，配送费 80 元' }
];

export interface CustomerStoreRuntimeConfig extends StoreProfileRuntimeConfigValue {
  name: string;
}

export interface CustomerRuntimeConfig {
  banner: BannerRuntimeConfigValue;
  store: CustomerStoreRuntimeConfig;
  customNotice: CustomNoticeRuntimeConfigValue;
  deliveryRules: DeliveryRulesRuntimeConfigValue;
  membershipTiers: MembershipTiersRuntimeConfigValue;
}

export interface MembershipTierCardViewModel {
  tierId: string;
  name: string;
  threshold: number;
  thresholdLabel: string;
  description: string;
  badgeLabel: string;
  cardStyle: string;
}

interface ReadRuntimeConfigResult {
  ok?: boolean;
  banner?: BannerRuntimeConfigValue | null;
  store?: StoreProfileRuntimeConfigValue | null;
  customNotice?: CustomNoticeRuntimeConfigValue | null;
  deliveryRules?: DeliveryRulesRuntimeConfigValue | null;
  membershipTiers?: MembershipTiersRuntimeConfigValue | null;
  sections?: RuntimeConfigSectionDocument[] | null;
}

type RuntimeConfigRequester = () => Promise<ReadRuntimeConfigResult>;

const DEFAULT_RUNTIME_CONFIG: CustomerRuntimeConfig = {
  banner: {
    fileId: '/assets/catalog/banner.jpg',
    altText: '首页 Banner'
  },
  store: {
    name: 'XiAi宠物烘焙',
    storeName: 'XiAi宠物烘焙',
    address: '上海市静安区南京西路 1266 号 8 楼',
    latitude: 31.22911,
    longitude: 121.44853,
    wechatId: '',
    ownerPhone: ''
  },
  customNotice: {
    enabled: false,
    content: ''
  },
  deliveryRules: {
    tiers: LOCKED_DELIVERY_RULE_ROWS.map((row) => ({ ...row }))
  },
  membershipTiers: {
    tiers: []
  }
};

const BASE_MEMBERSHIP_THEME = {
  start: '#F9F0DB',
  middle: '#E5C987',
  end: '#9B6E2E',
  accent: '#8A682C'
};

const TOP_MEMBERSHIP_THEME = {
  start: '#1C1917',
  middle: '#34302A',
  end: '#6B4E1E',
  accent: '#CA8A04'
};
const BANNER_OSS_PROCESS = 'image/resize,m_lfit,w_750/format,webp/quality,q_80';

let cachedRuntimeConfig: CustomerRuntimeConfig = cloneRuntimeConfig(DEFAULT_RUNTIME_CONFIG);

function getRuntimeConfigRequester(): RuntimeConfigRequester {
  return () =>
    customerApiRequest<ReadRuntimeConfigResult>('/api/v1/customer/runtime-config', {
      method: 'GET',
      auth: 'none'
    });
}

function cloneRuntimeConfig(config: CustomerRuntimeConfig): CustomerRuntimeConfig {
  return {
    banner: { ...config.banner },
    store: { ...config.store },
    customNotice: { ...config.customNotice },
    deliveryRules: {
      tiers: config.deliveryRules.tiers.map((row) => ({ ...row }))
    },
    membershipTiers: {
      tiers: config.membershipTiers.tiers.map((row) => ({ ...row }))
    }
  };
}

function getSection<T extends RuntimeConfigSectionDocument['sectionId']>(
  sections: RuntimeConfigSectionDocument[] | null | undefined,
  sectionId: T
) {
  return sections?.find((section): section is Extract<RuntimeConfigSectionDocument, { sectionId: T }> => section.sectionId === sectionId) ?? null;
}

function normalizeStoreProfile(store: StoreProfileRuntimeConfigValue | null | undefined): CustomerStoreRuntimeConfig {
  const value = store as Partial<StoreProfileRuntimeConfigValue> | null | undefined;
  const storeName = value?.storeName || DEFAULT_RUNTIME_CONFIG.store.storeName;

  return {
    ...DEFAULT_RUNTIME_CONFIG.store,
    ...(value ?? {}),
    storeName,
    name: storeName,
    wechatId: value?.wechatId ?? DEFAULT_RUNTIME_CONFIG.store.wechatId,
    ownerPhone: value?.ownerPhone ?? DEFAULT_RUNTIME_CONFIG.store.ownerPhone
  };
}

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');
  return {
    red: parseInt(normalized.slice(0, 2), 16),
    green: parseInt(normalized.slice(2, 4), 16),
    blue: parseInt(normalized.slice(4, 6), 16)
  };
}

function toHex(value: number) {
  return Math.round(value).toString(16).padStart(2, '0');
}

function mixColor(from: string, to: string, ratio: number) {
  const safeRatio = clamp(ratio);
  const start = hexToRgb(from);
  const end = hexToRgb(to);

  return `#${toHex(start.red + (end.red - start.red) * safeRatio)}${toHex(
    start.green + (end.green - start.green) * safeRatio
  )}${toHex(start.blue + (end.blue - start.blue) * safeRatio)}`.toUpperCase();
}

function formatMembershipThreshold(value: number) {
  return value <= 0 ? '默认会员等级' : `累计充值满 ${value} 元`;
}

function buildMembershipCardStyle(progress: number) {
  const safeProgress = clamp(progress);
  const start = mixColor(BASE_MEMBERSHIP_THEME.start, TOP_MEMBERSHIP_THEME.start, safeProgress);
  const middle = mixColor(BASE_MEMBERSHIP_THEME.middle, TOP_MEMBERSHIP_THEME.middle, safeProgress);
  const end = mixColor(BASE_MEMBERSHIP_THEME.end, TOP_MEMBERSHIP_THEME.end, safeProgress);
  const accent = mixColor(BASE_MEMBERSHIP_THEME.accent, TOP_MEMBERSHIP_THEME.accent, safeProgress);
  const isDark = safeProgress >= 0.45;
  const text = isDark ? '#FFFFFF' : '#2B2115';
  const muted = isDark ? 'rgba(255, 255, 255, 0.72)' : '#675232';
  const border = isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(139, 104, 44, 0.2)';
  const pillBg = isDark ? 'rgba(255, 255, 255, 0.13)' : 'rgba(255, 255, 255, 0.45)';
  const glow = isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.42)';
  const shadow = isDark
    ? '0 30rpx 70rpx rgba(28, 25, 23, 0.22)'
    : '0 26rpx 60rpx rgba(138, 104, 44, 0.16)';

  return [
    `--member-card-progress: ${Number(safeProgress.toFixed(3))}`,
    `--member-card-bg: linear-gradient(135deg, ${start} 0%, ${middle} 55%, ${end} 100%)`,
    `--member-card-text: ${text}`,
    `--member-card-muted: ${muted}`,
    `--member-card-border: ${border}`,
    `--member-card-pill-bg: ${pillBg}`,
    `--member-card-glow: ${glow}`,
    `--member-card-shadow: ${shadow}`,
    `--member-card-accent: ${accent}`
  ].join('; ');
}

function mergeRuntimeConfig(result: ReadRuntimeConfigResult): CustomerRuntimeConfig {
  const bannerSection = getSection(result.sections, 'banner');
  const storeSection = getSection(result.sections, 'store-profile');
  const noticeSection = getSection(result.sections, 'custom-notice');
  const deliverySection = getSection(result.sections, 'delivery-rules');
  const membershipSection = getSection(result.sections, 'membership-tiers');
  const banner = result.banner ?? bannerSection?.value ?? DEFAULT_RUNTIME_CONFIG.banner;
  const customNotice = result.customNotice ?? noticeSection?.value ?? DEFAULT_RUNTIME_CONFIG.customNotice;

  return {
    banner: { ...banner },
    store: normalizeStoreProfile(result.store ?? storeSection?.value),
    customNotice: { ...customNotice },
    deliveryRules: {
      tiers: ((result.deliveryRules ?? deliverySection?.value)?.tiers ?? DEFAULT_RUNTIME_CONFIG.deliveryRules.tiers).map((row) => ({ ...row }))
    },
    membershipTiers: {
      tiers: ((result.membershipTiers ?? membershipSection?.value)?.tiers ?? DEFAULT_RUNTIME_CONFIG.membershipTiers.tiers).map((row) => ({ ...row }))
    }
  };
}

export function getCachedCustomerRuntimeConfig() {
  return cloneRuntimeConfig(cachedRuntimeConfig);
}

export function resolveRuntimeBannerImageSrc(banner: BannerRuntimeConfigValue) {
  const rawUrl = banner.asset?.variants.find((variant) => variant.name === 'banner')?.url ?? banner.asset?.url ?? banner.fileId;
  return appendBannerOssProcess(rawUrl);
}

function appendBannerOssProcess(url: string) {
  if (!/^https?:\/\//.test(url)) {
    return url;
  }

  const normalizedUrl = url.startsWith('http://') ? `https://${url.slice('http://'.length)}` : url;
  const [base, query = ''] = normalizedUrl.split('?');
  const params = query
    .split('&')
    .filter(Boolean)
    .filter((param) => !param.startsWith('x-oss-process='));
  const queryPrefix = params.length ? `${params.join('&')}&` : '';
  return `${base}?${queryPrefix}x-oss-process=${BANNER_OSS_PROCESS}`;
}

export function resetCustomerRuntimeConfigCache() {
  cachedRuntimeConfig = cloneRuntimeConfig(DEFAULT_RUNTIME_CONFIG);
}

export function buildMembershipTierCards(tiers: MembershipTierConfig[]): MembershipTierCardViewModel[] {
  const sorted = [...tiers].sort((left, right) => left.threshold - right.threshold);
  const denominator = Math.max(sorted.length - 1, 1);

  return sorted.map((tier, index) => {
    const progress = sorted.length === 1 ? 0 : index / denominator;

    return {
      tierId: tier.tierId,
      name: tier.name,
      threshold: tier.threshold,
      thresholdLabel: formatMembershipThreshold(tier.threshold),
      description: tier.description,
      badgeLabel: `Level ${String(index + 1).padStart(2, '0')}`,
      cardStyle: buildMembershipCardStyle(progress)
    };
  });
}

export function findMembershipTierCard(cards: MembershipTierCardViewModel[], memberLevel: string) {
  return cards.find((card) => card.name === memberLevel) ?? cards[0] ?? null;
}

export function findMembershipTierCardByRecharge(cards: MembershipTierCardViewModel[], totalRecharge: number) {
  return cards
    .filter((card) => card.threshold <= totalRecharge)
    .sort((left, right) => right.threshold - left.threshold)[0] ?? cards[0] ?? null;
}

export async function hydrateCustomerRuntimeConfig(requestRuntimeConfig = getRuntimeConfigRequester()) {
  const result = await requestRuntimeConfig();

  cachedRuntimeConfig = mergeRuntimeConfig(result ?? {});
  return getCachedCustomerRuntimeConfig();
}
