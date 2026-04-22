declare const wx: any;

interface ManualPhoneInput {
  phoneNumber: string;
  countryCode: string;
}

interface BindPhoneResponse {
  ok: boolean;
  update?: Record<string, unknown>;
}

function normalizeSubmission(input: ManualPhoneInput) {
  return {
    phoneNumber: input.phoneNumber.replace(/\s+/g, ''),
    countryCode: input.countryCode.startsWith('+') ? input.countryCode : `+${input.countryCode}`
  };
}

export async function requestWechatPhone(detail: Record<string, unknown>) {
  const response = (await wx.cloud.callFunction({
    name: 'bindPhone',
    data: {
      payload: {
        phoneNumber: String(detail.phoneNumber ?? ''),
        countryCode: String(detail.countryCode ?? '+86'),
        source: 'wechat'
      }
    }
  })) as { result: BindPhoneResponse };

  return response.result;
}

export async function submitManualPhone(input: ManualPhoneInput) {
  const normalized = normalizeSubmission(input);

  const response = (await wx.cloud.callFunction({
    name: 'bindPhone',
    data: {
      payload: {
        ...normalized,
        source: 'manual',
        phoneBindingState: 'bound',
        contactPhoneMasked: '',
        contactPhoneCountryCode: normalized.countryCode
      }
    }
  })) as { result: BindPhoneResponse };

  return response.result;
}
