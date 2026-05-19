import { PHONE_BINDING_STATE, USER_STATUS, toSharedEnum } from '../../db/enums';
import { getPrismaClient } from '../../db/prisma';
import type { DbClient } from '../../db/types';

export interface UserRecord {
  openid: string;
  status: 'active' | 'disabled';
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
  phoneBindingState: 'unbound' | 'bound';
  contactPhoneMasked: string;
  contactPhoneCountryCode: string;
  profile?: CustomerProfileRecord;
}

export interface CustomerProfileRecord {
  nickname?: string;
  avatarText?: string;
  avatarUrl?: string;
  gender?: 'unknown' | 'female' | 'male';
  birthday?: string;
  birthdayLocked?: boolean;
  contactPhoneMasked?: string;
}

export interface MerchantUserSearchItem {
  openid: string;
  avatarUrl: string;
  nickname: string;
  contactPhoneMasked: string;
  membershipTierLabel: string;
  currentBalance: number;
}

export interface MerchantLatestAdjustment {
  normalizedTitle: string;
  shortNote: string;
  operatedAt: string;
  operatorName: string;
}

export interface MerchantUserDetailItem extends MerchantUserSearchItem {
  latestAdjustment: MerchantLatestAdjustment | null;
}

interface UserRow {
  openid: string;
  status: string;
  phoneBindingState: string;
  contactPhoneMasked: string;
  contactPhoneCountryCode: string;
  lastLoginAt: Date | null;
  profile: unknown | null;
  createdAt: Date;
  updatedAt: Date;
}

interface MerchantUserSearchRow extends UserRow {
  balanceAccount?: {
    balance: {
      toNumber(): number;
    };
  } | null;
}

interface CustomerProfileRow extends UserRow {
  balanceAccount?: {
    balance: {
      toNumber(): number;
    };
  } | null;
}

