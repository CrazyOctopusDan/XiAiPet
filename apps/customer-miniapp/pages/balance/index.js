"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const balance_1 = require("../../src/services/balance");
Page({
    data: {
        overview: (0, balance_1.getBalanceOverview)(),
        groups: []
    },
    onShow() {
        void this.refreshBalance();
    },
    async refreshBalance() {
        this.setData({
            overview: (0, balance_1.getBalanceOverview)(),
            groups: (0, balance_1.getMonthlyBalanceGroups)()
        });
        try {
            await (0, balance_1.hydrateBalance)();
        }
        catch (_a) {
            // Keep the latest local ledger snapshot visible if the network is unavailable.
        }
        this.setData({
            overview: (0, balance_1.getBalanceOverview)(),
            groups: (0, balance_1.getMonthlyBalanceGroups)()
        });
    }
});
