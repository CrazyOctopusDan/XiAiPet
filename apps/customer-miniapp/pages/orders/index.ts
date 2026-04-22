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
  orderCards: OrderCardViewModel[];
}

interface OrdersPageInstance {
  data: OrdersPageData;
  setData(updates: Record<string, unknown>): void;
  refreshOrders(): void;
  getTabBar?(): { setSelectedKey?: (key: string) => void } | undefined;
}

Page({
  data: {
    isEmpty: true,
    emptyStateTitle: '还没有订单',
    emptyStateBody: '支付完成后的订单会出现在这里，先去挑些毛孩子的蛋糕吧。',
    highlightedOrderId: null,
    orderCards: []
  },
  onLoad(this: OrdersPageInstance, options?: { highlightOrderId?: string }) {
    this.setData({
      highlightedOrderId: options?.highlightOrderId ?? null
    });
  },
  async onShow(this: OrdersPageInstance) {
    this.getTabBar?.()?.setSelectedKey?.('orders');
    this.setData({
      highlightedOrderId: consumePendingOrdersHighlight()
    });
    await this.refreshOrders();
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
