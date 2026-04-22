declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import { startCustomerBootstrap } from '../../src/services/auth';

interface LaunchPageInstance {
  setData(data: Record<string, unknown>): void;
  syncIdentity(): Promise<void>;
}

Page({
  data: {
    loading: false,
    envLabel: 'dev',
    statusText: '等待授权'
  },
  async onLoad(this: LaunchPageInstance) {
    await this.syncIdentity();
  },
  async handleBootstrapTap(this: LaunchPageInstance) {
    await this.syncIdentity();
  },
  async syncIdentity(this: LaunchPageInstance) {
    this.setData({ loading: true, statusText: '正在同步微信身份' });

    try {
      const result = await startCustomerBootstrap();
      this.setData({
        loading: false,
        statusText: result.ok ? '已连接微信身份' : '身份同步失败'
      });

      if (result.ok) {
        wx.switchTab({
          url: '/pages/home/index'
        });
      }
    } catch (error) {
      console.error('customer bootstrap failed', error);
      this.setData({
        loading: false,
        statusText: `身份同步失败：${error instanceof Error ? error.message : '请下拉重试'}`
      });
    }
  }
});
