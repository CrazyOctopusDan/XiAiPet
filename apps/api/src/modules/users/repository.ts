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
    }
  };
}
