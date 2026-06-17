declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import { submitManualPhone } from '../../src/services/phone';
import { getProfile, hydrateProfile, updateProfile } from '../../src/services/profile';

interface ContactBindPageData {
  submitting: boolean;
  statusText: string;
  statusTone: 'idle' | 'success' | 'error';
  manualPhone: string;
  manualCountryCode: string;
  redirectUrl: string;
}

interface ContactBindPageInstance {
  data: ContactBindPageData;
  setData(data: Record<string, unknown>): void;
  onLoad(options?: { redirect?: string }): void;
  hydrateExistingPhone(): Promise<void>;
  commit(action: () => Promise<unknown>, fallbackContactPhone?: string): Promise<void>;
}

function maskPhone(phoneNumber: string) {
  if (phoneNumber.length < 7) {
    return phoneNumber;
  }

  return `${phoneNumber.slice(0, 3)}****${phoneNumber.slice(-4)}`;
}

function resolveRedirectUrl(value?: string) {
  if (!value) {
    return '';
  }

  try {
    const decoded = decodeURIComponent(value);
    return decoded.startsWith('/pages/') ? decoded : '';
  } catch {
    return '';
  }
}

function getEditableProfilePhone() {
  const phone = getProfile().contactPhone.trim();
  return phone && !phone.includes('*') ? phone : '';
}

Page({
  data: {
    submitting: false,
    statusText: '等待绑定手机号',
    statusTone: 'idle',
    manualPhone: '',
    manualCountryCode: '+86',
    redirectUrl: ''
  },
  onLoad(this: ContactBindPageInstance, options?: { redirect?: string }) {
    this.setData({
      redirectUrl: resolveRedirectUrl(options?.redirect),
      manualPhone: getEditableProfilePhone()
    });
    void this.hydrateExistingPhone();
  },
  async hydrateExistingPhone(this: ContactBindPageInstance) {
    if (this.data.manualPhone.trim()) {
      return;
    }

    try {
      await hydrateProfile();
      const phone = getEditableProfilePhone();
      if (phone) {
        this.setData({ manualPhone: phone });
      }
    } catch {
      // Keep the field editable when the latest profile cannot be loaded.
    }
  },
  handleManualPhoneInput(this: ContactBindPageInstance, event: { detail?: { value?: string } }) {
    this.setData({ manualPhone: event.detail?.value ?? '' });
  },
  async handleManualSubmit(this: ContactBindPageInstance) {
    const { manualPhone, manualCountryCode } = this.data;

    this.setData({ submitting: true, statusText: '正在提交手动补录', statusTone: 'idle' });
    await this.commit(
      async () => submitManualPhone({
        phoneNumber: manualPhone,
        countryCode: manualCountryCode
      }),
      manualPhone.replace(/\s+/g, '')
    );
  },
  async commit(this: ContactBindPageInstance, action: () => Promise<unknown>, fallbackContactPhone = '') {
    try {
      const result = (await action()) as {
        update?: { contactPhoneMasked?: string };
      };
      updateProfile({
        contactPhone: fallbackContactPhone,
        contactPhoneMasked: result.update?.contactPhoneMasked ?? maskPhone(fallbackContactPhone)
      });
      this.setData({ submitting: false, statusText: '联系方式已安全保存', statusTone: 'success' });
      if (this.data.redirectUrl) {
        wx.redirectTo({
          url: this.data.redirectUrl
        });
      }
    } catch (error) {
      console.error('contact bind failed', error);
      this.setData({
        submitting: false,
        statusText: '身份同步失败，请稍后重试或手动补录',
        statusTone: 'error'
      });
    }
  }
});
