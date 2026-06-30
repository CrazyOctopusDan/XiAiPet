declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import { getMerchantSession, merchantLogout } from '../../src/services/api-client';
import { enableNewOrderSubscription } from '../../src/services/notifications';
import { getMerchantWorkspaceCards, type MerchantWorkspaceCard } from '../../src/services/workspace';

interface WorkspacePageData {
  cards: MerchantWorkspaceCard[];
  accountName: string;
  notificationSubmitting: boolean;
}

interface WorkspacePageInstance {
  data: WorkspacePageData;
  setData(updates: Record<string, unknown>): void;
}

Page({
  data: {
    cards: getMerchantWorkspaceCards(),
    accountName: '商户账号',
    notificationSubmitting: false
  },
  onShow(this: WorkspacePageInstance) {
    const account = getMerchantSession()?.account;
    const role = account?.role ?? 'admin';
    this.setData({
      cards: getMerchantWorkspaceCards(role),
      accountName: account?.username ? `${account.username}` : '商户账号'
    });
  },
  handleActionTap(event: { currentTarget?: { dataset?: { url?: string } } }) {
    const url = event.currentTarget?.dataset?.url;

    if (!url) {
      return;
    }

    wx.navigateTo({
      url
    });
  },
  async handleEnableNotificationTap(this: WorkspacePageInstance) {
    if (this.data.notificationSubmitting) {
      return;
    }

    this.setData({ notificationSubmitting: true });
    try {
      const result = await enableNewOrderSubscription();
      wx.showToast({
        title: result.ok ? '新订单提醒已开启' : '未开启新订单提醒',
        icon: 'none'
      });
    } catch (error) {
      console.error('enable merchant notification failed', error);
      wx.showToast({
        title: '开启提醒失败',
        icon: 'none'
      });
    } finally {
      this.setData({ notificationSubmitting: false });
    }
  },
  handleLogoutTap() {
    merchantLogout();
    wx.reLaunch({
      url: '/pages/access-gate/index'
    });
  }
});
