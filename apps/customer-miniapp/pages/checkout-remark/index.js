"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const checkout_1 = require("../../src/services/checkout");
const remark_history_1 = require("../../src/services/remark-history");
function refreshPreviousCheckoutPage() {
    var _a;
    const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
    const previousPage = pages[pages.length - 2];
    (_a = previousPage === null || previousPage === void 0 ? void 0 : previousPage.refreshCheckout) === null || _a === void 0 ? void 0 : _a.call(previousPage);
}
Page({
    data: {
        remarkValue: '',
        history: []
    },
    onShow() {
        this.refresh();
    },
    refresh() {
        (0, remark_history_1.hydrateRemarkHistory)();
        this.setData({
            remarkValue: (0, checkout_1.getCheckoutDraft)().remark,
            history: (0, remark_history_1.getRemarkHistory)()
        });
    },
    syncRemark(value) {
        const normalized = (0, remark_history_1.normalizeRemark)(value !== null && value !== void 0 ? value : this.data.remarkValue);
        (0, checkout_1.setCheckoutRemark)(normalized);
        refreshPreviousCheckoutPage();
        return normalized;
    },
    handleInput(event) {
        var _a, _b;
        const remarkValue = (0, remark_history_1.normalizeRemark)((_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : '');
        this.setData({
            remarkValue
        });
        this.syncRemark(remarkValue);
    },
    handleUseHistory(event) {
        var _a, _b, _c;
        const value = (0, remark_history_1.normalizeRemark)((_c = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.value) !== null && _c !== void 0 ? _c : '');
        if (value) {
            (0, remark_history_1.rememberRemark)(value);
        }
        this.setData({
            remarkValue: value,
            history: (0, remark_history_1.getRemarkHistory)()
        });
        this.syncRemark(value);
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
        const normalized = this.syncRemark();
        if (normalized) {
            (0, remark_history_1.rememberRemark)(normalized);
        }
        wx.navigateBack();
    }
});
