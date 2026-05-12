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
  if (rawValue) {
    return rawValue;
  }
  if (nodeEnv === 'test') {
    return `test-${name.toLowerCase().replaceAll('_', '-')}`;
  }
  throw new Error(`Invalid ${name}: expected a non-empty value`);
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
    ossRegion: raw.OSS_REGION ?? (nodeEnv === 'test' ? TEST_OSS_REGION : 'oss-cn-shanghai'),
    ossBucket: raw.OSS_BUCKET ?? (nodeEnv === 'test' ? TEST_OSS_BUCKET : ''),
    ossEndpoint: raw.OSS_ENDPOINT ?? (nodeEnv === 'test' ? TEST_OSS_ENDPOINT : 'oss-cn-shanghai.aliyuncs.com'),
    ossPublicBaseUrl: raw.OSS_PUBLIC_BASE_URL ?? (nodeEnv === 'test' ? TEST_OSS_PUBLIC_BASE_URL : ''),
    ossAccessKeyId: parseRequiredSecret(raw.OSS_ACCESS_KEY_ID, nodeEnv, 'OSS_ACCESS_KEY_ID'),
    ossAccessKeySecret: parseRequiredSecret(raw.OSS_ACCESS_KEY_SECRET, nodeEnv, 'OSS_ACCESS_KEY_SECRET'),
    ossUploadPolicyTtlSeconds: parsePositiveInteger(raw.OSS_UPLOAD_POLICY_TTL_SECONDS, 900, 'OSS_UPLOAD_POLICY_TTL_SECONDS'),
    customerWechatAppId: parseRequiredSecret(raw.CUSTOMER_WECHAT_APP_ID, nodeEnv, 'CUSTOMER_WECHAT_APP_ID'),
    customerWechatAppSecret: parseRequiredSecret(raw.CUSTOMER_WECHAT_APP_SECRET, nodeEnv, 'CUSTOMER_WECHAT_APP_SECRET'),
    merchantWechatAppId: parseRequiredSecret(raw.MERCHANT_WECHAT_APP_ID, nodeEnv, 'MERCHANT_WECHAT_APP_ID'),
    merchantWechatAppSecret: parseRequiredSecret(raw.MERCHANT_WECHAT_APP_SECRET, nodeEnv, 'MERCHANT_WECHAT_APP_SECRET')
  };
}
