declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import { getMerchantSession } from '../../src/services/api-client';
import { getMerchantWorkspaceCards, type MerchantWorkspaceCard } from '../../src/services/workspace';

interface WorkspacePageData {
  cards: MerchantWorkspaceCard[];
}

interface WorkspacePageInstance {
  data: WorkspacePageData;
  setData(updates: Record<string, unknown>): void;
}

Page({
  data: {
    cards: getMerchantWorkspaceCards()
  },
  onShow(this: WorkspacePageInstance) {
    const role = getMerchantSession()?.account?.role ?? 'admin';
    this.setData({
      cards: getMerchantWorkspaceCards(role)
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
  }
});
