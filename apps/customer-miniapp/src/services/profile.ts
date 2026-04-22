export type ProfileGender = 'unknown' | 'female' | 'male';

export interface CustomerProfile {
  avatarText: string;
  nickname: string;
  gender: ProfileGender;
  memberLevel: string;
  balance: number;
  totalSpent: number;
  birthday: string;
  birthdayLocked: boolean;
  contactPhoneMasked: string;
}

interface UpdateProfileInput {
  nickname?: string;
  gender?: ProfileGender;
  birthday?: string;
  birthdayLocked?: boolean;
  contactPhoneMasked?: string;
}

const initialProfile: CustomerProfile = {
  avatarText: '虾',
  nickname: '虾衣宠家长',
  gender: 'unknown',
  memberLevel: '普通会员',
  balance: 268,
  totalSpent: 1288,
  birthday: '',
  birthdayLocked: false,
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
    contactPhoneLabel: profile.contactPhoneMasked || '未绑定手机号'
  };
}
