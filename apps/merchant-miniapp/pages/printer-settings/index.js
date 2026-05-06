"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const printer_1 = require("../../src/services/printer");
Page({
    data: {
        searching: false,
        connecting: false,
        testing: false,
        connectedDeviceName: '未绑定',
        devices: []
    },
    onShow() {
        this.refreshConnection();
    },
    refreshConnection(connection = (0, printer_1.getStoredReceiptPrinterConnection)()) {
        var _a;
        this.setData({
            connectedDeviceName: (_a = connection === null || connection === void 0 ? void 0 : connection.name) !== null && _a !== void 0 ? _a : '未绑定'
        });
    },
    handleBackTap() {
        wx.navigateBack();
    },
    async handleSearchTap() {
        if (this.data.searching) {
            return;
        }
        this.setData({
            searching: true,
            devices: []
        });
        try {
            const devices = await (0, printer_1.discoverReceiptPrinterDevices)();
            this.setData({
                devices
            });
            if (devices.length === 0) {
                wx.showToast({
                    title: '未发现设备',
                    icon: 'none'
                });
            }
        }
        catch (error) {
            wx.showToast({
                title: '蓝牙不可用',
                icon: 'none'
            });
        }
        finally {
            this.setData({
                searching: false
            });
        }
    },
    async handleDeviceTap(event) {
        var _a, _b, _c;
        const index = Number((_c = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.index) !== null && _c !== void 0 ? _c : -1);
        const device = this.data.devices[index];
        if (!device || this.data.connecting) {
            return;
        }
        this.setData({
            connecting: true
        });
        try {
            const connection = await (0, printer_1.connectReceiptPrinter)(device);
            this.refreshConnection(connection);
            wx.showToast({
                title: '绑定成功',
                icon: 'success'
            });
        }
        catch (error) {
            wx.showToast({
                title: '绑定失败',
                icon: 'none'
            });
        }
        finally {
            this.setData({
                connecting: false
            });
        }
    },
    async handleDisconnectTap() {
        await (0, printer_1.disconnectReceiptPrinter)();
        this.refreshConnection(null);
        wx.showToast({
            title: '已解绑',
            icon: 'success'
        });
    },
    async handleTestPrintTap() {
        if (this.data.testing) {
            return;
        }
        this.setData({
            testing: true
        });
        try {
            await (0, printer_1.printReceiptPrinterSelfTest)();
            wx.showToast({
                title: '测试已发送',
                icon: 'success'
            });
        }
        catch (error) {
            wx.showToast({
                title: '测试失败',
                icon: 'none'
            });
        }
        finally {
            this.setData({
                testing: false
            });
        }
    }
});
