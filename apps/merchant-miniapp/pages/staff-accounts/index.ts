declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import type { MerchantSessionAccount } from '../../src/services/api-client';
import {
  createStaffAccount,
  disableStaffAccount,
  listMerchantAccounts,
  resetStaffPassword
} from '../../src/services/merchant-accounts';

interface StaffAccountsPageInstance {
  data: {
    accounts: MerchantSessionAccount[];
    username: string;
    loading: boolean;
    statusText: string;
  };
  setData(data: Record<string, unknown>): void;
  refreshAccounts(): Promise<void>;
}

Page({
  data: {
    accounts: [],
    username: '',
    loading: false,
    statusText: '员工初始密码统一为 staff'
  },
  async onShow(this: StaffAccountsPageInstance) {
    await this.refreshAccounts();
  },
  handleUsernameInput(this: StaffAccountsPageInstance, event: { detail?: { value?: string } }) {
    this.setData({ username: event.detail?.value ?? '' });
  },
  async refreshAccounts(this: StaffAccountsPageInstance) {
    this.setData({ loading: true });
    try {
      const accounts = await listMerchantAccounts();
      this.setData({
        accounts,
        loading: false,
        statusText: '员工初始密码统一为 staff'
      });
    } catch (error) {
      this.setData({
        loading: false,
        statusText: error instanceof Error && error.message ? error.message : '账号列表加载失败'
      });
    }
  },
  async handleCreateStaff(this: StaffAccountsPageInstance) {
    const username = this.data.username.trim();
    if (!username) {
      wx.showToast({ title: '请输入员工账号', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    try {
      await createStaffAccount(username);
      this.setData({
        username: '',
        statusText: `已创建 ${username}，初始密码 staff`
      });
      await this.refreshAccounts();
    } catch (error) {
      this.setData({
        loading: false,
        statusText: error instanceof Error && error.message ? error.message : '创建失败'
      });
    }
  },
  async handleDisableStaff(this: StaffAccountsPageInstance, event: { currentTarget?: { dataset?: { id?: string } } }) {
    const accountId = event.currentTarget?.dataset?.id;
    if (!accountId) {
      return;
    }

    await disableStaffAccount(accountId);
    await this.refreshAccounts();
  },
  async handleResetPassword(this: StaffAccountsPageInstance, event: { currentTarget?: { dataset?: { id?: string } } }) {
    const accountId = event.currentTarget?.dataset?.id;
    if (!accountId) {
      return;
    }

    await resetStaffPassword(accountId);
    this.setData({ statusText: '密码已重置为 staff' });
    await this.refreshAccounts();
  }
});
