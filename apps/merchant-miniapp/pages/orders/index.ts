declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import type { OrderFulfillmentMode } from '@xiaipet/shared';

import type { MerchantOrderGroupViewModel } from '../../src/services/orders';
import { getMerchantOrdersPageViewModel, queryMerchantOrders } from '../../src/services/orders';

type FulfillmentFilter = 'all' | OrderFulfillmentMode;

interface FilterOption {
  value: FulfillmentFilter;
  label: string;
}

interface OrdersPageData {
  loading: boolean;
  isEmpty: boolean;
  draftKeyword: string;
  keyword: string;
  activeMode: FulfillmentFilter;
  filters: FilterOption[];
  groups: MerchantOrderGroupViewModel[];
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
    activeMode: 'all',
    filters: FILTERS,
    groups: [],
    emptyTitle: '还没有订单',
    emptyBody: '新订单会按履约进度分组显示在这里。'
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

    const groups = getMerchantOrdersPageViewModel(await queryMerchantOrders()).groups;
    const filteredGroups = filterGroups(groups, this.data.keyword, this.data.activeMode);
    const hasFilters = Boolean(this.data.keyword.trim()) || this.data.activeMode !== 'all';

    this.setData({
      loading: false,
      isEmpty: filteredGroups.length === 0,
      groups: filteredGroups,
      emptyTitle: hasFilters ? '没有匹配的订单' : '还没有订单',
      emptyBody: hasFilters ? '换个关键词或履约方式再试一次。' : '新订单会按履约进度分组显示在这里。'
    });
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
