import { ApiError } from '../../lib/errors';
import { createRuntimeConfigRepository } from './repository';
import type { MerchantContext } from '../auth/types';

const RUNTIME_CONFIG_SECTION_IDS = [
  'store-profile',
  'delivery-rules',
  'membership-tiers',
  'banner',
  'custom-notice'
] as const;

const CUSTOMER_PUBLIC_SECTION_IDS = [...RUNTIME_CONFIG_SECTION_IDS];

function parseSectionKeys(input?: string | string[]): string[] | undefined {
  if (!input) {
    return undefined;
  }
  const raw = Array.isArray(input) ? input.join(',') : input;
  return raw.split(',').map((item) => item.trim()).filter(Boolean);
}

export function createRuntimeConfigService(repository = createRuntimeConfigRepository()) {
  return {
    parseSectionKeys,

    async readCustomerRuntimeConfig(query: { sectionKeys?: string[] } = {}) {
      const requested = query.sectionKeys?.filter((key) => CUSTOMER_PUBLIC_SECTION_IDS.includes(key as (typeof CUSTOMER_PUBLIC_SECTION_IDS)[number]));
      const sections = await repository.listSections(requested);
      return { ok: true as const, sections };
    },

    async getRuntimeConfigSections(_merchantContext: MerchantContext) {
      const sections = await repository.listSections();
      return { ok: true as const, sections };
    },

    async readMerchantRuntimeConfig(_merchantContext: MerchantContext, query: { sectionKeys?: string[] } = {}) {
      const sections = await repository.listSections(query.sectionKeys);
      return { ok: true as const, sections };
    },

    async upsertRuntimeConfigSection(
      merchantContext: MerchantContext,
      sectionKey: string,
      payload: unknown
    ) {
      if (!RUNTIME_CONFIG_SECTION_IDS.includes(sectionKey as (typeof RUNTIME_CONFIG_SECTION_IDS)[number])) {
        throw new ApiError('INVALID_RUNTIME_CONFIG_SECTION', 'Unknown runtime config section', 400);
      }
      if (!payload || typeof payload !== 'object' || !('value' in payload)) {
        throw new ApiError('INVALID_RUNTIME_CONFIG', 'Invalid runtime config payload', 400);
      }
      const section = await repository.upsertSection({
        sectionId: sectionKey,
        value: (payload as { value: unknown }).value,
        updatedBy: merchantContext.openid
      });
      return { ok: true as const, section };
    }
  };
}
