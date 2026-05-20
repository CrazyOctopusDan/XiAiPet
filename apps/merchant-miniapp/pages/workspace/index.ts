declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import { getMerchantSession, merchantLogout } from '../../src/services/api-client';
import { getMerchantWorkspaceCards, type MerchantWorkspaceCard } from '../../src/services/workspace';

interface WorkspacePageData {
  cards: MerchantWorkspaceCard[];
  accountName: string;
}

interface WorkspacePageInstance {
  data: WorkspacePageData;
  setData(updates: Record<string, unknown>): void;
}

Page({
  data: {
    cards: getMerchantWorkspaceCards(),
    accountName: '商户账号'
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
  handleLogoutTap() {
    merchantLogout();
    wx.reLaunch({
      url: '/pages/access-gate/index'
    });
  }
});
