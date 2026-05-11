import { ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS } from '../../db/enums';
import { getPrismaClient } from '../../db/prisma';
import type { DbClient } from '../../db/types';

export interface PaymentUpsertInput {
  orderId: string;
  method: 'wechat' | 'balance';
  status: 'pending' | 'processing' | 'paid' | 'failed';
  outTradeNo?: string;
  prepayId?: string;
  transactionId?: string;
  failureCode?: string;
  failureMessage?: string;
  paidAt?: Date;
}

export function createPaymentRepository(client: DbClient = getPrismaClient()) {
  return {
    async upsertPayment(input: PaymentUpsertInput) {
      return client.payment.upsert({
        where: { orderId: input.orderId },
        update: {
          method: PAYMENT_METHOD[input.method],
          status: PAYMENT_STATUS[input.status],
          outTradeNo: input.outTradeNo,
          prepayId: input.prepayId,
          transactionId: input.transactionId,
          failureCode: input.failureCode,
          failureMessage: input.failureMessage,
          paidAt: input.paidAt
        },
        create: {
          orderId: input.orderId,
          method: PAYMENT_METHOD[input.method],
          status: PAYMENT_STATUS[input.status],
          outTradeNo: input.outTradeNo,
          prepayId: input.prepayId,
          transactionId: input.transactionId,
          failureCode: input.failureCode,
          failureMessage: input.failureMessage,
          paidAt: input.paidAt
        }
      });
    },

    async markOrderPaid(orderId: string, paidAt: Date = new Date()) {
      return client.order.update({
        where: { id: orderId },
        data: {
          status: ORDER_STATUS.paid,
          paymentStatus: PAYMENT_STATUS.paid,
          paidAt
        }
      });
    }
  };
}
