"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_client_1 = require("../../src/services/api-client");
const workspace_1 = require("../../src/services/workspace");
Page({
    data: {
        cards: (0, workspace_1.getMerchantWorkspaceCards)()
    },
    onShow() {
        var _a, _b, _c;
        const role = (_c = (_b = (_a = (0, api_client_1.getMerchantSession)()) === null || _a === void 0 ? void 0 : _a.account) === null || _b === void 0 ? void 0 : _b.role) !== null && _c !== void 0 ? _c : 'admin';
        this.setData({
            cards: (0, workspace_1.getMerchantWorkspaceCards)(role)
        });
    },
    handleActionTap(event) {
        var _a, _b;
        const url = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.url;
        if (!url) {
            return;
        }
        wx.navigateTo({
            url
        });
    }
});
