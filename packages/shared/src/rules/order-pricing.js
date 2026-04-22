"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildOrderLineSnapshot = buildOrderLineSnapshot;
exports.buildOrderPricingBreakdown = buildOrderPricingBreakdown;
exports.isCreateOrderPayload = isCreateOrderPayload;
function isNonEmptyString(value) {
    return typeof value === 'string' && value.length > 0;
}
function buildOrderLineSnapshot(input) {
    return {
        ...input,
        lineTotal: Number((input.unitPrice * input.quantity).toFixed(2))
    };
}
function buildOrderPricingBreakdown(input) {
    const itemsSubtotal = Number(input.itemsSubtotal.toFixed(2));
    const deliveryFee = Number(input.deliveryFee.toFixed(2));
    return {
        itemsSubtotal,
        deliveryFee,
        payableTotal: Number((itemsSubtotal + deliveryFee).toFixed(2))
    };
}
function isCreateOrderPayload(value) {
    var _a;
    if (!value || typeof value !== 'object') {
        return false;
    }
    const candidate = value;
    const fulfillment = candidate.fulfillment;
    const pricing = candidate.pricing;
    return (isNonEmptyString(candidate.idempotencyKey) &&
        (candidate.paymentMethod === 'wechat' || candidate.paymentMethod === 'balance') &&
        Array.isArray(candidate.items) &&
        candidate.items.length > 0 &&
        Array.isArray(candidate.pets) &&
        typeof candidate.hasReadCustomNotice === 'boolean' &&
        isNonEmptyString((_a = candidate.remark) !== null && _a !== void 0 ? _a : '') !== false &&
        Boolean(fulfillment) &&
        ((fulfillment === null || fulfillment === void 0 ? void 0 : fulfillment.mode) === 'delivery' || (fulfillment === null || fulfillment === void 0 ? void 0 : fulfillment.mode) === 'pickup' || (fulfillment === null || fulfillment === void 0 ? void 0 : fulfillment.mode) === 'express') &&
        Boolean(fulfillment === null || fulfillment === void 0 ? void 0 : fulfillment.store) &&
        Boolean(pricing) &&
        typeof (pricing === null || pricing === void 0 ? void 0 : pricing.itemsSubtotal) === 'number' &&
        typeof (pricing === null || pricing === void 0 ? void 0 : pricing.deliveryFee) === 'number' &&
        typeof (pricing === null || pricing === void 0 ? void 0 : pricing.payableTotal) === 'number');
}
