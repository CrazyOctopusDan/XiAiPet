declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import { requestWechatPhone, submitManualPhone } from '../../src/services/phone';
import { updateProfile } from '../../src/services/profile';

interface ContactBindPageData {
  manualPhone: string;
  manualCountryCode: string;
}

interface ContactBindPageInstance {
  data: ContactBindPageData;
  setData(data: Record<string, unknown>): void;
  commit(action: () => Promise<unknown>, fallbackMaskedPhone?: string): Promise<void>;
}

function maskPhone(phoneNumber: string) {
  if (phoneNumber.length < 7) {
    return phoneNumber;
  }

  return `${phoneNumber.slice(0, 3)}****${phoneNumber.slice(-4)}`;
}

Page({
  data: {
    submitting: false,
    statusText: '等待绑定手机号',
    manualPhone: '',
    manualCountryCode: '+86'
  },
  handleManualPhoneInput(this: ContactBindPageInstance, event: { detail?: { value?: string } }) {
    this.setData({ manualPhone: event.detail?.value ?? '' });
  },
  async handleWechatPhone(this: ContactBindPageInstance, event: { detail?: Record<string, unknown> }) {
    this.setData({ submitting: true, statusText: '正在获取微信手机号' });
    await this.commit(
      async () => requestWechatPhone(event.detail ?? {}),
      maskPhone(String(event.detail?.phoneNumber ?? ''))
    );
  },
  async handleManualSubmit(this: ContactBindPageInstance) {
    const { manualPhone, manualCountryCode } = this.data;

    this.setData({ submitting: true, statusText: '正在提交手动补录' });
    await this.commit(
      async () => submitManualPhone({
        phoneNumber: manualPhone,
        countryCode: manualCountryCode
      }),
      maskPhone(manualPhone.replace(/\s+/g, ''))
    );
  },
  async commit(this: ContactBindPageInstance, action: () => Promise<unknown>, fallbackMaskedPhone = '') {
    try {
      const result = (await action()) as {
        update?: { contactPhoneMasked?: string };
      };
      updateProfile({
        contactPhoneMasked: result.update?.contactPhoneMasked ?? fallbackMaskedPhone
      });
      this.setData({ submitting: false, statusText: '联系方式已安全保存' });
    } catch (error) {
      console.error('contact bind failed', error);
      this.setData({
        submitting: false,
        statusText: `身份同步失败：${error instanceof Error ? error.message : '请下拉重试'}`
      });
    }
  }
});
