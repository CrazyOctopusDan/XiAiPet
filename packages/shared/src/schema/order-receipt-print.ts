import type {
  OrderReceiptPrintAuditPayload,
  OrderReceiptPrintJob,
  OrderReceiptPrintMetadata,
  OrderReceiptPrintResult
} from '../types/order';

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const valueKeys = Object.keys(value).sort();
  const expectedKeys = [...keys].sort();

  return (
    valueKeys.length === expectedKeys.length &&
    valueKeys.every((key, index) => key === expectedKeys[index])
  );
}

function hasOnlyAllowedKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPrintResult(value: unknown): value is OrderReceiptPrintResult {
  return value === 'success' || value === 'failed';
}

function isOperator(value: unknown): value is OrderReceiptPrintAuditPayload['operator'] {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    hasOnlyKeys(candidate, ['id', 'name']) &&
    isNonEmptyString(candidate.id) &&
    isNonEmptyString(candidate.name)
  );
}

export function isOrderReceiptPrintMetadata(value: unknown): value is OrderReceiptPrintMetadata {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.printCount === 'number' &&
    Number.isInteger(candidate.printCount) &&
    candidate.printCount >= 0 &&
    (candidate.lastPrintedAt === undefined || isNonEmptyString(candidate.lastPrintedAt)) &&
    (candidate.lastPrintResult === undefined || isPrintResult(candidate.lastPrintResult)) &&
    (candidate.lastPrinterDeviceLabel === undefined || isNonEmptyString(candidate.lastPrinterDeviceLabel)) &&
    isNonEmptyString(candidate.receiptTemplateVersion)
  );
}

export function isOrderReceiptPrintAuditPayload(value: unknown): value is OrderReceiptPrintAuditPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (
    !hasOnlyAllowedKeys(candidate, [
      'orderId',
      'operator',
      'printedAt',
      'printerDeviceId',
      'printerDeviceLabel',
      'receiptTemplateVersion',
      'result',
      'failureReason',
      'isReprint'
    ]) ||
    !isNonEmptyString(candidate.orderId) ||
    !isOperator(candidate.operator) ||
    !isNonEmptyString(candidate.printedAt) ||
    !isNonEmptyString(candidate.printerDeviceId) ||
    !isNonEmptyString(candidate.printerDeviceLabel) ||
    !isNonEmptyString(candidate.receiptTemplateVersion) ||
    !isPrintResult(candidate.result) ||
    typeof candidate.isReprint !== 'boolean'
  ) {
    return false;
  }

  if (candidate.result === 'failed') {
    return isNonEmptyString(candidate.failureReason);
  }

  return candidate.failureReason === undefined;
}

export function isOrderReceiptPrintJob(value: unknown): value is OrderReceiptPrintJob {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    hasOnlyKeys(candidate, [
      'orderId',
      'printJobId',
      'receiptTemplateVersion',
      'isReprint',
      'nextPrintCount',
      'chunksBase64',
      'previewLines'
    ]) &&
    isNonEmptyString(candidate.orderId) &&
    isNonEmptyString(candidate.printJobId) &&
    isNonEmptyString(candidate.receiptTemplateVersion) &&
    typeof candidate.isReprint === 'boolean' &&
    typeof candidate.nextPrintCount === 'number' &&
    Number.isInteger(candidate.nextPrintCount) &&
    candidate.nextPrintCount > 0 &&
    Array.isArray(candidate.chunksBase64) &&
    candidate.chunksBase64.length > 0 &&
    candidate.chunksBase64.every((item) => isNonEmptyString(item)) &&
    Array.isArray(candidate.previewLines) &&
    candidate.previewLines.length > 0 &&
    candidate.previewLines.every((item) => isNonEmptyString(item))
  );
}
