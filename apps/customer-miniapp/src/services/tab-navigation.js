"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setPendingOrdersHighlight = setPendingOrdersHighlight;
exports.consumePendingOrdersHighlight = consumePendingOrdersHighlight;
const PENDING_ORDERS_HIGHLIGHT_KEY = 'xiaipet_pending_orders_highlight_id';
function setPendingOrdersHighlight(orderId) {
    var _a;
    (_a = wx.setStorageSync) === null || _a === void 0 ? void 0 : _a.call(wx, PENDING_ORDERS_HIGHLIGHT_KEY, orderId);
}
function consumePendingOrdersHighlight() {
    var _a, _b;
    const orderId = (_a = wx.getStorageSync) === null || _a === void 0 ? void 0 : _a.call(wx, PENDING_ORDERS_HIGHLIGHT_KEY);
    (_b = wx.removeStorageSync) === null || _b === void 0 ? void 0 : _b.call(wx, PENDING_ORDERS_HIGHLIGHT_KEY);
    return typeof orderId === 'string' && orderId ? orderId : null;
}
