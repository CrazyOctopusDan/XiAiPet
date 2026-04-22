import type { UserRecord, UserStatus } from '../types/user';

export interface CreateUserRecordInput {
  openid: string;
  now: string;
  status?: UserStatus;
}

export function createUserRecord(input: CreateUserRecordInput): UserRecord {
  return {
    openid: input.openid,
    status: input.status ?? 'active',
    createdAt: input.now,
    updatedAt: input.now,
    lastLoginAt: input.now,
    phoneBindingState: 'unbound',
    contactPhoneMasked: '',
    contactPhoneCountryCode: ''
  };
}

export function isUserRecord(value: unknown): value is UserRecord {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.openid === 'string' &&
    typeof candidate.status === 'string' &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.updatedAt === 'string' &&
    typeof candidate.lastLoginAt === 'string' &&
    (candidate.phoneBindingState === 'unbound' || candidate.phoneBindingState === 'bound') &&
    typeof candidate.contactPhoneMasked === 'string' &&
    typeof candidate.contactPhoneCountryCode === 'string'
  );
}
