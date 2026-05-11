import { PRINT_RESULT } from '../../db/enums';
import { getPrismaClient } from '../../db/prisma';
import type { DbClient } from '../../db/types';

export interface ReceiptPrintAuditInput {
  orderId: string;
  operator: {
    id: string;
    name: string;
  };
  printedAt: Date;
  printerDeviceId: string;
  printerDeviceLabel: string;
  receiptTemplateVersion: string;
  result: 'success' | 'failed';
  failureReason?: string;
  isReprint: boolean;
}

export function createReceiptPrintRepository(client: DbClient = getPrismaClient()) {
  return {
    async recordPrintResult(input: ReceiptPrintAuditInput) {
      return client.receiptPrintAudit.create({
        data: {
          orderId: input.orderId,
          operatorId: input.operator.id,
          operatorName: input.operator.name,
          printedAt: input.printedAt,
          printerDeviceId: input.printerDeviceId,
          printerDeviceLabel: input.printerDeviceLabel,
          receiptTemplateVersion: input.receiptTemplateVersion,
          result: PRINT_RESULT[input.result],
          failureReason: input.failureReason,
          isReprint: input.isReprint
        }
      });
    },

    async countPrints(orderId: string): Promise<number> {
      return client.receiptPrintAudit.count({
        where: {
          orderId,
          result: PRINT_RESULT.success
        }
      });
    }
  };
}
