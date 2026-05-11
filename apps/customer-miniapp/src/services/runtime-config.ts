import type {
  BannerRuntimeConfigValue,
  CustomNoticeRuntimeConfigValue,
  DeliveryRulesRuntimeConfigValue,
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
}

interface ReadRuntimeConfigResult {
  ok?: boolean;
  banner?: BannerRuntimeConfigValue | null;
  store?: StoreProfileRuntimeConfigValue | null;
  customNotice?: CustomNoticeRuntimeConfigValue | null;
  deliveryRules?: DeliveryRulesRuntimeConfigValue | null;
}

type RuntimeConfigRequester = () => Promise<ReadRuntimeConfigResult>;

const DEFAULT_RUNTIME_CONFIG: CustomerRuntimeConfig = {
  banner: {
    fileId: '/assets/catalog/home-hero.png',
    altText: '首页 Banner'
  },
  store: {
    name: '虾衣宠物烘焙工作室',
    address: '上海市静安区南京西路 1266 号 8 楼',
    latitude: 31.22911,
    longitude: 121.44853,
    contactPhone: ''
  },
  customNotice: {
    enabled: true,
    content: '定制蛋糕请先联系店主沟通细节（微信号：xiaipet-bakery），已阅读后才可继续下单。'
  },
  deliveryRules: {
    tiers: LOCKED_DELIVERY_RULE_ROWS.map((row) => ({ ...row }))
  }
};

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
    }
  };
}

function mergeRuntimeConfig(result: ReadRuntimeConfigResult): CustomerRuntimeConfig {
  return {
    banner: result.banner
      ? {
          ...result.banner
        }
      : { ...DEFAULT_RUNTIME_CONFIG.banner },
    store: {
      ...DEFAULT_RUNTIME_CONFIG.store,
      ...(result.store ?? {})
    },
    customNotice: result.customNotice
      ? {
          ...result.customNotice
        }
      : { ...DEFAULT_RUNTIME_CONFIG.customNotice },
    deliveryRules: {
      tiers: (result.deliveryRules?.tiers ?? DEFAULT_RUNTIME_CONFIG.deliveryRules.tiers).map((row) => ({ ...row }))
    }
  };
}

export function getCachedCustomerRuntimeConfig() {
  return cloneRuntimeConfig(cachedRuntimeConfig);
}

export function resetCustomerRuntimeConfigCache() {
  cachedRuntimeConfig = cloneRuntimeConfig(DEFAULT_RUNTIME_CONFIG);
}

export async function hydrateCustomerRuntimeConfig(requestRuntimeConfig = getRuntimeConfigRequester()) {
  const result = await requestRuntimeConfig();

  cachedRuntimeConfig = mergeRuntimeConfig(result ?? {});
  return getCachedCustomerRuntimeConfig();
}
