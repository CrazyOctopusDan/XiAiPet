declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import {
  getProfile,
  setBirthday,
  updateProfile,
  type CustomerProfile,
  type ProfileGender
} from '../../src/services/profile';

interface ProfileDetailPageData {
  profile: CustomerProfile;
  genderOptions: Array<{ value: ProfileGender; label: string }>;
}

interface ProfileDetailPageInstance {
  data: ProfileDetailPageData;
  setData(data: Record<string, unknown>): void;
  refreshProfile(): void;
}

Page({
  data: {
    profile: getProfile(),
    genderOptions: [
      { value: 'unknown', label: '暂不设置' },
      { value: 'female', label: '女孩' },
      { value: 'male', label: '男孩' }
    ]
  },
  onShow(this: ProfileDetailPageInstance) {
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

    if (!birthday) {
      return;
    }

    const result = setBirthday(birthday);

    if (!result.ok) {
      wx.showToast({ title: '生日仅可设置一次', icon: 'none' });
      return;
    }

    this.refreshProfile();
    wx.showToast({ title: '生日已锁定', icon: 'none' });
  },
  handleSave(this: ProfileDetailPageInstance) {
    updateProfile({
      nickname: this.data.profile.nickname.trim() || '虾衣宠家长',
      gender: this.data.profile.gender
    });
    this.refreshProfile();
    wx.showToast({ title: '资料已更新', icon: 'none' });
  },
  handleContactTap() {
    wx.navigateTo({
      url: '/pages/contact-bind/index?source=profile-detail'
    });
  }
});
