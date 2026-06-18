"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const user_admin_1 = require("../../src/services/user-admin");
const api_client_1 = require("../../src/services/api-client");
function normalizeMoneyInputText(value) {
    const sanitized = (value !== null && value !== void 0 ? value : '').replace(/[^\d.]/g, '');
    const [integerPart = '', ...decimalParts] = sanitized.split('.');
    if (!sanitized.includes('.')) {
        return integerPart;
    }
    return `${integerPart}.${decimalParts.join('').slice(0, 2)}`;
}
function normalizeBalanceAction(action) {
    return action === 'deduct' ? 'deduct' : 'add';
}
Page({
    data: {
        user: null,
        detail: null,
        drawerOpen: false,
        action: 'add',
        reasonOptions: (0, user_admin_1.getBalanceAdjustmentReasonOptions)('add'),
        amountText: '',
        reasonType: '充值',
        note: '',
        resultingBalanceLabel: '￥0.00',
        disableSubmitReason: '请输入调整金额',
        submitting: false,
        canAdjustBalance: true,
        activeDetailTab: 'basic',
        addressesLoaded: false,
        addressesLoading: false,
        ledgerLoaded: false,
        ledgerLoading: false,
        ledgerHasMore: false,
        ledgerNextCursor: null
    },
    onLoad(options) {
        var _a, _b;
        this.setData({
            canAdjustBalance: ((_b = (_a = (0, api_client_1.getMerchantSession)()) === null || _a === void 0 ? void 0 : _a.account) === null || _b === void 0 ? void 0 : _b.role) !== 'staff'
        });
        void this.refreshDetail(options === null || options === void 0 ? void 0 : options.openid);
    },
    async refreshDetail(openid) {
        const cachedUser = wx.getStorageSync('merchant-selected-user');
        const targetOpenid = openid !== null && openid !== void 0 ? openid : cachedUser === null || cachedUser === void 0 ? void 0 : cachedUser.openid;
        if (!targetOpenid) {
            this.setData({
                user: null,
                detail: null
            });
            return;
        }
        if (cachedUser) {
            const latest = (0, user_admin_1.getCachedLatestAdjustment)(cachedUser.openid);
            this.setData({
                user: cachedUser,
                detail: (0, user_admin_1.getUserDetailViewModel)(cachedUser, latest)
            });
            this.updateDraftPreview();
        }
        try {
            const user = await (0, user_admin_1.fetchMerchantUserDetail)(targetOpenid);
            if (!user) {
                this.setData({
                    user: null,
                    detail: null
                });
                return;
            }
            wx.setStorageSync('merchant-selected-user', user);
            this.setData({
                user,
                detail: (0, user_admin_1.getUserDetailViewModel)(user, user.latestAdjustment),
                addressesLoaded: false,
                addressesLoading: false,
                ledgerLoaded: false,
                ledgerLoading: false,
                ledgerHasMore: false,
                ledgerNextCursor: null
            });
            this.updateDraftPreview();
        }
        catch (error) {
            console.error('fetch merchant user detail failed', error);
        }
    },
    mergeDetailSections(sections) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        if (!this.data.user) {
            return null;
        }
        const current = this.data.user;
        const merged = {
            ...current,
            currentBalance: (_a = sections.currentBalance) !== null && _a !== void 0 ? _a : current.currentBalance,
            latestAdjustment: (_b = current.latestAdjustment) !== null && _b !== void 0 ? _b : (0, user_admin_1.getCachedLatestAdjustment)(current.openid),
            addresses: (_d = (_c = sections.addresses) !== null && _c !== void 0 ? _c : current.addresses) !== null && _d !== void 0 ? _d : [],
            pets: (_f = (_e = sections.pets) !== null && _e !== void 0 ? _e : current.pets) !== null && _f !== void 0 ? _f : [],
            petCount: (_g = sections.petCount) !== null && _g !== void 0 ? _g : current.petCount,
            balanceLedgers: (_j = (_h = sections.balanceLedgers) !== null && _h !== void 0 ? _h : current.balanceLedgers) !== null && _j !== void 0 ? _j : [],
            addressCount: (_l = (_k = sections.addresses) === null || _k === void 0 ? void 0 : _k.length) !== null && _l !== void 0 ? _l : current.addressCount,
            balanceLedgerCount: (_m = sections.balanceLedgerCount) !== null && _m !== void 0 ? _m : current.balanceLedgerCount
        };
        wx.setStorageSync('merchant-selected-user', merged);
        this.setData({
            user: merged,
            detail: (0, user_admin_1.getUserDetailViewModel)(merged, merged.latestAdjustment)
        });
        this.updateDraftPreview();
        return merged;
    },
    async loadAddresses() {
        if (!this.data.user || this.data.addressesLoading || this.data.addressesLoaded) {
            return;
        }
        this.setData({ addressesLoading: true });
        try {
            const addresses = await (0, user_admin_1.fetchMerchantUserAddresses)(this.data.user.openid);
            this.mergeDetailSections({ addresses });
            this.setData({
                addressesLoaded: true,
                addressesLoading: false
            });
        }
        catch (error) {
            this.setData({ addressesLoading: false });
            wx.showToast({
                title: '地址加载失败',
                icon: 'none'
            });
        }
    },
    async loadMoreLedgers(reset = false) {
        var _a;
        if (!this.data.user || this.data.ledgerLoading) {
            return;
        }
        if (!reset && this.data.ledgerLoaded && !this.data.ledgerHasMore) {
            return;
        }
        const cursor = reset ? '0' : this.data.ledgerNextCursor;
        this.setData({ ledgerLoading: true });
        try {
            const page = await (0, user_admin_1.fetchMerchantUserBalanceLedgers)(this.data.user.openid, {
                cursor,
                limit: 20
            });
            const currentLedgers = reset ? [] : ((_a = this.data.user.balanceLedgers) !== null && _a !== void 0 ? _a : []);
            const existingIds = new Set(currentLedgers.map((item) => item.id));
            const mergedLedgers = [
                ...currentLedgers,
                ...page.records.filter((item) => !existingIds.has(item.id))
            ];
            this.mergeDetailSections({
                balanceLedgers: mergedLedgers,
                balanceLedgerCount: page.pagination.total
            });
            this.setData({
                ledgerLoaded: true,
                ledgerLoading: false,
                ledgerHasMore: page.pagination.hasMore,
                ledgerNextCursor: page.pagination.nextCursor
            });
        }
        catch (error) {
            this.setData({ ledgerLoading: false });
            wx.showToast({
                title: '流水加载失败',
                icon: 'none'
            });
        }
    },
    updateDraftPreview() {
        if (!this.data.user) {
            return;
        }
        const draft = (0, user_admin_1.buildBalanceAdjustmentDraft)(this.data.user, {
            action: this.data.action,
            amountText: this.data.amountText,
            reasonType: this.data.reasonType,
            note: this.data.note
        });
        this.setData({
            reasonType: draft.reasonType,
            resultingBalanceLabel: draft.resultingBalanceLabel,
            disableSubmitReason: draft.disableSubmitReason
        });
    },
    handleOpenDrawer() {
        if (!this.data.canAdjustBalance) {
            wx.showToast({
                title: '当前账号不能调整储值',
                icon: 'none'
            });
            return;
        }
        this.setData({
            drawerOpen: true
        });
    },
    handleCloseDrawer() {
        this.setData({
            drawerOpen: false
        });
    },
    handleActionTap(event) {
        var _a, _b;
        const action = normalizeBalanceAction((_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.action);
        const reasonOptions = (0, user_admin_1.getBalanceAdjustmentReasonOptions)(action);
        this.setData({
            action,
            reasonOptions,
            reasonType: reasonOptions[0]
        });
        this.updateDraftPreview();
    },
    handleAmountInput(event) {
        var _a;
        const amountText = normalizeMoneyInputText((_a = event.detail) === null || _a === void 0 ? void 0 : _a.value);
        this.setData({
            amountText
        });
        this.updateDraftPreview();
        return amountText;
    },
    handleReasonTap(event) {
        var _a, _b, _c, _d;
        const reasonType = (_d = (_c = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.reason) !== null && _c !== void 0 ? _c : this.data.reasonOptions[0]) !== null && _d !== void 0 ? _d : '充值';
        this.setData({
            reasonType
        });
        this.updateDraftPreview();
    },
    handleNoteInput(event) {
        var _a, _b;
        this.setData({
            note: (_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : ''
        });
        this.updateDraftPreview();
    },
    handleDetailTabTap(event) {
        var _a, _b, _c;
        const nextTab = (_c = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.tab) !== null && _c !== void 0 ? _c : 'basic';
        this.setData({
            activeDetailTab: nextTab
        });
        if (nextTab === 'addresses') {
            void this.loadAddresses();
        }
        if (nextTab === 'ledger') {
            void this.loadMoreLedgers(false);
        }
    },
    onReachBottom() {
        if (this.data.activeDetailTab === 'ledger') {
            void this.loadMoreLedgers(false);
        }
    },
    async handleConfirmAdjust() {
        if (!this.data.user) {
            return;
        }
        const draft = (0, user_admin_1.buildBalanceAdjustmentDraft)(this.data.user, {
            action: this.data.action,
            amountText: this.data.amountText,
            reasonType: this.data.reasonType,
            note: this.data.note
        });
        if (draft.disableSubmitReason) {
            wx.showToast({
                title: draft.disableSubmitReason,
                icon: 'none'
            });
            return;
        }
        const risky = this.data.action === 'deduct';
        wx.showModal({
            title: '确认余额调整',
            content: risky
                ? '请确认本次余额调整，提交后将生成流水记录。'
                : '请确认本次余额调整，提交后将生成流水记录。',
            success: async (result) => {
                var _a;
                if (!result.confirm) {
                    return;
                }
                this.setData({ submitting: true });
                try {
                    const response = await (0, user_admin_1.submitBalanceAdjustment)(draft);
                    const updatedUser = {
                        ...this.data.user,
                        currentBalance: (_a = response.balanceAfter) !== null && _a !== void 0 ? _a : draft.afterBalance
                    };
                    wx.setStorageSync('merchant-selected-user', updatedUser);
                    this.setData({
                        submitting: false,
                        drawerOpen: false,
                        user: updatedUser,
                        amountText: '',
                        note: '',
                        ledgerLoaded: false,
                        ledgerHasMore: false,
                        ledgerNextCursor: null
                    });
                    await this.refreshDetail(updatedUser.openid);
                    if (this.data.activeDetailTab === 'ledger') {
                        await this.loadMoreLedgers(true);
                    }
                    wx.showToast({
                        title: '调整成功',
                        icon: 'success'
                    });
                }
                catch (error) {
                    this.setData({ submitting: false });
                    wx.showToast({
                        title: error instanceof Error ? error.message : '调整失败，请重试',
                        icon: 'none'
                    });
                }
            }
        });
    }
});
