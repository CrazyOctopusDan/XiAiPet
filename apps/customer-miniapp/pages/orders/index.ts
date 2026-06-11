declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import type {
  OrderCardViewModel,
  OrderPageInfo,
  OrderStatusGroup,
  OrderStatusTabViewModel
} from '../../src/services/orders';
import type { OrderRecord } from '@xiaipet/shared';

import { getOrderStatusTabs, getOrdersPageViewModel, queryMyOrders } from '../../src/services/orders';
import { consumePendingOrdersHighlight } from '../../src/services/tab-navigation';
export {};

interface OrdersPageData {
  isEmpty: boolean;
  emptyStateTitle: string;
  emptyStateBody: string;
  highlightedOrderId: string | null;
  activeStatusGroup: OrderStatusGroup;
  statusTabs: OrderStatusTabViewModel[];
  ordersByStatusGroup: Record<OrderStatusGroup, OrderRecord[]>;
  pageInfoByStatusGroup: Record<OrderStatusGroup, OrderPageInfo>;
  activePageInfo: OrderPageInfo;
  loadedStatusGroups: Record<OrderStatusGroup, boolean>;
  loadingMore: boolean;
  ordersHeaderTop: number;
  ordersHeaderHeight: number;
  ordersHeaderRightPadding: number;
  orderCards: OrderCardViewModel[];
}

interface OrdersPageInstance {
  data: OrdersPageData;
  setData(updates: Record<string, unknown>): void;
  refreshLayoutMetrics(): void;
  refreshOrders(): Promise<void>;
  loadMoreOrders(): Promise<void>;
  renderActiveOrders(): void;
  getTabBar?(): { setSelectedKey?: (key: string) => void } | undefined;
}

const ORDER_PAGE_LIMIT = 20;
const ORDER_STATUS_GROUPS: OrderStatusGroup[] = ['all', 'pending', 'active', 'completed'];

function createEmptyPageInfo(): OrderPageInfo {
  return {
    hasMore: false,
    nextCursor: null,
    limit: ORDER_PAGE_LIMIT
  };
}

function createOrdersByStatusGroup(): Record<OrderStatusGroup, OrderRecord[]> {
  return {
    all: [],
    pending: [],
    active: [],
    completed: []
  };
}

function createPageInfoByStatusGroup(): Record<OrderStatusGroup, OrderPageInfo> {
  return {
    all: createEmptyPageInfo(),
    pending: createEmptyPageInfo(),
    active: createEmptyPageInfo(),
    completed: createEmptyPageInfo()
  };
}

function createLoadedStatusGroups(): Record<OrderStatusGroup, boolean> {
  return {
    all: false,
    pending: false,
    active: false,
    completed: false
  };
}

function isOrderStatusGroup(value: unknown): value is OrderStatusGroup {
  return typeof value === 'string' && ORDER_STATUS_GROUPS.includes(value as OrderStatusGroup);
}

function pxToRpx(value: number, windowWidth: number) {
  return Math.ceil((value * 750) / windowWidth);
}

function resolveOrdersHeaderMetrics() {
  const fallback = {
    top: 96,
    height: 64,
    rightPadding: 212
  };
  const windowInfo = wx.getWindowInfo?.() ?? wx.getSystemInfoSync?.();
  const menuButton = wx.getMenuButtonBoundingClientRect?.();
  const windowWidth = Number(windowInfo?.windowWidth ?? 0);
  const menuTop = Number(menuButton?.top ?? 0);
  const menuHeight = Number(menuButton?.height ?? 0);
  const menuLeft = Number(menuButton?.left ?? 0);

  if (!windowWidth || !menuTop || !menuHeight || !menuLeft) {
    return fallback;
  }

  return {
    top: pxToRpx(menuTop, windowWidth),
    height: pxToRpx(menuHeight, windowWidth),
    rightPadding: pxToRpx(windowWidth - menuLeft + 12, windowWidth)
  };
}

