declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import { changeMerchantPassword, getMerchantSession } from '../../src/services/api-client';

interface PasswordChangePageInstance {
  data?: {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  };
  setData(data: Record<string, unknown>): void;
}

Page({
  data: {
    username: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    statusText: '首次登录必须修改密码',
    submitting: false
  },
  onLoad(this: PasswordChangePageInstance) {
    const session = getMerchantSession();
    this.setData({
      username: session?.account?.username ?? ''
    });
  },
  handleCurrentInput(this: PasswordChangePageInstance, event: { detail?: { value?: string } }) {
    this.setData({ currentPassword: event.detail?.value ?? '' });
  },
  handleNewInput(this: PasswordChangePageInstance, event: { detail?: { value?: string } }) {
    this.setData({ newPassword: event.detail?.value ?? '' });
  },
  handleConfirmInput(this: PasswordChangePageInstance, event: { detail?: { value?: string } }) {
    this.setData({ confirmPassword: event.detail?.value ?? '' });
  },
  async handleSubmit(this: PasswordChangePageInstance) {
    const currentPassword = this.data?.currentPassword ?? '';
    const newPassword = this.data?.newPassword ?? '';
    const confirmPassword = this.data?.confirmPassword ?? '';

    if (!currentPassword || !newPassword) {
      this.setData({ statusText: '请输入当前密码和新密码' });
      return;
    }
    if (newPassword.length < 4) {
      this.setData({ statusText: '新密码至少 4 位' });
      return;
    }
    if (newPassword !== confirmPassword) {
      this.setData({ statusText: '两次输入的新密码不一致' });
      return;
    }

    this.setData({ submitting: true, statusText: '正在修改密码' });
    try {
      await changeMerchantPassword({ currentPassword, newPassword });
      this.setData({ submitting: false, statusText: '密码已修改' });
      wx.redirectTo({
        url: '/pages/workspace/index'
      });
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : '请稍后重试';
      this.setData({
        submitting: false,
        statusText: `修改失败：${message}`
      });
    }
  }
});
