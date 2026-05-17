import { ApiError } from '../../lib/errors';
import { createUserRepository } from './repository';

interface PhoneBindingInput {
  phoneNumber: string;
  countryCode: string;
  source: 'wechat' | 'manual';
}

interface ProfileUpdateInput {
  nickname?: string;
  gender?: 'unknown' | 'female' | 'male';
  birthday?: string;
  birthdayLocked?: boolean;
  contactPhoneMasked?: string;
  avatarText?: string;
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

function isProfileUpdateInput(value: unknown): value is ProfileUpdateInput {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    (candidate.nickname === undefined || typeof candidate.nickname === 'string') &&
    (
      candidate.gender === undefined ||
      candidate.gender === 'unknown' ||
      candidate.gender === 'female' ||
      candidate.gender === 'male'
    ) &&
    (candidate.birthday === undefined || typeof candidate.birthday === 'string') &&
    (candidate.birthdayLocked === undefined || typeof candidate.birthdayLocked === 'boolean') &&
    (candidate.contactPhoneMasked === undefined || typeof candidate.contactPhoneMasked === 'string') &&
    (candidate.avatarText === undefined || typeof candidate.avatarText === 'string')
  );
}

function getProfilePayload(payload: unknown) {
  return typeof payload === 'object' && payload && 'profile' in payload
    ? (payload as { profile?: unknown }).profile
    : payload;
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

    async getProfile(openid: string) {
      const profile = await userRepository.getCustomerProfile(openid);
      return {
        ok: true as const,
        openid,
        profile
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

    async updateProfile(openid: string, payload: unknown) {
      const input = getProfilePayload(payload);

      if (!isProfileUpdateInput(input)) {
        throw new ApiError('INVALID_PROFILE', 'Invalid profile payload', 400);
      }

      await userRepository.updateProfile(openid, input);

      return {
        ok: true as const,
        openid,
        profile: input
      };
    }
  };
}
