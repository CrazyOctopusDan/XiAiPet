import { USER_GIFT_STATUS } from '../../db/enums';
import { getPrismaClient } from '../../db/prisma';
import type { DbClient } from '../../db/types';

export function createGiftRepository(client: DbClient = getPrismaClient()) {
  return {
    async listByOpenid(openid: string) {
      return client.userGift.findMany({
        where: {
          openid
        },
        orderBy: [
          { status: 'asc' },
          { expiresAt: 'asc' },
          { createdAt: 'desc' }
        ]
      });
    },

    async listCheckoutEligible(openid: string, now: Date) {
      return client.userGift.findMany({
        where: {
          openid,
          status: USER_GIFT_STATUS.available,
          expiresAt: {
            gt: now
          }
        },
        orderBy: [
          { expiresAt: 'asc' },
          { createdAt: 'desc' }
        ]
      });
    }
  };
}
