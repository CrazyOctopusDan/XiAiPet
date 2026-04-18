import type { MerchantUserRecord } from '@xiaipet/shared';

export interface MerchantUserStore {
  getByOpenid(openid: string): Promise<MerchantUserRecord | null>;
}

function getCloudDatabase() {
  try {
    const cloud = require('wx-server-sdk') as {
      init?: (options?: Record<string, unknown>) => void;
      database?: () => {
        collection: (name: string) => {
          where: (query: Record<string, unknown>) => {
            get: () => Promise<{ data: MerchantUserRecord[] }>;
          };
        };
      };
    };

    cloud.init?.();
    return cloud.database?.();
  } catch (error) {
    return undefined;
  }
}

export function createMerchantUserStore(): MerchantUserStore {
  return {
    async getByOpenid(openid) {
      const db = getCloudDatabase();

      if (!db) {
        return null;
      }

      const result = await db.collection('merchant_users').where({ openid }).get();
      return result.data[0] ?? null;
    }
  };
}
