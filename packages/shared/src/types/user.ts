export type UserStatus = 'active' | 'disabled';
export type PhoneBindingState = 'unbound' | 'bound';

export interface UserRecord {
  openid: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
  phoneBindingState: PhoneBindingState;
  contactPhoneMasked: string;
  contactPhoneCountryCode: string;
}

export interface MerchantUserRecord {
  openid: string;
  merchantId: string;
  storeName: string;
  enabled: boolean;
  grantedAt: string;
}

export interface PhoneBindingInput {
  phoneNumber: string;
  countryCode: string;
  source: 'wechat' | 'manual';
}

export interface RuntimeEnvConfig {
  envName: 'dev' | 'prod';
  envId: string;
  appId: string;
  releaseChannel: 'manual-dev' | 'manual-prod';
}
