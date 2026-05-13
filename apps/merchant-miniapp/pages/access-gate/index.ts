declare function Page(options: Record<string, unknown>): void;

import { MerchantApiError, merchantLogin } from '../../src/services/api-client';

interface AccessGatePageInstance {
  data?: {
    username?: string;
    password?: string;
  };
  setData(data: Record<string, unknown>): void;
}

function getAccessErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === 'object') {
    const candidate = error as Record<string, unknown>;
    const errMsg = candidate.errMsg ?? candidate.errorMessage ?? candidate.message;

    if (typeof errMsg === 'string' && errMsg) {
      return errMsg;
    }
  }

  return '请下拉重试';
}

Page({
  data: {
    username: 'admin',
    password: '',
    statusText: '请输入商户账号和密码',
    accessResult: 'unknown',
    submitting: false
  },
  handleUsernameInput(this: AccessGatePageInstance, event: { detail?: { value?: string } }) {
    this.setData({ username: event.detail?.value ?? '' });
  },
  handlePasswordInput(this: AccessGatePageInstance, event: { detail?: { value?: string } }) {
    this.setData({ password: event.detail?.value ?? '' });
  },
  async handleLoginTap(this: AccessGatePageInstance) {
    const username = this.data?.username?.trim() ?? '';
    const password = this.data?.password ?? '';

    if (!username || !password) {
      this.setData({
        accessResult: 'denied',
        statusText: '请输入账号和密码'
      });
      return;
    }

    this.setData({ statusText: '正在登录商户账号', submitting: true });

    try {
      const session = await merchantLogin({ username, password });
      const mustChangePassword = Boolean(session.account?.mustChangePassword);
      this.setData({
        accessResult: 'allowed',
        statusText: mustChangePassword ? '首次登录需要修改密码' : '登录成功',
        submitting: false
      });

      wx.redirectTo({
        url: mustChangePassword ? '/pages/password-change/index' : '/pages/workspace/index'
      });
    } catch (error) {
      console.error('merchant login failed', error);
      const message =
        error instanceof MerchantApiError && error.message
          ? error.message
          : getAccessErrorMessage(error);
      this.setData({
        accessResult: 'denied',
        statusText: `登录失败：${message}`,
        submitting: false
      });
    }
  }
});
