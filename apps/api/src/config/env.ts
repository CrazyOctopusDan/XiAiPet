import { readFileSync } from 'node:fs';

export interface ApiConfig {
  nodeEnv: string;
  host: string;
  port: number;
  logLevel: LogLevel;
  publicBaseUrl: string;
  databaseUrl: string;
  sessionSecret: string;
  sessionTtlSeconds: number;
  ossRegion: string;
  ossBucket: string;
  ossEndpoint: string;
  ossPublicBaseUrl: string;
  ossAccessKeyId: string;
  ossAccessKeySecret: string;
  ossUploadPolicyTtlSeconds: number;
  customerWechatAppId: string;
  customerWechatAppSecret: string;
  merchantWechatAppId: string;
  merchantWechatAppSecret: string;
  wechatPay: {
    mchId: string;
    mchSerialNo: string;
    privateKey: string;
    notifyUrl: string;
    apiV3Key: string;
    platformPublicKey: string;
    apiBaseUrl?: string;
  } | null;
}

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

function parsePort(rawPort: string | undefined): number {
  const port = Number(rawPort ?? '3000');

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Invalid API_PORT: expected an integer between 1 and 65535');
  }

  return port;
}

function parseLogLevel(rawLogLevel: string | undefined): LogLevel {
  const logLevel = rawLogLevel ?? 'info';

  if (!LOG_LEVELS.includes(logLevel as LogLevel)) {
    throw new Error(`Invalid LOG_LEVEL: expected one of ${LOG_LEVELS.join(', ')}`);
  }

  return logLevel as LogLevel;
}

const TEST_DATABASE_URL = 'mysql://xiaipet:xiaipet_local_password@127.0.0.1:3307/xiaipet_test';
const TEST_OSS_REGION = 'oss-cn-shanghai';
const TEST_OSS_BUCKET = 'xiaipet-test-assets';
const TEST_OSS_ENDPOINT = 'oss-cn-shanghai.aliyuncs.com';
const TEST_OSS_PUBLIC_BASE_URL = 'https://assets.example.test';

function parseDatabaseUrl(rawDatabaseUrl: string | undefined, nodeEnv: string): string {
  const databaseUrl = rawDatabaseUrl ?? (nodeEnv === 'test' ? TEST_DATABASE_URL : undefined);

  if (!databaseUrl) {
    throw new Error('Invalid DATABASE_URL: expected a MySQL connection string');
  }

  try {
    const parsed = new URL(databaseUrl);
    if (!['mysql:', 'mysql2:'].includes(parsed.protocol)) {
      throw new Error('not mysql');
    }
  } catch (error) {
    throw new Error('Invalid DATABASE_URL: expected a MySQL connection string');
  }

  return databaseUrl;
}

