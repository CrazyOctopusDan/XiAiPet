import type { PhoneBindingInput } from '../types/user';

export function normalizePhoneBinding(input: PhoneBindingInput): PhoneBindingInput & {
  maskedPhone: string;
} {
  const digits = input.phoneNumber.replace(/\s+/g, '');
  const normalizedCountryCode = input.countryCode.startsWith('+')
    ? input.countryCode
    : `+${input.countryCode}`;
  const visibleHead = digits.slice(0, 3);
  const visibleTail = digits.slice(-4);

  return {
    ...input,
    phoneNumber: digits,
    countryCode: normalizedCountryCode,
    maskedPhone: `${visibleHead}****${visibleTail}`
  };
}

export function isPhoneBindingInput(value: unknown): value is PhoneBindingInput {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.phoneNumber === 'string' &&
    candidate.phoneNumber.length > 0 &&
    typeof candidate.countryCode === 'string' &&
    candidate.countryCode.length > 0 &&
    (candidate.source === 'wechat' || candidate.source === 'manual')
  );
}