interface BalanceLedgerRow {
  amountDelta: {
    toNumber(): number;
  };
  reason: string | null;
  operatorName: string | null;
  createdAt: Date;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeProfile(value: unknown): CustomerProfileRecord | undefined {
  if (!isObject(value)) {
    return undefined;
  }

  return {
    nickname: typeof value.nickname === 'string' ? value.nickname : undefined,
    avatarText: typeof value.avatarText === 'string' ? value.avatarText : undefined,
    avatarUrl: typeof value.avatarUrl === 'string' ? value.avatarUrl : undefined,
    gender:
      value.gender === 'unknown' || value.gender === 'female' || value.gender === 'male'
        ? value.gender
        : undefined,
    birthday: typeof value.birthday === 'string' ? value.birthday : undefined,
    birthdayLocked: typeof value.birthdayLocked === 'boolean' ? value.birthdayLocked : undefined,
    contactPhoneMasked: typeof value.contactPhoneMasked === 'string' ? value.contactPhoneMasked : undefined
  };
}

function toMaskedPhoneSearchQuery(query: string) {
  const digits = query.replace(/\D/g, '');
  if (digits.length < 7) {
    return null;
  }
  const localDigits = digits.length > 11 ? digits.slice(-11) : digits;
  return `${localDigits.slice(0, 3)}****${localDigits.slice(-4)}`;
}

function formatMoney(value: number) {
  return `￥${Math.abs(value).toFixed(2)}`;
}

function getBalanceAdjustmentShortNote(delta: number) {
  if (delta > 0) {
    return `增加 ${formatMoney(delta)}`;
  }
  if (delta < 0) {
    return `扣减 ${formatMoney(delta)}`;
  }
  return '余额未变化';
}

function mapMerchantUser(user: MerchantUserSearchRow): MerchantUserSearchItem {
  const profile = normalizeProfile(user.profile);
  return {
    openid: user.openid,
    avatarUrl: profile?.avatarUrl ?? profile?.avatarText ?? '',
    nickname: profile?.nickname || user.openid,
    contactPhoneMasked: profile?.contactPhoneMasked || user.contactPhoneMasked,
    membershipTierLabel: '普通会员',
    currentBalance: user.balanceAccount?.balance.toNumber() ?? 0
  };
}

function mapLatestAdjustment(row: BalanceLedgerRow | null): MerchantLatestAdjustment | null {
  if (!row) {
    return null;
  }
  const amountDelta = row.amountDelta.toNumber();
  const [reasonType] = (row.reason ?? '').split(/:\s*/, 2);
  return {
    normalizedTitle: reasonType || '余额调整',
    shortNote: getBalanceAdjustmentShortNote(amountDelta),
    operatedAt: row.createdAt.toISOString(),
    operatorName: row.operatorName || '商户后台'
  };
}

export function mapUser(row: UserRow): UserRecord {
  return {
    openid: row.openid,
    status: toSharedEnum(row.status, USER_STATUS),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastLoginAt: (row.lastLoginAt ?? row.updatedAt).toISOString(),
    phoneBindingState: toSharedEnum(row.phoneBindingState, PHONE_BINDING_STATE),
    contactPhoneMasked: row.contactPhoneMasked,
    contactPhoneCountryCode: row.contactPhoneCountryCode,
    profile: normalizeProfile(row.profile)
  };
}

export function createUserRepository(client: DbClient = getPrismaClient()) {
  return {
    async getByOpenid(openid: string): Promise<UserRecord | null> {
      const user = await client.user.findUnique({ where: { openid } });
      return user ? mapUser(user) : null;
    },

    async bootstrap(openid: string, at: Date = new Date()): Promise<UserRecord> {
      const user = await client.user.upsert({
        where: { openid },
        update: {
          lastLoginAt: at
        },
        create: {
          openid,
          status: USER_STATUS.active,
          phoneBindingState: PHONE_BINDING_STATE.unbound,
          contactPhoneMasked: '',
          contactPhoneCountryCode: '+86',
          lastLoginAt: at
        }
      });
      return mapUser(user);
    },

    async bindPhone(
      openid: string,
      input: { maskedPhone: string; countryCode: string },
      at: Date = new Date()
    ): Promise<UserRecord> {
      await this.bootstrap(openid, at);
      const user = await client.user.update({
        where: { openid },
        data: {
          phoneBindingState: PHONE_BINDING_STATE.bound,
          contactPhoneMasked: input.maskedPhone,
          contactPhoneCountryCode: input.countryCode,
          updatedAt: at
        }
      });
      return mapUser(user);
    },

    async updateProfile(
      openid: string,
      input: CustomerProfileRecord,
      at: Date = new Date()
    ): Promise<UserRecord> {
      await this.bootstrap(openid, at);
      const existing = await client.user.findUnique({ where: { openid } });
      const profile = {
        ...(normalizeProfile(existing?.profile) ?? {}),
        ...input,
        updatedAt: at.toISOString()
      };
      const user = await client.user.update({
        where: { openid },
        data: {
          profile,
          updatedAt: at
        }
      });
      return mapUser(user);
    },

    async getCustomerProfile(openid: string) {
      await this.bootstrap(openid);
      const user = await client.user.findUnique({
        where: { openid },
        include: { balanceAccount: true }
      }) as CustomerProfileRow | null;
      const profile = normalizeProfile(user?.profile);
      return {
        avatarText: profile?.avatarText ?? '喜',
        nickname: profile?.nickname ?? '喜爱宠家长',
        gender: profile?.gender ?? 'unknown',
        memberLevel: '普通会员',
        balance: user?.balanceAccount?.balance.toNumber() ?? 0,
        totalSpent: 0,
        birthday: profile?.birthday ?? '',
        birthdayLocked: profile?.birthdayLocked ?? false,
        contactPhoneMasked: profile?.contactPhoneMasked || user?.contactPhoneMasked || ''
      };
    },

    async getMerchantUserDetail(openid: string): Promise<{ ok: true; user: MerchantUserDetailItem | null }> {
      const user = await client.user.findUnique({
        where: { openid },
        include: { balanceAccount: true }
      }) as MerchantUserSearchRow | null;

      if (!user || user.phoneBindingState !== PHONE_BINDING_STATE.bound) {
        return { ok: true as const, user: null };
      }

      const latestLedger = await client.balanceLedger.findFirst({
        where: { openid },
        orderBy: { createdAt: 'desc' }
      }) as BalanceLedgerRow | null;

      return {
        ok: true as const,
        user: {
          ...mapMerchantUser(user),
          latestAdjustment: mapLatestAdjustment(latestLedger)
        }
      };
    },

    async searchUsers(query: string, limit = 20): Promise<MerchantUserSearchItem[]> {
      const trimmedQuery = query.trim();
      const maskedPhoneQuery = toMaskedPhoneSearchQuery(trimmedQuery);
      const where = trimmedQuery
        ? {
            phoneBindingState: PHONE_BINDING_STATE.bound,
            OR: [
              { openid: { contains: trimmedQuery } },
              { contactPhoneMasked: { contains: trimmedQuery } },
              ...(maskedPhoneQuery ? [{ contactPhoneMasked: { contains: maskedPhoneQuery } }] : []),
              { profile: { path: '$.nickname', string_contains: trimmedQuery } }
            ]
          }
        : {
            phoneBindingState: PHONE_BINDING_STATE.bound
          };
      const users = await client.user.findMany({
        where,
        include: {
          balanceAccount: true
        },
        orderBy: { updatedAt: 'desc' },
        take: limit
      });

      return (users as MerchantUserSearchRow[]).map(mapMerchantUser);
    }
  };
}
