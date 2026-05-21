declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import type { OrderFulfillmentMode } from '@xiaipet/shared';

import type { MerchantOrderGroupSummaryViewModel, MerchantOrderGroupViewModel } from '../../src/services/orders';
import { getMerchantOrderGroupSummary, getMerchantOrdersPageViewModel, queryMerchantOrders } from '../../src/services/orders';

type FulfillmentFilter = 'all' | OrderFulfillmentMode;
type OrderScope = 'active' | 'history';

interface FilterOption {
  value: FulfillmentFilter;
  label: string;
}

interface OrdersPageData {
  loading: boolean;
  isEmpty: boolean;
  draftKeyword: string;
  keyword: string;
  scope: OrderScope;
  pageTitle: string;
  pageSubtitle: string;
  summaryOrderLabel: string;
  activeMode: FulfillmentFilter;
  filters: FilterOption[];
  groups: MerchantOrderGroupViewModel[];
  summary: MerchantOrderGroupSummaryViewModel;
  emptyTitle: string;
  emptyBody: string;
}

interface OrdersPageInstance {
  data: OrdersPageData;
  setData(updates: Record<string, unknown>): void;
  refreshOrders(): Promise<void>;
}

const FILTERS: FilterOption[] = [
  { value: 'all', label: '全部' },
  { value: 'delivery', label: '配送' },
  { value: 'pickup', label: '自取' },
  { value: 'express', label: '快递' }
];

function matchesMode(group: MerchantOrderGroupViewModel, mode: FulfillmentFilter) {
  if (mode === 'all') {
    return true;
  }

  return group.orders.some((item) => {
    if (mode === 'delivery') {
      return item.fulfillmentLabel === '配送到家';
    }

    if (mode === 'pickup') {
      return item.fulfillmentLabel === '到店自取';
    }

    return item.fulfillmentLabel === '快递发货';
  });
}

function filterGroups(groups: MerchantOrderGroupViewModel[], keyword: string, mode: FulfillmentFilter) {
  const normalizedKeyword = keyword.trim();

  return groups
    .filter((group) => matchesMode(group, mode))
    .map((group) => ({
      ...group,
      orders: group.orders.filter((order) => {
        if (!normalizedKeyword) {
          return true;
        }

        return [
          order.orderIdLabel,
          order.itemSummary,
          order.customerLabel,
          order.scheduleLabel,
          order.statusLabel,
          order.secondaryBadgeLabel ?? ''
        ].some((value) => value.includes(normalizedKeyword));
      })
    }))
    .filter((group) => group.orders.length > 0)
    .map((group) => ({
      ...group,
      countLabel: `${group.orders.length} 单`
    }));
}

Page({
  data: {
    loading: true,
    isEmpty: true,
    draftKeyword: '',
    keyword: '',
    scope: 'active',
    pageTitle: '订单管理',
    pageSubtitle: '按履约进度处理未完成订单',
    summaryOrderLabel: '当前订单',
    activeMode: 'all',
    filters: FILTERS,
    groups: [],
    summary: {
      totalOrders: 0,
      activeGroups: 0,
      pendingPayment: 0
    },
    emptyTitle: '还没有订单',
    emptyBody: '新订单会按履约进度分组显示在这里。'
  },
  onLoad(this: OrdersPageInstance, options?: { scope?: string }) {
    const scope: OrderScope = options?.scope === 'history' ? 'history' : 'active';
    this.setData({
      scope,
      pageTitle: scope === 'history' ? '历史订单' : '订单管理',
      pageSubtitle: scope === 'history' ? '查看已完成订单记录' : '按履约进度处理未完成订单',
      summaryOrderLabel: scope === 'history' ? '历史订单' : '当前订单',
      emptyTitle: scope === 'history' ? '暂无历史订单' : '还没有订单',
      emptyBody: scope === 'history' ? '已完成的订单会显示在这里。' : '新订单会按履约进度分组显示在这里。'
    });
  },
  async onShow(this: OrdersPageInstance) {
    await this.refreshOrders();
  },
  async onPullDownRefresh(this: OrdersPageInstance) {
    await this.refreshOrders();
    wx.stopPullDownRefresh?.();
  },
  async refreshOrders(this: OrdersPageInstance) {
    this.setData({ loading: true });

    try {
      const groups = getMerchantOrdersPageViewModel(
        await queryMerchantOrders({
          scope: this.data.scope,
          fulfillmentMode: this.data.activeMode
        })
      ).groups;
      const filteredGroups = filterGroups(groups, this.data.keyword, this.data.activeMode);
      const hasFilters = Boolean(this.data.keyword.trim()) || this.data.activeMode !== 'all';
      const baseEmptyTitle = this.data.scope === 'history' ? '暂无历史订单' : '还没有订单';
      const baseEmptyBody =
        this.data.scope === 'history' ? '已完成的订单会显示在这里。' : '新订单会按履约进度分组显示在这里。';

      this.setData({
        loading: false,
        isEmpty: filteredGroups.length === 0,
        groups: filteredGroups,
        summary: getMerchantOrderGroupSummary(filteredGroups),
        emptyTitle: hasFilters ? '没有匹配的订单' : baseEmptyTitle,
        emptyBody: hasFilters ? '换个关键词或履约方式再试一次。' : baseEmptyBody
      });
    } catch {
      this.setData({ loading: false });
      wx.showToast({
        title: '订单加载失败',
        icon: 'none'
      });
    }
  },
  handleKeywordInput(this: OrdersPageInstance, event: { detail?: { value?: string } }) {
    this.setData({
      draftKeyword: event.detail?.value ?? ''
    });
  },
  handleKeywordConfirm(this: OrdersPageInstance) {
    this.setData({
      keyword: this.data.draftKeyword.trim()
    });
    void this.refreshOrders();
  },
  handleClearSearch(this: OrdersPageInstance) {
    this.setData({
      draftKeyword: '',
      keyword: ''
    });
    void this.refreshOrders();
  },
  handleFilterTap(this: OrdersPageInstance, event: { currentTarget?: { dataset?: { value?: FulfillmentFilter } } }) {
    const value = event.currentTarget?.dataset?.value ?? 'all';

    this.setData({
      activeMode: value
    });
    void this.refreshOrders();
  },
  handleOrderTap(event: { currentTarget?: { dataset?: { orderId?: string } } }) {
    const orderId = event.currentTarget?.dataset?.orderId;

    if (!orderId) {
      return;
    }

    wx.navigateTo({
      url: `/pages/order-detail/index?orderId=${orderId}`
    });
  }
});
