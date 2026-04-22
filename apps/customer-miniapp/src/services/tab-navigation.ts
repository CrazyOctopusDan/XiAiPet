declare const wx: any;

const PENDING_ORDERS_HIGHLIGHT_KEY = 'xiaipet_pending_orders_highlight_id';

export function setPendingOrdersHighlight(orderId: string) {
  wx.setStorageSync?.(PENDING_ORDERS_HIGHLIGHT_KEY, orderId);
}

export function consumePendingOrdersHighlight(): string | null {
  const orderId = wx.getStorageSync?.(PENDING_ORDERS_HIGHLIGHT_KEY);

  wx.removeStorageSync?.(PENDING_ORDERS_HIGHLIGHT_KEY);

  return typeof orderId === 'string' && orderId ? orderId : null;
}
