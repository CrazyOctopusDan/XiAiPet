"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const workspace_1 = require("../../src/services/workspace");
Page({
    data: {
        cards: (0, workspace_1.getMerchantWorkspaceCards)()
    },
    onShow() {
        this.setData({
            cards: (0, workspace_1.getMerchantWorkspaceCards)()
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
