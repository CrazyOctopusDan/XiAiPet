declare const wx: any;

import type { OrderReceiptPrintAuditPayload, OrderReceiptPrintJob } from '@xiaipet/shared';

import { verifyMerchantAccess } from './access';
import type { ReceiptPrinterConnection } from './printer';
import { getStoredReceiptPrinterConnection, writeReceiptPrinterChunks } from './printer';

interface MerchantAccessResult {
  allowed?: boolean;
  merchant?: {
    merchantId: string;
    storeName: string;
  };
  result?: MerchantAccessResult;
}

interface PrintOrderReceiptInput {
  orderId: string;
}

interface PrintOrderReceiptDependencies {
  callFunction?: (payload: Record<string, unknown>) => Promise<unknown>;
  accessVerifier?: () => Promise<MerchantAccessResult>;
  getConnection?: () => ReceiptPrinterConnection | null;
  writeChunks?: (chunksBase64: string[], connection: ReceiptPrinterConnection) => Promise<void>;
  now?: () => string;
}

function getCloudCaller() {
  return (payload: Record<string, unknown>) => wx.cloud.callFunction(payload);
}

async function resolveMerchantOperator(accessVerifier: () => Promise<MerchantAccessResult>) {
  const response = await accessVerifier();
  const access: MerchantAccessResult = response.result ?? response;

  if (!access.allowed || !access.merchant?.merchantId || !access.merchant.storeName) {
    throw new Error('MERCHANT_FORBIDDEN');
  }

  return {
    id: access.merchant.merchantId,
    name: access.merchant.storeName
  };
}

async function prepareReceiptPrintJob(orderId: string, callFunction: (payload: Record<string, unknown>) => Promise<unknown>) {
  const response = (await callFunction({
    name: 'prepareOrderReceiptPrint',
    data: {
      orderId
    }
  })) as {
    result?: {
      ok?: boolean;
      job?: OrderReceiptPrintJob;
    };
  };

  if (!response.result?.job) {
    throw new Error('PRINT_JOB_UNAVAILABLE');
  }

  return response.result.job;
}

async function recordReceiptPrintResult(
  job: OrderReceiptPrintJob,
  operator: OrderReceiptPrintAuditPayload['operator'],
  connection: Pick<ReceiptPrinterConnection, 'deviceId' | 'name'>,
  result: OrderReceiptPrintAuditPayload['result'],
  callFunction: (payload: Record<string, unknown>) => Promise<unknown>,
  printedAt: string,
  failureReason?: string
) {
  await callFunction({
    name: 'recordOrderReceiptPrintResult',
    data: {
      orderId: job.orderId,
      operator,
      printedAt,
      printerDeviceId: connection.deviceId,
      printerDeviceLabel: connection.name,
      receiptTemplateVersion: job.receiptTemplateVersion,
      result,
      failureReason,
      isReprint: job.isReprint
    } satisfies OrderReceiptPrintAuditPayload
  });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'UNKNOWN_PRINT_ERROR';
}

export async function printOrderReceipt(input: PrintOrderReceiptInput, dependencies: PrintOrderReceiptDependencies = {}) {
  const callFunction = dependencies.callFunction ?? getCloudCaller();
  const operator = await resolveMerchantOperator(dependencies.accessVerifier ?? verifyMerchantAccess);
  const job = await prepareReceiptPrintJob(input.orderId, callFunction);
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
      callFunction,
      printedAt,
      'NO_PRINTER_CONNECTED'
    );
    throw new Error('NO_PRINTER_CONNECTED');
  }

  try {
    await (dependencies.writeChunks ?? writeReceiptPrinterChunks)(job.chunksBase64, connection);
    await recordReceiptPrintResult(job, operator, connection, 'success', callFunction, printedAt);
    return job;
  } catch (error) {
    await recordReceiptPrintResult(job, operator, connection, 'failed', callFunction, printedAt, getErrorMessage(error));
    throw error;
  }
}
