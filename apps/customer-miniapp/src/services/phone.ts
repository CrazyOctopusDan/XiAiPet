import { customerApiRequest, type CustomerApiRequester } from './api-client';

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

export async function requestWechatPhone(
  detail: Record<string, unknown>,
  request: CustomerApiRequester = customerApiRequest
) {
  const phoneNumber = String(detail.phoneNumber ?? '');
  const phoneCode = String(detail.code ?? '');
  const body = phoneNumber
    ? {
        payload: {
          phoneNumber,
          countryCode: String(detail.countryCode ?? '+86'),
          source: 'wechat'
        }
      }
    : {
        phoneCode
      };

  return request<BindPhoneResponse>('/api/v1/customer/profile/phone', {
    method: 'POST',
    body,
    auth: 'customer'
  });
}

export async function submitManualPhone(
  input: ManualPhoneInput,
  request: CustomerApiRequester = customerApiRequest
) {
  const normalized = normalizeSubmission(input);

  return request<BindPhoneResponse>('/api/v1/customer/profile/phone', {
    method: 'POST',
    body: {
      payload: {
        ...normalized,
        source: 'manual',
        phoneBindingState: 'bound',
        contactPhoneMasked: '',
        contactPhoneCountryCode: normalized.countryCode
      }
    },
    auth: 'customer'
  });
}
