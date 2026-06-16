import { getPrismaClient } from '../../db/prisma';
import type { DbClient } from '../../db/types';

export function createRechargeRepository(client: DbClient = getPrismaClient()) {
  return {
    async findByOpenidAndIdempotencyKey(openid: string, idempotencyKey: string) {
      return client.rechargeTransaction.findUnique({
        where: {
          openid_idempotencyKey: {
            openid,
            idempotencyKey
          }
        }
      });
    },

    async findById(transactionId: string) {
      return client.rechargeTransaction.findUnique({
        where: {
          id: transactionId
        }
      });
    },

    async findByOutTradeNo(outTradeNo: string) {
      return client.rechargeTransaction.findUnique({
        where: {
          outTradeNo
        }
      });
    }
  };
}
