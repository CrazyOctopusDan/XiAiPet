import {
  isMerchantUserSearchInput,
  type MerchantUserSearchInput,
  type MerchantUserSearchListItem
} from '../../../../packages/shared/src/schema/user-admin';

import { main as assertMerchantAccess } from '../assertMerchantAccess/index';
import { type FunctionContextLike } from '../shared/auth-context';
import { resolveRuntimeEnv } from '../shared/env';

export interface SearchMerchantUsersEvent {
  input?: unknown;
  merchantUser?: unknown;
  openid?: string;
}

export interface MerchantUserSearchRepository {
  searchUsers(input: MerchantUserSearchInput): Promise<MerchantUserSearchListItem[]>;
}

function createMerchantUserSearchRepository(): MerchantUserSearchRepository {
  try {
    const cloud = require('wx-server-sdk') as {
      init?: () => void;
      database?: () => {
        collection: (name: string) => {
          get: () => Promise<{ data: Array<Record<string, unknown>> }>;
        };
      };
    };

    cloud.init?.();
    const db = cloud.database?.();

    return {
      async searchUsers(input) {
        if (!db) {
          return [];
        }

        const users = (await db.collection('users').get()).data ?? [];
        const accounts = (await db.collection('balance_accounts').get()).data ?? [];
        const query = input.query.trim();

        return users
          .filter((user) => {
            if (input.searchField === 'phone') {
              return String(user.contactPhoneMasked ?? '').includes(query) || String(user.contactPhone ?? '').includes(query);
            }

            return String(user.nickname ?? '').includes(query);
          })
          .map((user) => ({
            openid: String(user.openid ?? ''),
            avatarUrl: String(user.avatarUrl ?? ''),
            nickname: String(user.nickname ?? ''),
            contactPhoneMasked: String(user.contactPhoneMasked ?? ''),
            membershipTierLabel: String(user.membershipTierLabel ?? '普通会员'),
            currentBalance: Number(
              accounts.find((account) => account.openid === user.openid)?.balance ?? 0
            )
          }));
      }
    };
  } catch (error) {
    return {
      async searchUsers() {
        return [];
      }
    };
  }
}

export async function main(
  event: SearchMerchantUsersEvent = {},
  context?: FunctionContextLike,
  repository: MerchantUserSearchRepository = createMerchantUserSearchRepository()
) {
  resolveRuntimeEnv(process.env.CLOUDBASE_ENV_NAME ?? 'dev');
  const access = await assertMerchantAccess(event, context);

  if (!access.allowed) {
    throw new Error('MERCHANT_FORBIDDEN');
  }

  if (!isMerchantUserSearchInput(event.input)) {
    throw new Error('INVALID_SEARCH_INPUT');
  }

  return {
    ok: true,
    users: await repository.searchUsers(event.input)
  };
}
