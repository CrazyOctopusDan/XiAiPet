"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCheckoutPricingPreview = getCheckoutPricingPreview;
exports.getDeliveryFeePreview = getDeliveryFeePreview;
exports.buildCreateOrderPayload = buildCreateOrderPayload;
exports.submitOrder = submitOrder;
const order_runtime_1 = require("../shared/order-runtime");
const address_1 = require("./address");
const cart_1 = require("./cart");
const checkout_1 = require("./checkout");
const CITY_DELIVERY_FEES = {
    'address-city-home': {
        distanceKm: 3.2,
        fee: 10,
        ruleLabel: '3km 内配送费 10 元'
    },
    'address-city-studio': {
        distanceKm: 5.8,
        fee: 16,
        ruleLabel: '3-6km 配送费 16 元'
    }
};
function getCloudCaller() {
    return (payload) => wx.cloud.callFunction(payload);
}
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
        tag: address.tag
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
    var _a;
    if (!address) {
        return {
            distanceKm: 0,
            fee: 0,
            ruleLabel: '待选择配送地址'
        };
    }
    return ((_a = CITY_DELIVERY_FEES[address.id]) !== null && _a !== void 0 ? _a : {
        distanceKm: 8.6,
        fee: 22,
        ruleLabel: '6km 以上配送费 22 元'
    });
}
function buildCreateOrderPayload(paymentMethod, idempotencyKey = createIdempotencyKey()) {
    var _a;
    const checkout = (0, checkout_1.getCheckoutViewModel)();
    const selectedItems = (0, cart_1.getCartItems)().filter((item) => item.selected);
    const pricing = getCheckoutPricingPreview();
    const pets = checkout.selectedPets.map((pet) => ({
        id: pet.id,
        name: pet.name
    }));
    return {
        idempotencyKey,
        paymentMethod,
        fulfillment: {
            mode: checkout.mode,
            address: buildAddressSnapshot(checkout.addressType ? (0, address_1.getSelectedAddress)(checkout.addressType) : null),
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
async function submitOrder(paymentMethod, callFunction = getCloudCaller(), options = {}) {
    var _a, _b;
    const payload = buildCreateOrderPayload(paymentMethod, options.idempotencyKey);
    const createOrderResponse = (await callFunction({
        name: 'createOrder',
        data: {
            payload
        }
    }));
    if (!createOrderResponse.result.ok) {
        throw new Error('create_order_failed');
    }
    const payOrderResponse = (await callFunction({
        name: 'payOrder',
        data: {
            orderId: createOrderResponse.result.order.id
        }
    }));
    if (!payOrderResponse.result.ok) {
        throw new Error(String((_a = payOrderResponse.result.code) !== null && _a !== void 0 ? _a : 'pay_order_failed'));
    }
    if (!payOrderResponse.result.order) {
        throw new Error('missing_paid_order');
    }
    if (paymentMethod === 'wechat' && payOrderResponse.result.paymentStatus === 'processing') {
        const syncOrderPaymentResponse = (await callFunction({
            name: 'syncOrderPayment',
            data: {
                orderId: createOrderResponse.result.order.id
            }
        }));
        if (!syncOrderPaymentResponse.result.ok || !syncOrderPaymentResponse.result.order) {
            throw new Error(String((_b = syncOrderPaymentResponse.result.code) !== null && _b !== void 0 ? _b : 'sync_payment_failed'));
        }
        return {
            order: syncOrderPaymentResponse.result.order,
            payment: payOrderResponse.result
        };
    }
    return {
        order: payOrderResponse.result.order,
        payment: payOrderResponse.result
    };
}
