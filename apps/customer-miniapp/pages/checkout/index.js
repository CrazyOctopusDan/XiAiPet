"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const address_1 = require("../../src/services/address");
const checkout_1 = require("../../src/services/checkout");
const cart_1 = require("../../src/services/cart");
const pets_1 = require("../../src/services/pets");
const profile_1 = require("../../src/services/profile");
const order_submit_1 = require("../../src/services/order-submit");
const runtime_config_1 = require("../../src/services/runtime-config");
const tab_navigation_1 = require("../../src/services/tab-navigation");
function resolvePendingReservation(options, selectedValue) {
    for (const day of options) {
        for (const slot of day.slots) {
            if (`${day.value}-${slot.value}` === selectedValue) {
                return {
                    dateValue: day.value,
                    timeValue: slot.value
                };
            }
        }
    }
    const firstDay = options[0];
    const firstSlot = firstDay === null || firstDay === void 0 ? void 0 : firstDay.slots[0];
    if (!firstDay || !firstSlot) {
        return null;
    }
    return {
        dateValue: firstDay.value,
        timeValue: firstSlot.value
    };
}
function findReservationSelection(options, dateValue, timeValue) {
    const day = options.find((item) => item.value === dateValue);
    const slot = day === null || day === void 0 ? void 0 : day.slots.find((item) => item.value === timeValue);
    if (!day || !slot) {
        return null;
    }
    return {
        dateLabel: day.label,
        dateValue: day.value,
        timeLabel: slot.label,
        timeValue: slot.value
    };
}
const PAYMENT_METHODS = [
    {
        value: 'balance',
        label: '余额支付',
        hint: '优先扣除当前账户余额'
    },
    {
        value: 'wechat',
        label: '微信支付',
        hint: '走微信支付收银台'
    }
];
let checkoutSubmissionLocked = false;
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
        showReservationModal: false,
        pendingReservationDateValue: '',
        pendingReservationTimeValue: '',
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
        activePaymentMethod: 'balance',
        deliveryFee: 0,
        payableTotal: 0,
        deliveryFeeLabel: '待确认',
        showDeliveryFeeModal: false,
        submitting: false
    },
    onShow() {
        if (!this.data.submitting) {
            checkoutSubmissionLocked = false;
        }
        this.refreshCheckout();
        void this.refreshCustomerContext();
        void this.refreshRuntimeConfig();
    },
    async refreshCustomerContext() {
        await Promise.allSettled([
            (0, address_1.hydrateAddresses)(),
            (0, pets_1.hydratePets)(),
            (0, profile_1.hydrateProfile)()
        ]);
        this.refreshCheckout();
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
        var _a;
        const summary = (0, cart_1.getCartSummary)();
        const view = (0, checkout_1.getCheckoutViewModel)();
        const pricing = (0, order_submit_1.getCheckoutPricingPreview)();
        const deliveryFeePreview = (0, order_submit_1.getDeliveryFeePreview)(view.selectedAddress);
        const activePaymentMethod = (_a = this.data.activePaymentMethod) !== null && _a !== void 0 ? _a : 'balance';
        const selectedPetIds = view.selectedPets.map((item) => item.id);
        const selectedPetIdSet = new Set(selectedPetIds);
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
            pickupPhone: view.contactPhone,
            pets: (0, pets_1.getPets)().map((item) => ({
                ...item,
                selected: selectedPetIdSet.has(item.id)
            })),
            selectedPetIds,
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
                ? deliveryFeePreview.ruleLabel
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
    handleOpenReservationModal() {
        const pending = resolvePendingReservation(this.data.reservationOptions, this.data.selectedReservationValue);
        if (!pending) {
            return;
        }
        this.setData({
            showReservationModal: true,
            pendingReservationDateValue: pending.dateValue,
            pendingReservationTimeValue: pending.timeValue
        });
    },
    handleCloseReservationModal() {
        this.setData({ showReservationModal: false });
    },
    handleReservationDateTap(event) {
        var _a, _b;
        const dateValue = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.dateValue;
        const day = this.data.reservationOptions.find((item) => item.value === dateValue);
        const firstSlot = day === null || day === void 0 ? void 0 : day.slots[0];
        if (!day || !firstSlot) {
            return;
        }
        this.setData({
            pendingReservationDateValue: day.value,
            pendingReservationTimeValue: firstSlot.value
        });
    },
    handleReservationSlotTap(event) {
        var _a, _b;
        const timeValue = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.timeValue;
        if (!timeValue) {
            return;
        }
        this.setData({
            pendingReservationTimeValue: timeValue
        });
    },
    handleConfirmReservation() {
        const selection = findReservationSelection(this.data.reservationOptions, this.data.pendingReservationDateValue, this.data.pendingReservationTimeValue);
        if (!selection) {
            return;
        }
        (0, checkout_1.setReservationSelection)(selection);
        this.setData({ showReservationModal: false });
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
    handleDeliveryFeeTap() {
        if (this.data.activeFulfillmentMode !== 'delivery' || !this.data.deliveryRuleRows.length) {
            return;
        }
        this.setData({ showDeliveryFeeModal: true });
    },
    handleCloseDeliveryFeeModal() {
        this.setData({ showDeliveryFeeModal: false });
    },
    noop() { },
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
        if (checkoutSubmissionLocked || this.data.submitting) {
            return;
        }
        checkoutSubmissionLocked = true;
        await this.refreshCustomerContext();
        if (!this.data.canSubmit) {
            checkoutSubmissionLocked = false;
            if (this.data.submitDisabledReasons.includes('missing_registration')) {
                wx.navigateTo({
                    url: (0, profile_1.getPhoneBindingRedirectUrl)('/pages/checkout/index')
                });
                return;
            }
            wx.showToast({
                title: '请先补齐订单信息',
                icon: 'none'
            });
            return;
        }
        this.setData({ submitting: true });
        try {
            const result = await (0, order_submit_1.submitOrder)(this.data.activePaymentMethod);
            if (result.order.status === 'paid') {
                (0, cart_1.removeSelectedCartItems)();
                (0, tab_navigation_1.setPendingOrdersHighlight)(result.order.id);
                this.setData({ submitting: false });
                wx.redirectTo({
                    url: `/pages/order-detail/index?orderId=${result.order.id}`
                });
                return;
            }
            checkoutSubmissionLocked = false;
            wx.showToast({
                title: '订单待支付确认',
                icon: 'none'
            });
            this.setData({ submitting: false });
        }
        catch (error) {
            checkoutSubmissionLocked = false;
            this.setData({ submitting: false });
            wx.showToast({
                title: error instanceof Error && error.message === 'WECHAT_PAY_NOT_CONFIGURED'
                    ? '微信支付暂未配置'
                    : error instanceof Error && error.message === 'INSUFFICIENT_BALANCE'
                        ? '余额不足'
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
