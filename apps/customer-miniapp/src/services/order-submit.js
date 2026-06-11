"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCheckoutPricingPreview = getCheckoutPricingPreview;
exports.getDeliveryFeePreview = getDeliveryFeePreview;
exports.buildCreateOrderPayload = buildCreateOrderPayload;
exports.submitOrder = submitOrder;
const order_runtime_1 = require("../shared/order-runtime");
const address_1 = require("./address");
const api_client_1 = require("./api-client");
const cart_1 = require("./cart");
const checkout_1 = require("./checkout");
const delivery_rules_1 = require("./delivery-rules");
const runtime_config_1 = require("./runtime-config");
function buildAddressSnapshot(address) {
    if (!address) {
        return undefined;
    }
    return {
        id: address.id,
        recipientName: address.recipientName,
        phoneNumber: address.phoneNumber,
        regionLabel: address.regionLabel,
        detailAddress: address.detailAddress,
        tag: address.tag,
        latitude: address.latitude,
        longitude: address.longitude
    };
}
function createIdempotencyKey() {
    return `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function getCheckoutPricingPreview() {
    const checkout = (0, checkout_1.getCheckoutViewModel)();
    const selectedItems = (0, cart_1.getCartItems)().filter((item) => item.selected);
    const itemsSubtotal = Number(selectedItems.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2));
    const address = checkout.addressType ? (0, address_1.getSelectedAddress)(checkout.addressType) : null;
    const deliveryFee = checkout.mode === 'delivery' ? getDeliveryFeePreview(address).fee : 0;
    return (0, order_runtime_1.buildOrderPricingBreakdown)({
        itemsSubtotal,
        deliveryFee
    });
}
function getDeliveryFeePreview(address) {
    const runtimeConfig = (0, runtime_config_1.getCachedCustomerRuntimeConfig)();
    return (0, delivery_rules_1.resolveDeliveryFeePreview)(runtimeConfig, address);
}
function buildCreateOrderPayload(paymentMethod, idempotencyKey = createIdempotencyKey()) {
    var _a;
    (0, checkout_1.ensureContactPhoneFromProfile)();
    const checkout = (0, checkout_1.getCheckoutViewModel)();
    const selectedItems = (0, cart_1.getCartItems)().filter((item) => item.selected);
    const selectedFulfillmentModes = (0, cart_1.getSelectedCartFulfillmentModes)();
    const pricing = getCheckoutPricingPreview();
    const deliveryRuleViolation = checkout.mode === 'delivery'
        ? (0, delivery_rules_1.getDeliveryRuleViolation)({
            runtimeConfig: (0, runtime_config_1.getCachedCustomerRuntimeConfig)(),
            address: checkout.addressType ? (0, address_1.getSelectedAddress)(checkout.addressType) : null,
            itemsSubtotal: pricing.itemsSubtotal
        })
        : null;
    const pets = checkout.selectedPets.map((pet) => ({
        id: pet.id,
        name: pet.name,
        gender: pet.gender,
        birthday: pet.birthday,
        allergyNotes: pet.allergyNotes
    }));
    if (selectedItems.length > 0 && !selectedFulfillmentModes.includes(checkout.mode)) {
        throw new Error('INCOMPATIBLE_FULFILLMENT');
    }
    if (deliveryRuleViolation) {
        throw new Error(deliveryRuleViolation.errorCode);
    }
    return {
        idempotencyKey,
        paymentMethod,
        fulfillment: {
            mode: checkout.mode,
            address: buildAddressSnapshot(checkout.addressType ? (0, address_1.getSelectedAddress)(checkout.addressType) : null),
            contactPhone: checkout.contactPhone || undefined,
            pickupPhone: checkout.mode === 'pickup' ? checkout.pickupPhone : undefined,
            reservation: (_a = checkout.reservationSelection) !== null && _a !== void 0 ? _a : undefined,
            store: {
                name: checkout.store.name,
                address: checkout.store.address
            }
        },
        items: selectedItems.map((item) => (0, order_runtime_1.buildOrderLineSnapshot)({
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.price,
            specId: item.specId,
            specLabel: item.specLabel
        })),
        pets,
        remark: checkout.remark,
        hasReadCustomNotice: checkout.hasReadCustomNotice,
        pricing
    };
}
function toSubmitOrderError(error) {
    if (error instanceof api_client_1.CustomerApiError) {
        return new Error(error.code);
    }
    return error instanceof Error ? error : new Error('submit_order_failed');
}
function requestWechatPayment(paymentParams) {
    return new Promise((resolve, reject) => {
        if (typeof (wx === null || wx === void 0 ? void 0 : wx.requestPayment) !== 'function') {
            reject(new Error('WECHAT_PAY_UNAVAILABLE'));
            return;
        }
        wx.requestPayment({
            ...paymentParams,
            success: () => resolve(),
            fail: () => reject(new Error('WECHAT_PAY_CANCELLED'))
        });
    });
}
async function submitOrder(paymentMethod, request = api_client_1.customerApiRequest, options = {}) {
    var _a, _b, _c;
    const payload = buildCreateOrderPayload(paymentMethod, options.idempotencyKey);
    try {
        const createOrderResponse = await request('/api/v1/customer/orders', {
            method: 'POST',
            body: payload,
            auth: 'customer'
        });
        if (!createOrderResponse.ok || !createOrderResponse.order) {
            throw new Error(String((_a = createOrderResponse.code) !== null && _a !== void 0 ? _a : 'create_order_failed'));
        }
        const payOrderResponse = await request(`/api/v1/customer/orders/${createOrderResponse.order.id}/payment`, {
            method: 'POST',
            body: {
                paymentMethod
            },
            auth: 'customer'
        });
        if (!payOrderResponse.ok) {
            throw new Error(String((_b = payOrderResponse.code) !== null && _b !== void 0 ? _b : 'pay_order_failed'));
        }
        if (!payOrderResponse.order) {
            throw new Error('missing_paid_order');
        }
        if (paymentMethod === 'wechat' &&
            (payOrderResponse.paymentStatus === 'pending_wechat' || payOrderResponse.paymentStatus === 'processing')) {
            if (!payOrderResponse.paymentParams) {
                throw new Error('missing_wechat_payment_params');
            }
            await requestWechatPayment(payOrderResponse.paymentParams);
            const syncOrderPaymentResponse = await request(`/api/v1/customer/orders/${createOrderResponse.order.id}/payment-sync`, {
                method: 'POST',
                auth: 'customer'
            });
            if (!syncOrderPaymentResponse.ok || !syncOrderPaymentResponse.order) {
                throw new Error(String((_c = syncOrderPaymentResponse.code) !== null && _c !== void 0 ? _c : 'sync_payment_failed'));
            }
            return {
                order: syncOrderPaymentResponse.order,
                payment: payOrderResponse
            };
        }
        return {
            order: payOrderResponse.order,
            payment: payOrderResponse
        };
    }
    catch (error) {
        throw toSubmitOrderError(error);
    }
}
