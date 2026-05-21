declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import type { OrderDetailViewModel } from '../../src/services/orders';

import { getMyOrderDetail, getOrderDetailViewModel } from '../../src/services/orders';

interface OrderDetailPageData {
  orderId: string;
  detail: OrderDetailViewModel | null;
  isEmpty: boolean;
}

interface OrderDetailPageInstance {
  data: OrderDetailPageData;
  setData(updates: Record<string, unknown>): void;
  refreshDetail(): void;
}

Page({
  data: {
    orderId: '',
    detail: null,
    isEmpty: true
  },
  onLoad(this: OrderDetailPageInstance, options?: { orderId?: string }) {
    this.setData({
      orderId: options?.orderId ?? ''
    });
  },
  async onShow(this: OrderDetailPageInstance) {
    await this.refreshDetail();
  },
  async refreshDetail(this: OrderDetailPageInstance) {
    const order = this.data.orderId ? await getMyOrderDetail(this.data.orderId) : null;
    const detail = getOrderDetailViewModel(order);

    this.setData({
      detail,
      isEmpty: !detail
    });
  },
  handleBackTap() {
    wx.switchTab({
      url: '/pages/orders/index'
    });
  },
  handleOpenOrders() {
    wx.switchTab({
      url: '/pages/orders/index'
    });
  }
});
