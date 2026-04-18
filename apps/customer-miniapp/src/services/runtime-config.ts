declare const wx: any;

import type {
  BannerRuntimeConfigValue,
  CustomNoticeRuntimeConfigValue,
  DeliveryRulesRuntimeConfigValue,
  StoreProfileRuntimeConfigValue
} from '@xiaipet/shared/types/runtime-config';
import { LOCKED_DELIVERY_RULE_ROWS } from '../../../../packages/shared/src/schema/runtime-config';

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

function getCloudCaller() {
  return (payload: Record<string, unknown>) => wx.cloud.callFunction(payload);
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

export async function hydrateCustomerRuntimeConfig(callFunction = getCloudCaller()) {
  const response = (await callFunction({
    name: 'readRuntimeConfig',
    data: {}
  })) as {
    result: ReadRuntimeConfigResult;
  };

  cachedRuntimeConfig = mergeRuntimeConfig(response.result ?? {});
  return getCachedCustomerRuntimeConfig();
}
