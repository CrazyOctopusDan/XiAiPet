import { ApiError } from '../../lib/errors';
import { createUserRepository } from './repository';
import type { MerchantAccessResult } from '../auth/types';

interface PhoneBindingInput {
  phoneNumber: string;
  countryCode: string;
  source: 'wechat' | 'manual';
}

function isPhoneBindingInput(value: unknown): value is PhoneBindingInput {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.phoneNumber === 'string' &&
    candidate.phoneNumber.length > 0 &&
    typeof candidate.countryCode === 'string' &&
    candidate.countryCode.length > 0 &&
    (candidate.source === 'wechat' || candidate.source === 'manual')
  );
}

function normalizePhoneBinding(input: PhoneBindingInput) {
  const digits = input.phoneNumber.replace(/\s+/g, '');
  const visibleHead = digits.slice(0, 3);
  const visibleTail = digits.slice(-4);
  return {
    phoneNumber: digits,
    countryCode: input.countryCode.startsWith('+') ? input.countryCode : `+${input.countryCode}`,
    maskedPhone: `${visibleHead}****${visibleTail}`
  };
}

export function createIdentityService(userRepository = createUserRepository()) {
  return {
    async bootstrapUser(openid: string) {
      const existing = await userRepository.getByOpenid(openid);
      const user = await userRepository.bootstrap(openid);
      return {
        ok: true as const,
        operation: existing ? 'updated' : 'created',
        user,
        skippedCollections: []
      };
    },

    async bindPhone(openid: string, payload: unknown) {
      const input = typeof payload === 'object' && payload && 'payload' in payload
        ? (payload as { payload?: unknown }).payload
        : payload;

      if (!isPhoneBindingInput(input)) {
        throw new ApiError('INVALID_PHONE_BINDING', 'Invalid phone binding payload', 400);
      }

      const normalized = normalizePhoneBinding(input);
      await userRepository.bindPhone(openid, {
        maskedPhone: normalized.maskedPhone,
        countryCode: normalized.countryCode
      });

      return {
        ok: true as const,
        openid,
        update: {
          phoneBindingState: 'bound',
          contactPhoneMasked: normalized.maskedPhone,
          contactPhoneCountryCode: normalized.countryCode
        }
      };
    },

    async assertMerchantAccess(openid: string): Promise<MerchantAccessResult> {
      const merchantUser = await userRepository.getMerchantByOpenid(openid);
      if (!merchantUser || !merchantUser.enabled) {
        return {
          ok: true,
          status: 'denied',
          allowed: false,
          reason: '当前账号还未加入 merchant_users 白名单'
        };
      }

      return {
        ok: true,
        status: 'allowed',
        allowed: true,
        merchant: {
          merchantId: merchantUser.merchantId,
          storeName: merchantUser.storeName
        },
        merchantUser
      };
    }
  };
}
