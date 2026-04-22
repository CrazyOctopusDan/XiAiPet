"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const checkout_1 = require("../../src/services/checkout");
const remark_history_1 = require("../../src/services/remark-history");
Page({
    data: {
        remarkValue: '',
        history: []
    },
    onShow() {
        this.refresh();
    },
    refresh() {
        this.setData({
            remarkValue: (0, checkout_1.getCheckoutDraft)().remark,
            history: (0, remark_history_1.getRemarkHistory)()
        });
    },
    handleInput(event) {
        var _a, _b;
        this.setData({
            remarkValue: (_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : ''
        });
    },
    handleUseHistory(event) {
        var _a, _b, _c;
        this.setData({
            remarkValue: (_c = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.value) !== null && _c !== void 0 ? _c : ''
        });
    },
    handleDeleteHistory(event) {
        var _a, _b;
        const value = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.value;
        if (!value) {
            return;
        }
        (0, remark_history_1.deleteRemarkHistoryEntry)(value);
        this.refresh();
    },
    handleConfirm() {
        const normalized = this.data.remarkValue.trim();
        (0, checkout_1.setCheckoutRemark)(normalized);
        if (normalized) {
            (0, remark_history_1.rememberRemark)(normalized);
        }
        wx.navigateBack();
    }
});
