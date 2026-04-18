declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import type { MerchantUserSearchField, MerchantUserSearchListItem } from '@xiaipet/shared/types/user-admin';

import { getUsersPageViewModel, queryMerchantUsers } from '../../src/services/user-admin';

interface UsersPageData {
  loading: boolean;
  isEmpty: boolean;
  draftQuery: string;
  searchField: MerchantUserSearchField;
  cards: ReturnType<typeof getUsersPageViewModel>['cards'];
}

interface UsersPageInstance {
  data: UsersPageData;
  lastUsers: MerchantUserSearchListItem[];
  setData(updates: Record<string, unknown>): void;
  refreshUsers(): Promise<void>;
}

Page({
  data: {
    loading: false,
    isEmpty: true,
    draftQuery: '',
    searchField: 'phone',
    cards: []
  },
  lastUsers: [],
  handleQueryInput(this: UsersPageInstance, event: { detail?: { value?: string } }) {
    this.setData({
      draftQuery: event.detail?.value ?? ''
    });
  },
  handleSearchFieldTap(
    this: UsersPageInstance,
    event: { currentTarget?: { dataset?: { field?: MerchantUserSearchField } } }
  ) {
    const field = event.currentTarget?.dataset?.field ?? 'phone';
    this.setData({
      searchField: field
    });
  },
  async handleSearchSubmit(this: UsersPageInstance) {
    if (!this.data.draftQuery.trim()) {
      wx.showToast({
        title: '请输入搜索关键词',
        icon: 'none'
      });
      return;
    }

    await this.refreshUsers();
  },
  async refreshUsers(this: UsersPageInstance) {
    this.setData({ loading: true });

    const users = await queryMerchantUsers({
      query: this.data.draftQuery.trim(),
      searchField: this.data.searchField
    });
    this.lastUsers = users;
    const view = getUsersPageViewModel(users);

    this.setData({
      loading: false,
      isEmpty: view.isEmpty,
      cards: view.cards
    });
  },
  handleOpenUser(this: UsersPageInstance, event: { currentTarget?: { dataset?: { openid?: string } } }) {
    const openid = event.currentTarget?.dataset?.openid;
    const user = this.lastUsers.find((item) => item.openid === openid);

    if (!user) {
      return;
    }

    wx.setStorageSync('merchant-selected-user', user);
    wx.navigateTo({
      url: `/pages/user-detail/index?openid=${user.openid}`
    });
  }
});
