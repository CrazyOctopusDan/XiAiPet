import type { OrderReceiptPrintAuditPayload } from '@xiaipet/shared';
import { isOrderReceiptPrintAuditPayload } from '@xiaipet/shared';

import type { MerchantManagedOrderRecord, OrderStore } from '../shared/order-store';
import { main as assertMerchantAccess } from '../assertMerchantAccess/index';
import { type FunctionContextLike } from '../shared/auth-context';
import { resolveRuntimeEnv } from '../shared/env';
import { createOrderStore } from '../shared/order-store';
import { applyReceiptPrintAudit } from '../shared/order-receipt-print';

export interface RecordOrderReceiptPrintResultEvent extends Partial<OrderReceiptPrintAuditPayload> {
  merchantUser?: unknown;
  openid?: string;
}

function toAuditPayloadCandidate(event: RecordOrderReceiptPrintResultEvent) {
  return {
    orderId: event.orderId,
    operator: event.operator,
    printedAt: event.printedAt,
    printerDeviceId: event.printerDeviceId,
    printerDeviceLabel: event.printerDeviceLabel,
    receiptTemplateVersion: event.receiptTemplateVersion,
    result: event.result,
    failureReason: event.failureReason,
    isReprint: event.isReprint
  };
}

export async function main(
  event: RecordOrderReceiptPrintResultEvent = {},
  context?: FunctionContextLike,
  store: Pick<OrderStore, 'getById' | 'save'> = createOrderStore()
) {
  resolveRuntimeEnv(process.env.CLOUDBASE_ENV_NAME ?? 'dev');
  const access = await assertMerchantAccess(event, context);

  if (!access.allowed) {
    throw new Error('MERCHANT_FORBIDDEN');
  }

  const payload = toAuditPayloadCandidate(event);

  if (!isOrderReceiptPrintAuditPayload(payload)) {
    throw new Error('INVALID_PRINT_AUDIT');
  }

  const order = (await store.getById(payload.orderId)) as MerchantManagedOrderRecord | null;

  if (!order) {
    throw new Error('ORDER_NOT_FOUND');
  }

  return {
    ok: true,
    order: await store.save(applyReceiptPrintAudit(order, payload))
  };
}
