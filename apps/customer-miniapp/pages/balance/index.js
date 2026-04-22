"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const balance_1 = require("../../src/services/balance");
Page({
    data: {
        overview: (0, balance_1.getBalanceOverview)(),
        groups: []
    },
    onShow() {
        this.refreshBalance();
    },
    refreshBalance() {
        this.setData({
            overview: (0, balance_1.getBalanceOverview)(),
            groups: (0, balance_1.getMonthlyBalanceGroups)()
        });
    }
});
