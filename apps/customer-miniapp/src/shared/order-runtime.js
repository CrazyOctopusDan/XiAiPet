"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrderStatusLabel = getOrderStatusLabel;
exports.buildOrderLineSnapshot = buildOrderLineSnapshot;
exports.buildOrderPricingBreakdown = buildOrderPricingBreakdown;
const PAID_FULFILLMENT_CHAINS = {
    delivery: [
        { status: 'pending', label: '待处理' },
        { status: 'in_production', label: '制作中' },
        { status: 'out_for_delivery', label: '配送中' },
        { status: 'completed', label: '已完成' }
    ],
    pickup: [
        { status: 'pending', label: '待处理' },
        { status: 'in_production', label: '制作中' },
        { status: 'ready_for_pickup', label: '待自取' },
        { status: 'completed', label: '已完成' }
    ],
    express: [
        { status: 'pending', label: '待处理' },
        { status: 'in_production', label: '制作中' },
        { status: 'ready_to_ship', label: '待发货' },
        { status: 'completed', label: '已完成' }
    ]
};
function roundCurrency(value) {
    return Number(value.toFixed(2));
}
function getDefaultFulfillmentStatus(mode) {
    return PAID_FULFILLMENT_CHAINS[mode][0].status;
}
function getFulfillmentStatusLabel(mode, status) {
    var _a, _b;
    if (status === 'cancelled') {
        return '已取消';
    }
    return (_b = (_a = PAID_FULFILLMENT_CHAINS[mode].find((item) => item.status === status)) === null || _a === void 0 ? void 0 : _a.label) !== null && _b !== void 0 ? _b : '状态未知';
}
function getOrderStatusLabel(order) {
    var _a, _b, _c, _d;
    if (order.status === 'pending_payment') {
        return '待付款';
    }
    if (order.status === 'payment_processing') {
        return '支付处理中';
    }
    if (order.status === 'payment_failed') {
        return '支付失败';
    }
    if (order.status === 'cancelled') {
        return '已取消';
    }
    const mode = (_b = (_a = order.fulfillmentState) === null || _a === void 0 ? void 0 : _a.mode) !== null && _b !== void 0 ? _b : order.snapshot.fulfillment.mode;
    const status = (_d = (_c = order.fulfillmentState) === null || _c === void 0 ? void 0 : _c.status) !== null && _d !== void 0 ? _d : getDefaultFulfillmentStatus(mode);
    return getFulfillmentStatusLabel(mode, status);
}
function buildOrderLineSnapshot(input) {
    return {
        ...input,
        lineTotal: roundCurrency(input.unitPrice * input.quantity)
    };
}
function buildOrderPricingBreakdown(input) {
    const itemsSubtotal = roundCurrency(input.itemsSubtotal);
    const deliveryFee = roundCurrency(input.deliveryFee);
    return {
        itemsSubtotal,
        deliveryFee,
        payableTotal: roundCurrency(itemsSubtotal + deliveryFee)
    };
}
