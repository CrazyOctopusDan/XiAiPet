import { isPhoneBindingInput, normalizePhoneBinding } from '@xiaipet/shared';

import { getAuthContext, type FunctionContextLike } from '../shared/auth-context';
import { resolveRuntimeEnv } from '../shared/env';

export interface BindPhoneEvent {
  payload?: unknown;
  openid?: string;
}

export async function main(event: BindPhoneEvent = {}, context?: FunctionContextLike) {
  resolveRuntimeEnv();
  const auth = getAuthContext(event as Record<string, unknown>, context);

  if (!isPhoneBindingInput(event.payload)) {
    throw new Error('Invalid phone binding payload');
  }

  const normalized = normalizePhoneBinding(event.payload);

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
