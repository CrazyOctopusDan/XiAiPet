declare function Page(options: Record<string, unknown>): void;

import { verifyMerchantAccess } from '../../src/services/access';

interface AccessGatePageInstance {
  setData(data: Record<string, unknown>): void;
}

Page({
  data: {
    statusText: '等待校验',
    accessResult: 'unknown'
  },
  async handleVerifyTap(this: AccessGatePageInstance) {
    this.setData({ statusText: '正在校验商户权限' });

    try {
      const result = await verifyMerchantAccess();
      const allowed = Boolean(result?.allowed);
      this.setData({
        accessResult: allowed ? 'allowed' : 'denied',
        statusText: allowed ? '白名单已放行' : '当前账号还没有商户权限'
      });

      if (allowed) {
        wx.redirectTo({
          url: '/pages/workspace/index'
        });
      }
    } catch (error) {
      this.setData({
        accessResult: 'denied',
        statusText: '身份同步失败，请下拉重试'
      });
    }
  }
});
