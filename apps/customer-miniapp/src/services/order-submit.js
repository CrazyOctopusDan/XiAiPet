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
const runtime_config_1 = require("./runtime-config");
const EARTH_RADIUS_KM = 6371;
function toRadians(value) {
    return (value * Math.PI) / 180;
}
function isCoordinate(value) {
    return typeof value === 'number' && Number.isFinite(value);
}
function calculateDistanceKm(from, to) {
    const toLatitude = to.latitude;
    const toLongitude = to.longitude;
    if (!isCoordinate(toLatitude) || !isCoordinate(toLongitude)) {
        return null;
    }
    const latDelta = toRadians(toLatitude - from.latitude);
    const lonDelta = toRadians(toLongitude - from.longitude);
    const fromLat = toRadians(from.latitude);
    const toLat = toRadians(toLatitude);
    const haversine = Math.sin(latDelta / 2) ** 2 +
        Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lonDelta / 2) ** 2;
    return Number((EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))).toFixed(1));
}
function formatRuleLabel(distanceKm, explainer) {
    if (distanceKm === null) {
        return explainer;
    }
    return `${distanceKm.toFixed(1)} 公里，${explainer}`;
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
    const runtimeConfig = (0, runtime_config_1.getCachedCustomerRuntimeConfig)();
    const sortedTiers = [...runtimeConfig.deliveryRules.tiers].sort((left, right) => left.distanceKm - right.distanceKm);
    const distanceKm = calculateDistanceKm(runtimeConfig.store, address);
    const matchedTier = distanceKm === null
        ? sortedTiers[0]
        : (_a = sortedTiers.find((tier) => distanceKm <= tier.distanceKm)) !== null && _a !== void 0 ? _a : sortedTiers[sortedTiers.length - 1];
    if (!matchedTier) {
        return {
            distanceKm: distanceKm !== null && distanceKm !== void 0 ? distanceKm : 0,
            fee: 0,
            ruleLabel: '配送费待确认'
        };
    }
    return {
        distanceKm: distanceKm !== null && distanceKm !== void 0 ? distanceKm : matchedTier.distanceKm,
        fee: matchedTier.deliveryFee,
        ruleLabel: formatRuleLabel(distanceKm, matchedTier.explainer)
    };
}
function buildCreateOrderPayload(paymentMethod, idempotencyKey = createIdempotencyKey()) {
    var _a;
    const checkout = (0, checkout_1.getCheckoutViewModel)();
    const selectedItems = (0, cart_1.getCartItems)().filter((item) => item.selected);
    const pricing = getCheckoutPricingPreview();
    const pets = checkout.selectedPets.map((pet) => ({
        id: pet.id,
        name: pet.name,
        gender: pet.gender,
        birthday: pet.birthday,
        allergyNotes: pet.allergyNotes
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
function toSubmitOrderError(error) {
    if (error instanceof api_client_1.CustomerApiError) {
        return new Error(error.code);
    }
    return error instanceof Error ? error : new Error('submit_order_failed');
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
