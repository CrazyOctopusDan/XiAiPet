declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import { requestWechatPhone, submitManualPhone } from '../../src/services/phone';
import { updateProfile } from '../../src/services/profile';

interface ContactBindPageData {
  submitting: boolean;
  statusText: string;
  statusTone: 'idle' | 'success' | 'error';
  privacyAuthorizationRequired: boolean;
  privacyContractName: string;
  manualPhone: string;
  manualCountryCode: string;
  redirectUrl: string;
}

interface ContactBindPageInstance {
  data: ContactBindPageData;
  setData(data: Record<string, unknown>): void;
  onLoad(options?: { redirect?: string }): void;
  commit(action: () => Promise<unknown>, fallbackMaskedPhone?: string): Promise<void>;
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

Page({
  data: {
    submitting: false,
    statusText: '等待绑定手机号',
    statusTone: 'idle',
    privacyAuthorizationRequired: false,
    privacyContractName: '隐私保护指引',
    manualPhone: '',
    manualCountryCode: '+86',
    redirectUrl: ''
  },
  onLoad(this: ContactBindPageInstance, options?: { redirect?: string }) {
    this.setData({
      redirectUrl: resolveRedirectUrl(options?.redirect)
    });
  },
  onShow(this: ContactBindPageInstance) {
    wx.getPrivacySetting?.({
      success: (result: { needAuthorization?: boolean; privacyContractName?: string }) => {
        this.setData({
          privacyAuthorizationRequired: Boolean(result.needAuthorization),
          privacyContractName: result.privacyContractName || '隐私保护指引'
        });
      }
    });
  },
  handleManualPhoneInput(this: ContactBindPageInstance, event: { detail?: { value?: string } }) {
    this.setData({ manualPhone: event.detail?.value ?? '' });
  },
  handleAgreePrivacyAuthorization(this: ContactBindPageInstance) {
    if (wx.requirePrivacyAuthorize) {
      wx.requirePrivacyAuthorize({
        success: () => {
          this.setData({
            privacyAuthorizationRequired: false,
            statusText: '已同意隐私保护指引，可以继续获取微信手机号',
            statusTone: 'success'
          });
        },
        fail: () => {
          this.setData({
            privacyAuthorizationRequired: true,
            statusText: '请先同意隐私保护指引，再使用微信手机号',
            statusTone: 'error'
          });
        }
      });
      return;
    }

    this.setData({
      privacyAuthorizationRequired: false,
      statusText: '已同意隐私保护指引，可以继续获取微信手机号',
      statusTone: 'success'
    });
  },
  async handleWechatPhone(this: ContactBindPageInstance, event: { detail?: Record<string, unknown> }) {
    const phoneNumber = String(event.detail?.phoneNumber ?? '');
    const phoneCode = String(event.detail?.code ?? '');
    const errMsg = String(event.detail?.errMsg ?? '');

    if (!phoneNumber && !phoneCode) {
      const statusText = resolveWechatPhoneFailureText(errMsg);

      this.setData({
        submitting: false,
        statusText,
        statusTone: 'error',
        privacyAuthorizationRequired: errMsg.includes('privacy') ? true : this.data.privacyAuthorizationRequired
      });
      wx.showToast?.({
        title: statusText.length > 18 ? '微信手机号授权失败' : statusText,
        icon: 'none'
      });
      return;
    }

    this.setData({ submitting: true, statusText: '正在获取微信手机号', statusTone: 'idle' });
    await this.commit(
      async () => requestWechatPhone(event.detail ?? {}),
      maskPhone(phoneNumber)
    );
  },
  async handleManualSubmit(this: ContactBindPageInstance) {
    const { manualPhone, manualCountryCode } = this.data;

    this.setData({ submitting: true, statusText: '正在提交手动补录', statusTone: 'idle' });
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

function resolveWechatPhoneFailureText(errMsg: string) {
  if (errMsg.includes('privacy')) {
    return '请先同意隐私保护指引，再使用微信手机号';
  }

  if (errMsg.includes('no permission') || errMsg.includes('has no permission')) {
    return '当前小程序账号未开通获取手机号权限';
  }

  if (errMsg.includes('deny') || errMsg.includes('cancel')) {
    return '你已取消微信手机号授权，可重新点击授权';
  }

  if (errMsg) {
    return `微信未返回手机号凭证：${errMsg}`;
  }

  return '微信未返回手机号凭证，请用真机预览并确认基础库版本';
}
