"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const address_1 = require("../../src/services/address");
const checkout_1 = require("../../src/services/checkout");
const cart_1 = require("../../src/services/cart");
const pets_1 = require("../../src/services/pets");
const order_submit_1 = require("../../src/services/order-submit");
const runtime_config_1 = require("../../src/services/runtime-config");
const tab_navigation_1 = require("../../src/services/tab-navigation");
const PAYMENT_METHODS = [
    {
        value: 'wechat',
        label: '微信支付',
        hint: '走微信支付收银台'
    },
    {
        value: 'balance',
        label: '余额支付',
        hint: '优先扣除当前账户余额'
    }
];
Page({
    data: {
        items: [],
        selectedCount: 0,
        selectedTotalPrice: 0,
        fulfillmentModes: (0, checkout_1.getFulfillmentModes)(),
        activeFulfillmentMode: 'delivery',
        activeAddressType: 'city',
        selectedAddress: null,
        reservationOptions: [],
        selectedReservationValue: '',
        selectedReservationLabel: '',
        pickupPhone: '',
        pets: [],
        selectedPetIds: [],
        remarkSummary: '',
        customNotice: '',
        hasReadCustomNotice: false,
        canSubmit: false,
        submitDisabledReasons: [],
        storeName: '',
        storeAddress: '',
        storePhone: '',
        deliveryRuleRows: [],
        paymentMethods: PAYMENT_METHODS,
        activePaymentMethod: 'wechat',
        deliveryFee: 0,
        payableTotal: 0,
        deliveryFeeLabel: '待确认',
        submitting: false
    },
    onShow() {
        this.refreshCheckout();
        void this.refreshRuntimeConfig();
    },
    async refreshRuntimeConfig() {
        try {
            await (0, runtime_config_1.hydrateCustomerRuntimeConfig)();
        }
        finally {
            this.refreshCheckout();
        }
    },
    refreshCheckout() {
        var _a, _b;
        const summary = (0, cart_1.getCartSummary)();
        const view = (0, checkout_1.getCheckoutViewModel)();
        const pricing = (0, order_submit_1.getCheckoutPricingPreview)();
        const activePaymentMethod = (_a = this.data.activePaymentMethod) !== null && _a !== void 0 ? _a : 'wechat';
        this.setData({
            items: (0, cart_1.getCartItems)().filter((item) => item.selected),
            selectedCount: summary.selectedCount,
            selectedTotalPrice: summary.selectedTotalPrice,
            fulfillmentModes: (0, checkout_1.getFulfillmentModes)(),
            activeFulfillmentMode: view.mode,
            activeAddressType: view.addressType,
            selectedAddress: view.selectedAddress,
            reservationOptions: view.reservationOptions,
            selectedReservationValue: view.reservationSelection
                ? `${view.reservationSelection.dateValue}-${view.reservationSelection.timeValue}`
                : '',
            selectedReservationLabel: view.reservationSelection
                ? `${view.reservationSelection.dateLabel} ${view.reservationSelection.timeLabel}`
                : '',
            pickupPhone: view.pickupPhone,
            pets: (0, pets_1.getPets)(),
            selectedPetIds: view.selectedPets.map((item) => item.id),
            remarkSummary: view.remark || '还没有填写备注',
            customNotice: view.customNotice,
            hasReadCustomNotice: view.hasReadCustomNotice,
            canSubmit: view.canSubmit,
            submitDisabledReasons: view.submitDisabledReasons,
            storeName: view.store.name,
            storeAddress: view.store.address,
            storePhone: view.storePhone,
            deliveryRuleRows: view.deliveryRuleExplainers,
            paymentMethods: PAYMENT_METHODS,
            activePaymentMethod,
            deliveryFee: pricing.deliveryFee,
            payableTotal: pricing.payableTotal,
            deliveryFeeLabel: view.mode === 'delivery'
                ? (_b = view.deliveryRuleExplainers[0]) !== null && _b !== void 0 ? _b : '按配送距离计算'
                : '当前模式免配送费'
        });
    },
    handleFulfillmentModeTap(event) {
        var _a, _b;
        const mode = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.mode;
        if (!mode) {
            return;
        }
        (0, checkout_1.setFulfillmentMode)(mode);
        if (mode === 'pickup') {
            (0, checkout_1.hydratePickupPhoneFromProfile)();
        }
        this.refreshCheckout();
    },
    handleSelectAddress() {
        if (!this.data.activeAddressType) {
            return;
        }
        (0, address_1.beginAddressSelection)('checkout', this.data.activeAddressType);
        wx.navigateTo({
            url: `/pages/address-list/index?source=checkout&type=${this.data.activeAddressType}`
        });
    },
    handleReservationTap(event) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const dateValue = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.dateValue;
        const dateLabel = (_d = (_c = event.currentTarget) === null || _c === void 0 ? void 0 : _c.dataset) === null || _d === void 0 ? void 0 : _d.dateLabel;
        const timeValue = (_f = (_e = event.currentTarget) === null || _e === void 0 ? void 0 : _e.dataset) === null || _f === void 0 ? void 0 : _f.timeValue;
        const timeLabel = (_h = (_g = event.currentTarget) === null || _g === void 0 ? void 0 : _g.dataset) === null || _h === void 0 ? void 0 : _h.timeLabel;
        if (!dateValue || !dateLabel || !timeValue || !timeLabel) {
            return;
        }
        (0, checkout_1.setReservationSelection)({
            dateLabel,
            dateValue,
            timeLabel,
            timeValue
        });
        this.refreshCheckout();
    },
    handlePhoneInput(event) {
        var _a, _b;
        (0, checkout_1.setPickupPhone)((_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : '');
        this.refreshCheckout();
    },
    handleAutoFillPhone() {
        const hydrated = (0, checkout_1.hydratePickupPhoneFromProfile)();
        this.refreshCheckout();
        if (!hydrated) {
            wx.navigateTo({
                url: '/pages/contact-bind/index'
            });
        }
    },
    handlePetTap(event) {
        var _a, _b;
        const petId = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.petId;
        if (!petId) {
            return;
        }
        (0, checkout_1.toggleSelectedPet)(petId);
        this.refreshCheckout();
    },
    handleRemarkTap() {
        wx.navigateTo({
            url: '/pages/checkout-remark/index'
        });
    },
    handlePaymentMethodTap(event) {
        var _a, _b;
        const method = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.method;
        if (!method) {
            return;
        }
        this.setData({
            activePaymentMethod: method
        });
    },
    handleNoticeToggle() {
        (0, checkout_1.setCustomNoticeAcknowledged)(!this.data.hasReadCustomNotice);
        this.refreshCheckout();
    },
    handleOpenLocation() {
        var _a;
        const view = (0, checkout_1.getCheckoutViewModel)();
        (_a = wx.openLocation) === null || _a === void 0 ? void 0 : _a.call(wx, {
            name: view.store.name,
            address: view.store.address,
            latitude: view.store.latitude,
            longitude: view.store.longitude,
            scale: 17
        });
    },
    async handleSubmit() {
        if (this.data.submitting) {
            return;
        }
        if (!this.data.canSubmit) {
            wx.showToast({
                title: '请先补齐订单信息',
                icon: 'none'
            });
            return;
        }
        this.setData({ submitting: true });
        try {
            const result = await (0, order_submit_1.submitOrder)(this.data.activePaymentMethod);
            this.setData({ submitting: false });
            if (result.order.status === 'paid') {
                (0, tab_navigation_1.setPendingOrdersHighlight)(result.order.id);
                wx.switchTab({
                    url: '/pages/orders/index'
                });
                return;
            }
            wx.showToast({
                title: '订单待支付确认',
                icon: 'none'
            });
        }
        catch (error) {
            this.setData({ submitting: false });
            wx.showToast({
                title: error instanceof Error && error.message === 'WECHAT_PAY_NOT_CONFIGURED'
                    ? '微信支付暂未配置'
                    : error instanceof Error
                        ? error.message
                        : '下单失败',
                icon: 'none'
            });
        }
    },
    handleReturnCart() {
        wx.navigateBack();
    }
});
