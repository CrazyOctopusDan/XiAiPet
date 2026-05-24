export type ProfileGender = 'unknown' | 'female' | 'male';

import { customerApiRequest, type CustomerApiRequestOptions } from './api-client';

export interface CustomerProfile {
  avatarText: string;
  nickname: string;
  gender: ProfileGender;
  memberLevel: string;
  balance: number;
  totalSpent: number;
  birthday: string;
  birthdayLocked: boolean;
  contactPhone: string;
  contactPhoneMasked: string;
}

interface UpdateProfileInput {
  nickname?: string;
  gender?: ProfileGender;
  birthday?: string;
  birthdayLocked?: boolean;
  contactPhone?: string;
  contactPhoneMasked?: string;
}

type ProfileApiRequester = <T>(path: string, options?: CustomerApiRequestOptions) => Promise<T>;

interface SaveProfileResponse {
  ok?: boolean;
  profile?: UpdateProfileInput;
}

interface HydrateProfileResponse {
  ok?: boolean;
  profile?: Partial<CustomerProfile>;
}

const initialProfile: CustomerProfile = {
  avatarText: '喜',
  nickname: '喜爱宠家长',
  gender: 'unknown',
  memberLevel: '普通会员',
  balance: 0,
  totalSpent: 0,
  birthday: '',
  birthdayLocked: false,
  contactPhone: '',
  contactPhoneMasked: ''
};

let profile: CustomerProfile = { ...initialProfile };

export function resetProfile() {
  profile = { ...initialProfile };
}

export function getProfile() {
  return { ...profile };
}

export function updateProfile(input: UpdateProfileInput) {
  profile = {
    ...profile,
    ...input
  };

  return getProfile();
}

export async function saveProfile(
  input: UpdateProfileInput,
  request: ProfileApiRequester = customerApiRequest
) {
  const response = await request<SaveProfileResponse>('/api/v1/customer/profile', {
    method: 'PUT',
    auth: 'customer',
    body: {
      profile: input
    }
  });

  return updateProfile(response.profile ?? input);
}

export async function hydrateProfile(request: ProfileApiRequester = customerApiRequest) {
  const response = await request<HydrateProfileResponse>('/api/v1/customer/profile', {
    method: 'GET',
    auth: 'customer'
  });

  return updateProfile(response.profile ?? {});
}

export function setBirthday(birthday: string) {
  if (profile.birthdayLocked) {
    return {
      ok: false as const,
      reason: 'birthday_locked' as const
    };
  }

  profile = {
    ...profile,
    birthday,
    birthdayLocked: true
  };

  return {
    ok: true as const,
    profile: getProfile()
  };
}

export function getProfileSummary() {
  return {
    avatarText: profile.avatarText,
    nickname: profile.nickname,
    memberLevel: profile.memberLevel,
    balance: profile.balance,
    totalSpent: profile.totalSpent,
    birthdayLabel: profile.birthday || '未设置生日',
    contactPhoneLabel: profile.contactPhone || profile.contactPhoneMasked || '未绑定手机号'
  };
}

export function hasBoundPhone(input: Pick<CustomerProfile, 'contactPhoneMasked'> = profile) {
  return Boolean(input.contactPhoneMasked.trim());
}

export function getPhoneBindingRedirectUrl(redirectUrl?: string) {
  const baseUrl = '/pages/contact-bind/index';
  return redirectUrl ? `${baseUrl}?redirect=${encodeURIComponent(redirectUrl)}` : baseUrl;
}
