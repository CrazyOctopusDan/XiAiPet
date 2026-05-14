import type {
  BannerRuntimeConfigSection,
  CustomNoticeRuntimeConfigSection,
  DeliveryRuleTierRow,
  DeliveryRulesRuntimeConfigSection,
  MembershipTierConfig,
  MembershipTiersRuntimeConfigSection,
  RuntimeConfigSectionDocument,
  RuntimeConfigSectionId,
  StoreProfileRuntimeConfigSection
} from '@xiaipet/shared/types/runtime-config';
import { merchantApiRequest, type MerchantApiRequester } from './api-client';
import { uploadMerchantAsset, type UploadedMerchantAsset } from './assets';

const LOCKED_DELIVERY_RULE_ROWS: DeliveryRuleTierRow[] = [
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

export { LOCKED_DELIVERY_RULE_ROWS };

export interface RuntimeConfigSectionViewModel {
  sectionId: RuntimeConfigSectionId;
  title: string;
  iconToken: string;
  summaryLabel: string;
  dirtyLabel: string | null;
  updatedLabel: string;
  storeFields?: StoreProfileRuntimeConfigSection['value'];
  deliveryRows?: DeliveryRuleTierRow[];
  membershipRows?: Array<MembershipTierConfig & { thresholdLabel: string }>;
  bannerFields?: BannerRuntimeConfigSection['value'];
  customNoticeFields?: CustomNoticeRuntimeConfigSection['value'];
}

export interface RuntimeConfigAdminSummaryViewModel {
  totalSections: number;
  dirtySections: number;
  deliveryRuleCount: number;
}

export interface RuntimeConfigAdminViewModel {
  summary: RuntimeConfigAdminSummaryViewModel;
  sections: RuntimeConfigSectionViewModel[];
}

export type RuntimeConfigSectionDraft =
  | StoreProfileRuntimeConfigSection['value']
  | DeliveryRulesRuntimeConfigSection['value']
  | MembershipTiersRuntimeConfigSection['value']
  | BannerRuntimeConfigSection['value']
  | CustomNoticeRuntimeConfigSection['value'];

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${month}-${day} ${hours}:${minutes}`;
}

function createUpdatedBy() {
  return {
    openid: 'merchant-openid',
    name: '喜爱宠物烘焙工作室'
  };
}

function getNow() {
  return new Date().toISOString();
}

function getDefaultSections(): RuntimeConfigSectionDocument[] {
  const now = getNow();
  const updatedBy = createUpdatedBy();

  return [
    {
      sectionId: 'store-profile',
      updatedAt: now,
      updatedBy,
      value: {
        address: '',
        latitude: 0,
        longitude: 0,
        contactPhone: ''
      }
    },
    {
      sectionId: 'delivery-rules',
      updatedAt: now,
      updatedBy,
      value: {
        tiers: LOCKED_DELIVERY_RULE_ROWS.map((row) => ({ ...row }))
      }
    },
    {
      sectionId: 'membership-tiers',
      updatedAt: now,
      updatedBy,
      value: {
        tiers: [
          {
            tierId: 'tier-basic',
            threshold: 0,
            name: '普通会员',
            description: '默认会员等级'
          }
        ]
      }
    },
    {
      sectionId: 'banner',
      updatedAt: now,
      updatedBy,
      value: {
        fileId: '/assets/catalog/home-hero.png',
        altText: '首页 Banner'
      }
    },
    {
      sectionId: 'custom-notice',
      updatedAt: now,
      updatedBy,
      value: {
        enabled: true,
        content: '请提前联系确认。'
      }
    }
  ];
}

function mergeSections(sections: RuntimeConfigSectionDocument[]) {
  const defaults = getDefaultSections();
  const sectionMap = new Map(sections.map((section) => [section.sectionId, section]));

  return defaults.map((fallback) => sectionMap.get(fallback.sectionId) ?? fallback);
}

function getSectionTitle(sectionId: RuntimeConfigSectionId) {
  if (sectionId === 'store-profile') {
    return '店铺信息';
  }

  if (sectionId === 'delivery-rules') {
    return '配送费规则';
  }

  if (sectionId === 'membership-tiers') {
    return '会员等级';
  }

  if (sectionId === 'banner') {
    return '首页 Banner';
  }

  return '定制提示';
}

function getSectionIconToken(sectionId: RuntimeConfigSectionId) {
  if (sectionId === 'store-profile') {
    return '店';
  }

  if (sectionId === 'delivery-rules') {
    return '费';
  }

  if (sectionId === 'membership-tiers') {
    return '级';
  }

  if (sectionId === 'banner') {
    return '图';
  }

  return '提';
}

function getSectionSummaryLabel(section: RuntimeConfigSectionDocument) {
  if (section.sectionId === 'store-profile') {
    return section.value.contactPhone ? '地址与电话已配置' : '补全地址与电话';
  }

  if (section.sectionId === 'delivery-rules') {
    return `${section.value.tiers.length} 个配送档`;
  }

  if (section.sectionId === 'membership-tiers') {
    return `${section.value.tiers.length} 个等级`;
  }

  if (section.sectionId === 'banner') {
    return section.value.fileId ? '首页展示图已配置' : '上传首页展示图';
  }

  return section.value.enabled ? '定制提示已开启' : '定制提示已关闭';
}

export async function queryRuntimeConfigSections(request: MerchantApiRequester = merchantApiRequest) {
  const response = await request<{
    ok?: boolean;
    sections?: RuntimeConfigSectionDocument[];
  }>('/api/v1/merchant/runtime-config/sections', {
    method: 'GET',
    auth: 'merchant'
  });

  return mergeSections(response.sections ?? []);
}

export async function saveRuntimeConfigSection(
  section: RuntimeConfigSectionDocument,
  request: MerchantApiRequester = merchantApiRequest
) {
  const response = await request<{
    ok?: boolean;
    section: RuntimeConfigSectionDocument;
  }>(`/api/v1/merchant/runtime-config/sections/${section.sectionId}`, {
    method: 'PUT',
    body: section,
    auth: 'merchant'
  });

  return response.section;
}

export async function uploadRuntimeBannerAsset(filePath: string, request?: MerchantApiRequester): Promise<UploadedMerchantAsset> {
  return uploadMerchantAsset('runtime-banner', {
    filePath,
    processingMode: 'miniapp',
    request
  });
}

export function getRuntimeConfigAdminViewModel(
  sections: RuntimeConfigSectionDocument[],
  dirty: Partial<Record<RuntimeConfigSectionId, boolean>>
): RuntimeConfigAdminViewModel {
  const mergedSections = mergeSections(sections);
  const deliverySection = mergedSections.find((section) => section.sectionId === 'delivery-rules');

  return {
    summary: {
      totalSections: mergedSections.length,
      dirtySections: mergedSections.filter((section) => dirty[section.sectionId]).length,
      deliveryRuleCount: deliverySection?.sectionId === 'delivery-rules' ? deliverySection.value.tiers.length : 0
    },
    sections: mergedSections.map((section) => ({
      sectionId: section.sectionId,
      title: getSectionTitle(section.sectionId),
      iconToken: getSectionIconToken(section.sectionId),
      summaryLabel: getSectionSummaryLabel(section),
      dirtyLabel: dirty[section.sectionId] ? '未保存' : null,
      updatedLabel: `已保存 ${formatDateTime(section.updatedAt)}`,
      storeFields: section.sectionId === 'store-profile' ? section.value : undefined,
      deliveryRows: section.sectionId === 'delivery-rules' ? section.value.tiers : undefined,
      membershipRows:
        section.sectionId === 'membership-tiers'
          ? section.value.tiers.map((tier) => ({
              ...tier,
              thresholdLabel: `累计消费门槛 ${tier.threshold}`
            }))
          : undefined,
      bannerFields: section.sectionId === 'banner' ? section.value : undefined,
      customNoticeFields: section.sectionId === 'custom-notice' ? section.value : undefined
    }))
  };
}

export function buildRuntimeConfigSectionDocument(
  sectionId: RuntimeConfigSectionId,
  value: RuntimeConfigSectionDraft,
  existing?: RuntimeConfigSectionDocument | null
): RuntimeConfigSectionDocument {
  return {
    sectionId,
    updatedAt: getNow(),
    updatedBy: existing?.updatedBy ?? createUpdatedBy(),
    value
  } as RuntimeConfigSectionDocument;
}
