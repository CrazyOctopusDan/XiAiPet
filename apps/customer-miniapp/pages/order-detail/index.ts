declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import type { OrderDetailViewModel } from '../../src/services/orders';

import { completeMyOrder, getMyOrderDetail, getOrderDetailViewModel } from '../../src/services/orders';

interface OrderDetailPageData {
  orderId: string;
  detail: OrderDetailViewModel | null;
  isEmpty: boolean;
  isCompleting: boolean;
}

interface OrderDetailPageInstance {
  data: OrderDetailPageData;
  setData(updates: Record<string, unknown>): void;
  refreshDetail(): Promise<void>;
}

Page({
  data: {
    orderId: '',
    detail: null,
    isEmpty: true,
    isCompleting: false
  },
  onLoad(this: OrderDetailPageInstance, options?: { orderId?: string }) {
    this.setData({
      orderId: options?.orderId ?? ''
    });
  },
  async onShow(this: OrderDetailPageInstance) {
    await this.refreshDetail();
  },
  async onPullDownRefresh(this: OrderDetailPageInstance) {
    try {
      await this.refreshDetail();
    } finally {
      wx.stopPullDownRefresh?.();
    }
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
  },
  async handleCompleteOrderTap(this: OrderDetailPageInstance) {
    const detail = this.data.detail;

    if (!detail?.canComplete || this.data.isCompleting) {
      return;
    }

    const result = await wx.showModal({
      title: detail.completionConfirmTitle,
      content: detail.completionConfirmBody,
      confirmText: detail.completionActionLabel,
      confirmColor: '#2F6478',
      cancelText: '再等等'
    });

    if (!result.confirm) {
      return;
    }

    this.setData({ isCompleting: true });

    try {
      const order = await completeMyOrder(detail.id);
      this.setData({
        detail: getOrderDetailViewModel(order),
        isEmpty: !order
      });
      wx.showToast?.({
        title: '订单已完成',
        icon: 'success'
      });
    } finally {
      this.setData({ isCompleting: false });
    }
  }
});
