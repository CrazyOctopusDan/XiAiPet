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
}

export interface MerchantUserRecord {
  openid: string;
  merchantId: string;
  storeName: string;
  enabled: boolean;
  grantedAt: string;
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
  createdAt: Date;
  updatedAt: Date;
}

interface MerchantUserRow {
  openid: string;
  merchantId: string;
  storeName: string;
  enabled: boolean;
  grantedAt: Date;
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
    contactPhoneCountryCode: row.contactPhoneCountryCode
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

    async getMerchantByOpenid(openid: string): Promise<MerchantUserRecord | null> {
      const merchantUser = await client.merchantUser.findUnique({ where: { openid } });
      if (!merchantUser) {
        return null;
      }
      const row = merchantUser as MerchantUserRow;
      return {
        openid: row.openid,
        merchantId: row.merchantId,
        storeName: row.storeName,
        enabled: row.enabled,
        grantedAt: row.grantedAt.toISOString()
      };
    },

    async searchUsers(query: string, limit = 20): Promise<MerchantUserSearchItem[]> {
      const users = await client.user.findMany({
        where: {
          OR: [
            { openid: { contains: query } },
            { contactPhoneMasked: { contains: query } }
          ]
        },
        include: {
          balanceAccount: true
        },
        orderBy: { updatedAt: 'desc' },
        take: limit
      });

      return users.map((user) => ({
        openid: user.openid,
        avatarUrl: '',
        nickname: user.openid,
        contactPhoneMasked: user.contactPhoneMasked,
        membershipTierLabel: '普通会员',
        currentBalance: user.balanceAccount?.balance.toNumber() ?? 0
      }));
    }
  };
}
