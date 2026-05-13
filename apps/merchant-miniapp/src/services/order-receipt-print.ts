import type { OrderReceiptPrintAuditPayload, OrderReceiptPrintJob } from '@xiaipet/shared';

import { MerchantApiError, getMerchantSession, merchantApiRequest, type MerchantApiRequester } from './api-client';
import type { ReceiptPrinterConnection } from './printer';
import { getStoredReceiptPrinterConnection, writeReceiptPrinterChunks } from './printer';

interface PrintOrderReceiptInput {
  orderId: string;
}

interface PrintOrderReceiptDependencies {
  request?: MerchantApiRequester;
  getConnection?: () => ReceiptPrinterConnection | null;
  writeChunks?: (chunksBase64: string[], connection: ReceiptPrinterConnection) => Promise<void>;
  now?: () => string;
}

function getCurrentMerchantOperator() {
  const account = getMerchantSession()?.account;
  if (!account?.id || !account.username) {
    throw new MerchantApiError('MERCHANT_LOGIN_REQUIRED', '请先登录商户账号', 401);
  }

  return {
    id: account.id,
    name: account.username
  };
}

async function prepareReceiptPrintJob(orderId: string, request: MerchantApiRequester) {
  const response = await request<{
    ok?: boolean;
    job?: OrderReceiptPrintJob;
    print?: Partial<OrderReceiptPrintJob> & Record<string, unknown>;
  }>(`/api/v1/merchant/orders/${orderId}/receipt-print/prepare`, {
    method: 'POST',
    body: {},
    auth: 'merchant'
  });

  const job = response.job ?? response.print;
  if (!job) {
    throw new Error('PRINT_JOB_UNAVAILABLE');
  }

  return job as OrderReceiptPrintJob;
}

async function recordReceiptPrintResult(
  job: OrderReceiptPrintJob,
  operator: OrderReceiptPrintAuditPayload['operator'],
  connection: Pick<ReceiptPrinterConnection, 'deviceId' | 'name'>,
  result: OrderReceiptPrintAuditPayload['result'],
  request: MerchantApiRequester,
  printedAt: string,
  failureReason?: string
) {
  await request<{ ok?: boolean }>(`/api/v1/merchant/orders/${job.orderId}/receipt-print/result`, {
    method: 'POST',
    body: {
      orderId: job.orderId,
      operator,
      printedAt,
      printerDeviceId: connection.deviceId,
      printerDeviceLabel: connection.name,
      receiptTemplateVersion: job.receiptTemplateVersion,
      result,
      failureReason,
      isReprint: job.isReprint
    } satisfies OrderReceiptPrintAuditPayload,
    auth: 'merchant'
  });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'UNKNOWN_PRINT_ERROR';
}

export async function printOrderReceipt(input: PrintOrderReceiptInput, dependencies: PrintOrderReceiptDependencies = {}) {
  const request = dependencies.request ?? merchantApiRequest;
  const operator = getCurrentMerchantOperator();
  const job = await prepareReceiptPrintJob(input.orderId, request);
  const connection = dependencies.getConnection ? dependencies.getConnection() : getStoredReceiptPrinterConnection();
  const printedAt = dependencies.now?.() ?? new Date().toISOString();

  if (!connection) {
    await recordReceiptPrintResult(
      job,
      operator,
      {
        deviceId: 'unconfigured',
        name: '未配置打印机'
      },
      'failed',
      request,
      printedAt,
      'NO_PRINTER_CONNECTED'
    );
    throw new Error('NO_PRINTER_CONNECTED');
  }

  try {
    await (dependencies.writeChunks ?? writeReceiptPrinterChunks)(job.chunksBase64, connection);
    await recordReceiptPrintResult(job, operator, connection, 'success', request, printedAt);
    return job;
  } catch (error) {
    await recordReceiptPrintResult(job, operator, connection, 'failed', request, printedAt, getErrorMessage(error));
    throw error;
  }
}