function parsePositiveInteger(rawValue: string | undefined, fallback: number, name: string): number {
  const value = Number(rawValue ?? fallback);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid ${name}: expected a positive integer`);
  }
  return value;
}

function parseRequiredSecret(rawValue: string | undefined, nodeEnv: string, name: string): string {
  const value = rawValue?.trim();
  if (nodeEnv === 'test') {
    return value || `test-${name.toLowerCase().replaceAll('_', '-')}`;
  }
  if (!value || /^<.*>$/.test(value)) {
    throw new Error(`Invalid ${name}: expected a real non-placeholder value`);
  }
  if (nodeEnv === 'production' && name === 'API_SESSION_SECRET' && Buffer.byteLength(value, 'utf8') < 32) {
    throw new Error('Invalid API_SESSION_SECRET: expected at least 32 bytes in production');
  }
  return value;
}

function parseProductionRequiredValue(
  rawValue: string | undefined,
  nodeEnv: string,
  testFallback: string,
  name: string,
  devFallback = ''
): string {
  const value = rawValue?.trim() || (nodeEnv === 'test' ? testFallback : nodeEnv === 'production' ? '' : devFallback);
  if (nodeEnv === 'production' && (!value || /^<.*>$/.test(value))) {
    throw new Error(`Invalid ${name}: expected a real non-placeholder value`);
  }
  return value;
}

function parseOssPublicBaseUrl(rawValue: string | undefined, nodeEnv: string): string {
  const value = parseProductionRequiredValue(rawValue, nodeEnv, TEST_OSS_PUBLIC_BASE_URL, 'OSS_PUBLIC_BASE_URL');
  if (nodeEnv === 'production' && !value.startsWith('https://')) {
    throw new Error('Invalid OSS_PUBLIC_BASE_URL: expected an HTTPS URL');
  }
  return value;
}

function readSecretFile(rawPath: string | undefined, name: string): string | undefined {
  const filePath = rawPath?.trim();
  if (!filePath) {
    return undefined;
  }

  try {
    return readFileSync(filePath, 'utf8').trim();
  } catch {
    throw new Error(`Invalid ${name}: expected a readable secret file`);
  }
}

function parseOptionalWechatPayConfig(raw: NodeJS.ProcessEnv, nodeEnv: string): ApiConfig['wechatPay'] {
  const mchId = raw.WECHAT_PAY_MCH_ID?.trim();
  const mchSerialNo = raw.WECHAT_PAY_MCH_SERIAL_NO?.trim();
  const privateKey = raw.WECHAT_PAY_PRIVATE_KEY?.trim() || readSecretFile(raw.WECHAT_PAY_PRIVATE_KEY_PATH, 'WECHAT_PAY_PRIVATE_KEY_PATH');
  const notifyUrl = raw.WECHAT_PAY_NOTIFY_URL?.trim();
  const apiV3Key = raw.WECHAT_PAY_API_V3_KEY?.trim();
  const platformPublicKey =
    raw.WECHAT_PAY_PLATFORM_PUBLIC_KEY?.trim() ||
    readSecretFile(raw.WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH, 'WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH');
  const provided = [mchId, mchSerialNo, privateKey, notifyUrl, apiV3Key, platformPublicKey].filter(Boolean).length;

  if (provided === 0) {
    return null;
  }

  if (provided < 6) {
    throw new Error('Invalid WECHAT_PAY_*: expected merchant id, serial number, private key, notify url, APIv3 key and platform public key together');
  }

  if (apiV3Key && Buffer.byteLength(apiV3Key, 'utf8') !== 32) {
    throw new Error('Invalid WECHAT_PAY_API_V3_KEY: expected 32 bytes');
  }

  if (nodeEnv === 'production' && !notifyUrl?.startsWith('https://')) {
    throw new Error('Invalid WECHAT_PAY_NOTIFY_URL: expected an HTTPS URL in production');
  }

  return {
    mchId: mchId as string,
    mchSerialNo: mchSerialNo as string,
    privateKey: privateKey as string,
    notifyUrl: notifyUrl as string,
    apiV3Key: apiV3Key as string,
    platformPublicKey: platformPublicKey as string,
    apiBaseUrl: raw.WECHAT_PAY_API_BASE_URL?.trim() || undefined
  };
}

export function loadApiConfig(raw: NodeJS.ProcessEnv = process.env): ApiConfig {
  const nodeEnv = raw.NODE_ENV ?? 'development';
  const port = parsePort(raw.API_PORT);

  return {
    nodeEnv,
    host: raw.API_HOST ?? '0.0.0.0',
    port,
    logLevel: parseLogLevel(raw.LOG_LEVEL),
    publicBaseUrl: raw.API_PUBLIC_BASE_URL ?? `http://127.0.0.1:${port}`,
    databaseUrl: parseDatabaseUrl(raw.DATABASE_URL, nodeEnv),
    sessionSecret: parseRequiredSecret(raw.API_SESSION_SECRET, nodeEnv, 'API_SESSION_SECRET'),
    sessionTtlSeconds: parsePositiveInteger(raw.API_SESSION_TTL_SECONDS, 60 * 60 * 24 * 14, 'API_SESSION_TTL_SECONDS'),
    ossRegion: parseProductionRequiredValue(raw.OSS_REGION, nodeEnv, TEST_OSS_REGION, 'OSS_REGION', TEST_OSS_REGION),
    ossBucket: parseProductionRequiredValue(raw.OSS_BUCKET, nodeEnv, TEST_OSS_BUCKET, 'OSS_BUCKET'),
    ossEndpoint: parseProductionRequiredValue(raw.OSS_ENDPOINT, nodeEnv, TEST_OSS_ENDPOINT, 'OSS_ENDPOINT', TEST_OSS_ENDPOINT),
    ossPublicBaseUrl: parseOssPublicBaseUrl(raw.OSS_PUBLIC_BASE_URL, nodeEnv),
    ossAccessKeyId: parseRequiredSecret(raw.OSS_ACCESS_KEY_ID, nodeEnv, 'OSS_ACCESS_KEY_ID'),
    ossAccessKeySecret: parseRequiredSecret(raw.OSS_ACCESS_KEY_SECRET, nodeEnv, 'OSS_ACCESS_KEY_SECRET'),
    ossUploadPolicyTtlSeconds: parsePositiveInteger(raw.OSS_UPLOAD_POLICY_TTL_SECONDS, 900, 'OSS_UPLOAD_POLICY_TTL_SECONDS'),
    customerWechatAppId: parseRequiredSecret(raw.CUSTOMER_WECHAT_APP_ID, nodeEnv, 'CUSTOMER_WECHAT_APP_ID'),
    customerWechatAppSecret: parseRequiredSecret(raw.CUSTOMER_WECHAT_APP_SECRET, nodeEnv, 'CUSTOMER_WECHAT_APP_SECRET'),
    merchantWechatAppId: parseRequiredSecret(raw.MERCHANT_WECHAT_APP_ID, nodeEnv, 'MERCHANT_WECHAT_APP_ID'),
    merchantWechatAppSecret: parseRequiredSecret(raw.MERCHANT_WECHAT_APP_SECRET, nodeEnv, 'MERCHANT_WECHAT_APP_SECRET'),
    wechatPay: parseOptionalWechatPayConfig(raw, nodeEnv)
  };
}
