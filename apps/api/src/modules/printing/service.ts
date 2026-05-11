import { ApiError } from '../../lib/errors';
import type { MerchantContext } from '../auth/types';
import { createOrderRepository } from '../orders/repository';
import { createReceiptPrintRepository } from './repository';

interface OrderReceiptPrintAuditPayload {
  printedAt: string;
  printerDeviceId: string;
  printerDeviceLabel: string;
  receiptTemplateVersion: string;
  result: 'success' | 'failed';
  failureReason?: string;
  isReprint: boolean;
}

function isOrderReceiptPrintAuditPayload(value: unknown): value is OrderReceiptPrintAuditPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.printedAt === 'string' &&
    typeof candidate.printerDeviceId === 'string' &&
    typeof candidate.printerDeviceLabel === 'string' &&
    typeof candidate.receiptTemplateVersion === 'string' &&
    (candidate.result === 'success' || candidate.result === 'failed') &&
    typeof candidate.isReprint === 'boolean'
  );
}

export function createPrintingService(
  orderRepository = createOrderRepository(),
  receiptPrintRepository = createReceiptPrintRepository()
) {
  return {
    async prepareOrderReceiptPrint(merchantContext: MerchantContext, orderId: string, payload: unknown = {}) {
      const order = await orderRepository.getById(orderId);
      if (!order) {
        throw new ApiError('ORDER_NOT_FOUND', 'Order not found', 404);
      }
      const printCount = await receiptPrintRepository.countPrints(orderId);
      return {
        ok: true as const,
        order,
        print: {
          orderId,
          isReprint: printCount > 0,
          printCount,
          preparedBy: merchantContext.openid,
          payload
        }
      };
    },

    async recordOrderReceiptPrintResult(merchantContext: MerchantContext, orderId: string, payload: unknown) {
      if (!isOrderReceiptPrintAuditPayload(payload)) {
        throw new ApiError('INVALID_PRINT_RESULT', 'Invalid print result payload', 400);
      }
      const audit = await receiptPrintRepository.recordPrintResult({
        orderId,
        operator: {
          id: merchantContext.openid,
          name: merchantContext.storeName
        },
        printedAt: new Date(payload.printedAt),
        printerDeviceId: payload.printerDeviceId,
        printerDeviceLabel: payload.printerDeviceLabel,
        receiptTemplateVersion: payload.receiptTemplateVersion,
        result: payload.result,
        failureReason: payload.failureReason,
        isReprint: payload.isReprint
      });
      return { ok: true as const, audit };
    }
  };
}
