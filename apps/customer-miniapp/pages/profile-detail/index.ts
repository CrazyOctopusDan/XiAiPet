declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import {
  getProfile,
  getPhoneBindingRedirectUrl,
  hydrateProfile,
  saveProfile,
  setBirthday,
  updateProfile,
  type CustomerProfile,
  type ProfileGender
} from '../../src/services/profile';

interface ProfileDetailPageData {
  profile: CustomerProfile;
  genderOptions: Array<{ value: ProfileGender; label: string }>;
  redirectUrl: string;
}

interface ProfileDetailPageInstance {
  data: ProfileDetailPageData;
  setData(data: Record<string, unknown>): void;
  refreshProfile(): void;
  onShow(): Promise<void>;
}

Page({
  data: {
    profile: getProfile(),
    genderOptions: [
      { value: 'unknown', label: '暂不设置' },
      { value: 'female', label: '女孩' },
      { value: 'male', label: '男孩' }
    ],
    redirectUrl: ''
  },
  onLoad(this: ProfileDetailPageInstance, options?: { redirect?: string }) {
    this.setData({
      redirectUrl: resolveRedirectUrl(options?.redirect)
    });
  },
  async onShow(this: ProfileDetailPageInstance) {
    try {
      await hydrateProfile();
    } catch {
      // The form can still use the latest local profile if the network is unavailable.
    }
    this.refreshProfile();
  },
  refreshProfile(this: ProfileDetailPageInstance) {
    this.setData({
      profile: getProfile()
    });
  },
  handleNicknameInput(this: ProfileDetailPageInstance, event: { detail?: { value?: string } }) {
    this.setData({
      profile: {
        ...this.data.profile,
        nickname: event.detail?.value ?? ''
      }
    });
  },
  handleGenderTap(this: ProfileDetailPageInstance, event: { currentTarget?: { dataset?: { gender?: ProfileGender } } }) {
    const gender = event.currentTarget?.dataset?.gender;

    if (!gender) {
      return;
    }

    this.setData({
      profile: {
        ...this.data.profile,
        gender
      }
    });
  },
  handleBirthdayChange(this: ProfileDetailPageInstance, event: { detail?: { value?: string } }) {
    const birthday = event.detail?.value ?? '';

    if (!birthday || this.data.profile.birthdayLocked) {
      return;
    }

    this.setData({
      profile: {
        ...this.data.profile,
        birthday
      }
    });
  },
  async handleSave(this: ProfileDetailPageInstance) {
    const birthday = this.data.profile.birthday.trim();

    updateProfile({
      nickname: this.data.profile.nickname.trim() || '虾衣宠家长',
      gender: this.data.profile.gender
    });

    if (!getProfile().birthdayLocked && birthday) {
      const result = setBirthday(birthday);

      if (!result.ok) {
        wx.showToast({ title: '生日仅可设置一次', icon: 'none' });
        this.refreshProfile();
        return;
      }
    }

    const nextProfile = getProfile();
    this.refreshProfile();

    try {
      await saveProfile({
        nickname: nextProfile.nickname,
        gender: nextProfile.gender,
        birthday: nextProfile.birthday,
        birthdayLocked: nextProfile.birthdayLocked,
        contactPhoneMasked: nextProfile.contactPhoneMasked
      });
      wx.showToast({ title: '资料已同步', icon: 'none' });
    } catch {
      wx.showToast({ title: '资料已保存本地，稍后同步', icon: 'none' });
    }

    this.refreshProfile();
  },
  handleContactTap(this: ProfileDetailPageInstance) {
    wx.navigateTo({
      url: getPhoneBindingRedirectUrl(this.data.redirectUrl || '/pages/profile-detail/index')
    });
  }
});

function resolveRedirectUrl(value?: string) {
  if (!value) {
    return '';
  }

  try {
    const decoded = decodeURIComponent(value);
    return decoded.startsWith('/pages/') ? decoded : '';
  } catch {
    return '';
  }
}