Page({
  data: {
    isEmpty: true,
    emptyStateTitle: '还没有订单',
    emptyStateBody: '支付完成后的订单会出现在这里，先去挑些毛孩子的蛋糕吧。',
    highlightedOrderId: null,
    activeStatusGroup: 'all',
    statusTabs: getOrderStatusTabs([], 'all'),
    ordersByStatusGroup: createOrdersByStatusGroup(),
    pageInfoByStatusGroup: createPageInfoByStatusGroup(),
    activePageInfo: createEmptyPageInfo(),
    loadedStatusGroups: createLoadedStatusGroups(),
    loadingMore: false,
    ordersHeaderTop: 96,
    ordersHeaderHeight: 64,
    ordersHeaderRightPadding: 212,
    orderCards: []
  },
  onLoad(this: OrdersPageInstance, options?: { highlightOrderId?: string }) {
    this.setData({
      highlightedOrderId: options?.highlightOrderId ?? null
    });
  },
  async onShow(this: OrdersPageInstance) {
    this.getTabBar?.()?.setSelectedKey?.('orders');
    this.refreshLayoutMetrics();
    this.setData({
      highlightedOrderId: consumePendingOrdersHighlight()
    });
    await this.refreshOrders();
  },
  async onPullDownRefresh(this: OrdersPageInstance) {
    try {
      await this.refreshOrders();
    } finally {
      wx.stopPullDownRefresh?.();
    }
  },
  async onReachBottom(this: OrdersPageInstance) {
    await this.loadMoreOrders();
  },
  refreshLayoutMetrics(this: OrdersPageInstance) {
    const headerMetrics = resolveOrdersHeaderMetrics();

    this.setData({
      ordersHeaderTop: headerMetrics.top,
      ordersHeaderHeight: headerMetrics.height,
      ordersHeaderRightPadding: headerMetrics.rightPadding
    });
  },
  async refreshOrders(this: OrdersPageInstance) {
    const activeStatusGroup = this.data.activeStatusGroup;
    const page = await queryMyOrders({
      statusGroup: activeStatusGroup,
      limit: ORDER_PAGE_LIMIT
    });
    const ordersByStatusGroup = {
      ...this.data.ordersByStatusGroup,
      [activeStatusGroup]: page.orders
    };
    const pageInfoByStatusGroup = {
      ...this.data.pageInfoByStatusGroup,
      [activeStatusGroup]: page.pageInfo
    };
    const loadedStatusGroups = {
      ...this.data.loadedStatusGroups,
      [activeStatusGroup]: true
    };
    const view = getOrdersPageViewModel(page.orders, this.data.highlightedOrderId, activeStatusGroup);

    this.setData({
      isEmpty: view.isEmpty,
      highlightedOrderId: view.highlightedOrderId,
      statusTabs: getOrderStatusTabs([], activeStatusGroup),
      ordersByStatusGroup,
      pageInfoByStatusGroup,
      activePageInfo: page.pageInfo,
      loadedStatusGroups,
      orderCards: view.cards
    });
  },
  async loadMoreOrders(this: OrdersPageInstance) {
    const activeStatusGroup = this.data.activeStatusGroup;
    const pageInfo = this.data.pageInfoByStatusGroup[activeStatusGroup];

    if (this.data.loadingMore || !pageInfo.hasMore || !pageInfo.nextCursor) {
      return;
    }

    this.setData({ loadingMore: true });

    try {
      const page = await queryMyOrders({
        statusGroup: activeStatusGroup,
        limit: ORDER_PAGE_LIMIT,
        cursor: pageInfo.nextCursor
      });
      const ordersByStatusGroup = {
        ...this.data.ordersByStatusGroup,
        [activeStatusGroup]: [
          ...this.data.ordersByStatusGroup[activeStatusGroup],
          ...page.orders
        ]
      };
      const pageInfoByStatusGroup = {
        ...this.data.pageInfoByStatusGroup,
        [activeStatusGroup]: page.pageInfo
      };

      this.setData({
        ordersByStatusGroup,
        pageInfoByStatusGroup
      });
      this.renderActiveOrders();
    } finally {
      this.setData({ loadingMore: false });
    }
  },
  renderActiveOrders(this: OrdersPageInstance) {
    const activeStatusGroup = this.data.activeStatusGroup;
    const view = getOrdersPageViewModel(
      this.data.ordersByStatusGroup[activeStatusGroup],
      this.data.highlightedOrderId,
      activeStatusGroup
    );

    this.setData({
      isEmpty: view.isEmpty,
      highlightedOrderId: view.highlightedOrderId,
      statusTabs: getOrderStatusTabs([], activeStatusGroup),
      activePageInfo: this.data.pageInfoByStatusGroup[activeStatusGroup],
      orderCards: view.cards
    });
  },
  async handleStatusTabTap(this: OrdersPageInstance, event: { currentTarget?: { dataset?: { statusGroup?: OrderStatusGroup } } }) {
    const statusGroup = event.currentTarget?.dataset?.statusGroup;

    if (!isOrderStatusGroup(statusGroup) || statusGroup === this.data.activeStatusGroup) {
      return;
    }

    this.setData({
      activeStatusGroup: statusGroup,
      highlightedOrderId: null,
      statusTabs: getOrderStatusTabs([], statusGroup)
    });
    if (this.data.loadedStatusGroups[statusGroup]) {
      this.renderActiveOrders();
      return;
    }

    await this.refreshOrders();
  },
  handleHomeTap() {
    wx.redirectTo({
      url: '/pages/home/index'
    });
  },
  handleOrdersTap() {
    return undefined;
  },
  handleProfileTap() {
    wx.redirectTo({
      url: '/pages/profile/index'
    });
  },
  handleGoCatalog() {
    wx.navigateTo({
      url: '/pages/catalog/index'
    });
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
