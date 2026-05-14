declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import type { ReceiptPrinterCandidate, ReceiptPrinterConnection } from '../../src/services/printer';
import {
  connectReceiptPrinter,
  disconnectReceiptPrinter,
  discoverReceiptPrinterDevices,
  getReceiptPrinterSettingsViewModel,
  getStoredReceiptPrinterConnection,
  printReceiptPrinterSelfTest
} from '../../src/services/printer';

interface PrinterSettingsPageData {
  searching: boolean;
  connecting: boolean;
  testing: boolean;
  connectedDeviceName: string;
  devices: ReceiptPrinterCandidate[];
  view: ReturnType<typeof getReceiptPrinterSettingsViewModel>;
}

interface PrinterSettingsPageInstance {
  data: PrinterSettingsPageData;
  setData(updates: Record<string, unknown>): void;
  refreshConnection(connection?: ReceiptPrinterConnection | null): void;
}

Page({
  data: {
    searching: false,
    connecting: false,
    testing: false,
    connectedDeviceName: '未绑定',
    devices: [],
    view: getReceiptPrinterSettingsViewModel('未绑定', [])
  },
  onShow(this: PrinterSettingsPageInstance) {
    this.refreshConnection();
  },
  refreshConnection(this: PrinterSettingsPageInstance, connection = getStoredReceiptPrinterConnection()) {
    const connectedDeviceName = connection?.name ?? '未绑定';

    this.setData({
      connectedDeviceName,
      view: getReceiptPrinterSettingsViewModel(connectedDeviceName, this.data.devices)
    });
  },
  handleBackTap() {
    wx.navigateBack();
  },
  async handleSearchTap(this: PrinterSettingsPageInstance) {
    if (this.data.searching) {
      return;
    }

    this.setData({
      searching: true,
      devices: [],
      view: getReceiptPrinterSettingsViewModel(this.data.connectedDeviceName, [])
    });

    try {
      const devices = await discoverReceiptPrinterDevices();

      this.setData({
        devices,
        view: getReceiptPrinterSettingsViewModel(this.data.connectedDeviceName, devices)
      });

      if (devices.length === 0) {
        wx.showToast({
          title: '未发现设备',
          icon: 'none'
        });
      }
    } catch (error) {
      wx.showToast({
        title: '蓝牙不可用',
        icon: 'none'
      });
    } finally {
      this.setData({
        searching: false
      });
    }
  },
  async handleDeviceTap(this: PrinterSettingsPageInstance, event: { currentTarget?: { dataset?: { index?: string } } }) {
    const index = Number(event.currentTarget?.dataset?.index ?? -1);
    const device = this.data.devices[index];

    if (!device || this.data.connecting) {
      return;
    }

    this.setData({
      connecting: true
    });

    try {
      const connection = await connectReceiptPrinter(device);
      this.refreshConnection(connection);
      wx.showToast({
        title: '绑定成功',
        icon: 'success'
      });
    } catch (error) {
      wx.showToast({
        title: '绑定失败',
        icon: 'none'
      });
    } finally {
      this.setData({
        connecting: false
      });
    }
  },
  async handleDisconnectTap(this: PrinterSettingsPageInstance) {
    await disconnectReceiptPrinter();
    this.refreshConnection(null);
    wx.showToast({
      title: '已解绑',
      icon: 'success'
    });
  },
  async handleTestPrintTap(this: PrinterSettingsPageInstance) {
    if (this.data.testing) {
      return;
    }

    this.setData({
      testing: true
    });

    try {
      await printReceiptPrinterSelfTest();
      wx.showToast({
        title: '测试已发送',
        icon: 'success'
      });
    } catch (error) {
      wx.showToast({
        title: '测试失败',
        icon: 'none'
      });
    } finally {
      this.setData({
        testing: false
      });
    }
  }
});
