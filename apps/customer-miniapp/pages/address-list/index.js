"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const address_1 = require("../../src/services/address");
Page({
    data: {
        addressTypes: [
            { value: 'city', label: '同城配送', hint: '附近门店和店员配送' },
            { value: 'express', label: '快递到家', hint: '跨区或异地下单' }
        ],
        activeType: (0, address_1.getCheckoutAddressType)(),
        addresses: [],
        selectedAddressId: '',
        isCheckoutSelection: false
    },
    onLoad(options) {
        var _a;
        const activeType = (options === null || options === void 0 ? void 0 : options.type) === 'express' ? 'express' : 'city';
        const isCheckoutSelection = (options === null || options === void 0 ? void 0 : options.source) === 'checkout' || ((_a = (0, address_1.getAddressSelectionRequest)()) === null || _a === void 0 ? void 0 : _a.target) === 'checkout';
        (0, address_1.setCheckoutAddressType)(activeType);
        this.setData({
            activeType,
            isCheckoutSelection
        });
    },
    onShow() {
        void this.refreshAddresses();
    },
    async refreshAddresses() {
        const render = () => {
            var _a;
            const selectedAddress = (0, address_1.getSelectedAddress)(this.data.activeType);
            const request = (0, address_1.getAddressSelectionRequest)();
            this.setData({
                addresses: (0, address_1.getAddresses)(this.data.activeType),
                selectedAddressId: (_a = selectedAddress === null || selectedAddress === void 0 ? void 0 : selectedAddress.id) !== null && _a !== void 0 ? _a : '',
                isCheckoutSelection: (request === null || request === void 0 ? void 0 : request.target) === 'checkout'
            });
        };
        render();
        try {
            await (0, address_1.hydrateAddresses)();
        }
        catch (_a) {
            // Keep the last local address snapshot visible if the network is unavailable.
        }
        render();
    },
    handleTypeTap(event) {
        var _a, _b;
        const type = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.type;
        if (!type) {
            return;
        }
        (0, address_1.setCheckoutAddressType)(type);
        this.setData({ activeType: type });
        void this.refreshAddresses();
    },
    handleAddAddress() {
        wx.navigateTo({
            url: `/pages/address-form/index?type=${this.data.activeType}`
        });
    },
    handleEditAddress(event) {
        var _a, _b;
        const addressId = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.addressId;
        if (!addressId) {
            return;
        }
        wx.navigateTo({
            url: `/pages/address-form/index?id=${addressId}`
        });
    },
    async handleSelectAddress(event) {
        var _a, _b;
        const addressId = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.addressId;
        if (!addressId) {
            return;
        }
        const selected = (0, address_1.selectAddress)(addressId);
        (0, address_1.setCheckoutAddressType)(selected.type);
        try {
            await (0, address_1.persistSelectedAddress)(addressId);
        }
        catch (_c) {
            wx.showToast({ title: '默认地址同步失败', icon: 'none' });
            this.refreshAddresses();
            return;
        }
        if (this.data.isCheckoutSelection) {
            (0, address_1.clearAddressSelectionRequest)();
            wx.navigateBack();
            return;
        }
        void this.refreshAddresses();
        wx.showToast({ title: '默认地址已更新', icon: 'none' });
    }
});
