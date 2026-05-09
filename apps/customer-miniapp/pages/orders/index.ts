declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import type { OrderCardViewModel } from '../../src/services/orders';

import { getOrdersPageViewModel, queryMyOrders } from '../../src/services/orders';
import { consumePendingOrdersHighlight } from '../../src/services/tab-navigation';
export {};

interface OrdersPageData {
  isEmpty: boolean;
  emptyStateTitle: string;
  emptyStateBody: string;
  highlightedOrderId: string | null;
  ordersHeaderTop: number;
  ordersHeaderHeight: number;
  ordersHeaderRightPadding: number;
  orderCards: OrderCardViewModel[];
}

interface OrdersPageInstance {
  data: OrdersPageData;
  setData(updates: Record<string, unknown>): void;
  refreshLayoutMetrics(): void;
  refreshOrders(): void;
  getTabBar?(): { setSelectedKey?: (key: string) => void } | undefined;
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
  refreshLayoutMetrics(this: OrdersPageInstance) {
    const headerMetrics = resolveOrdersHeaderMetrics();

    this.setData({
      ordersHeaderTop: headerMetrics.top,
      ordersHeaderHeight: headerMetrics.height,
      ordersHeaderRightPadding: headerMetrics.rightPadding
    });
  },
  async refreshOrders(this: OrdersPageInstance) {
    const orders = await queryMyOrders();
    const view = getOrdersPageViewModel(orders, this.data.highlightedOrderId);

    this.setData({
      isEmpty: view.isEmpty,
      highlightedOrderId: view.highlightedOrderId,
      orderCards: view.cards
    });
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
