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
        avatarText: profile?.avatarText ?? '虾',
        nickname: profile?.nickname ?? '虾衣宠家长',
        gender: profile?.gender ?? 'unknown',
        memberLevel: '普通会员',
        balance: user?.balanceAccount?.balance.toNumber() ?? 0,
        totalSpent: 0,
        birthday: profile?.birthday ?? '',
        birthdayLocked: profile?.birthdayLocked ?? false,
        contactPhoneMasked: profile?.contactPhoneMasked || user?.contactPhoneMasked || ''
      };
    },

    async searchUsers(query: string, limit = 20): Promise<MerchantUserSearchItem[]> {
      const users = await client.user.findMany({
        where: {
          OR: [
            { openid: { contains: query } },
            { contactPhoneMasked: { contains: query } },
            { profile: { path: '$.nickname', string_contains: query } }
          ]
        },
        include: {
          balanceAccount: true
        },
        orderBy: { updatedAt: 'desc' },
        take: limit
      });

      return (users as MerchantUserSearchRow[]).map((user) => {
        const profile = normalizeProfile(user.profile);
        return {
          openid: user.openid,
          avatarUrl: profile?.avatarUrl ?? profile?.avatarText ?? '',
          nickname: profile?.nickname || user.openid,
          contactPhoneMasked: profile?.contactPhoneMasked || user.contactPhoneMasked,
          membershipTierLabel: '普通会员',
          currentBalance: user.balanceAccount?.balance.toNumber() ?? 0
        };
      });
    }
  };
}
