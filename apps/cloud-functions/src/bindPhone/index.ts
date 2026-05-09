import { isPhoneBindingInput, normalizePhoneBinding } from '@xiaipet/shared';
import type { PhoneBindingInput } from '@xiaipet/shared/types/user';

import { getAuthContext, type FunctionContextLike } from '../shared/auth-context';
import { resolveRuntimeEnv } from '../shared/env';

export interface BindPhoneEvent {
  payload?: unknown;
  phoneCode?: string;
  openid?: string;
}

export interface WechatPhoneResolver {
  getPhoneNumber(code: string): Promise<PhoneBindingInput>;
}

function createWechatPhoneResolver(): WechatPhoneResolver {
  return {
    async getPhoneNumber(code: string) {
      const cloud = require('wx-server-sdk') as {
        init?: (options?: Record<string, unknown>) => void;
        openapi?: {
          phonenumber?: {
            getPhoneNumber?: (input: { code: string }) => Promise<{
              phone_info?: {
                phoneNumber?: string;
                purePhoneNumber?: string;
                countryCode?: string;
              };
            }>;
          };
        };
      };

      cloud.init?.();
      const result = await cloud.openapi?.phonenumber?.getPhoneNumber?.({ code });
      const phoneInfo = result?.phone_info;
      const phoneNumber = phoneInfo?.phoneNumber ?? phoneInfo?.purePhoneNumber ?? '';
      const countryCode = phoneInfo?.countryCode ? `+${phoneInfo.countryCode.replace(/^\+/, '')}` : '+86';

      if (!phoneNumber) {
        throw new Error('Wechat phone number not returned');
      }

      return {
        phoneNumber,
        countryCode,
        source: 'wechat'
      };
    }
  };
}

async function resolvePhoneBindingInput(event: BindPhoneEvent, resolver: WechatPhoneResolver) {
  if (isPhoneBindingInput(event.payload)) {
    return event.payload;
  }

  if (event.phoneCode) {
    return resolver.getPhoneNumber(event.phoneCode);
  }

  throw new Error('Invalid phone binding payload');
}

export async function main(
  event: BindPhoneEvent = {},
  context?: FunctionContextLike,
  resolver: WechatPhoneResolver = createWechatPhoneResolver()
) {
  resolveRuntimeEnv();
  const auth = getAuthContext(event as Record<string, unknown>, context);
  const input = await resolvePhoneBindingInput(event, resolver);
  const normalized = normalizePhoneBinding(input);

  return {
    ok: true,
    openid: auth.openid,
    update: {
      phoneBindingState: 'bound',
      contactPhoneMasked: normalized.maskedPhone,
      contactPhoneCountryCode: normalized.countryCode
    }
  };
}
