import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadApiConfig } from './env';

const PROD_SESSION_SECRET = 'prod-session-secret-with-32-plus-bytes';

describe('loadApiConfig', () => {
  it('returns safe defaults for local development', () => {
    expect(loadApiConfig({
      DATABASE_URL: 'mysql://xiaipet:xiaipet_local_password@127.0.0.1:3307/xiaipet_dev',
      API_SESSION_SECRET: 'dev-session-secret',
      OSS_ACCESS_KEY_ID: 'dev-oss-key-id',
      OSS_ACCESS_KEY_SECRET: 'dev-oss-key-secret',
      CUSTOMER_WECHAT_APP_ID: 'dev-customer-app-id',
      CUSTOMER_WECHAT_APP_SECRET: 'dev-customer-app-secret',
      MERCHANT_WECHAT_APP_ID: 'dev-merchant-app-id',
      MERCHANT_WECHAT_APP_SECRET: 'dev-merchant-app-secret'
    })).toEqual({
      nodeEnv: 'development',
      host: '0.0.0.0',
      port: 3000,
      logLevel: 'info',
      publicBaseUrl: 'http://127.0.0.1:3000',
      databaseUrl: 'mysql://xiaipet:xiaipet_local_password@127.0.0.1:3307/xiaipet_dev',
      sessionSecret: 'dev-session-secret',
      sessionTtlSeconds: 1209600,
      ossRegion: 'oss-cn-shanghai',
      ossBucket: '',
      ossEndpoint: 'oss-cn-shanghai.aliyuncs.com',
      ossPublicBaseUrl: '',
      ossAccessKeyId: 'dev-oss-key-id',
      ossAccessKeySecret: 'dev-oss-key-secret',
      ossUploadPolicyTtlSeconds: 900,
      customerWechatAppId: 'dev-customer-app-id',
      customerWechatAppSecret: 'dev-customer-app-secret',
      merchantWechatAppId: 'dev-merchant-app-id',
      merchantWechatAppSecret: 'dev-merchant-app-secret',
      wechatPay: null
    });
  });

  it('accepts valid overrides', () => {
    expect(
      loadApiConfig({
        NODE_ENV: 'production',
        API_HOST: '127.0.0.1',
        API_PORT: '8080',
        LOG_LEVEL: 'warn',
        API_PUBLIC_BASE_URL: 'https://api.xiaipet.vip',
        DATABASE_URL: 'mysql://api_user:secret@rm-test.mysql.rds.aliyuncs.com:3306/xiaipet',
        API_SESSION_SECRET: PROD_SESSION_SECRET,
        API_SESSION_TTL_SECONDS: '3600',
        OSS_REGION: 'oss-cn-hangzhou',
        OSS_BUCKET: 'xiaipet-assets',
        OSS_ENDPOINT: 'oss-cn-hangzhou.aliyuncs.com',
        OSS_PUBLIC_BASE_URL: 'https://xiaipet-assets.oss-cn-hangzhou.aliyuncs.com',
        OSS_ACCESS_KEY_ID: 'prod-oss-key-id',
        OSS_ACCESS_KEY_SECRET: 'prod-oss-key-secret',
        OSS_UPLOAD_POLICY_TTL_SECONDS: '600',
        CUSTOMER_WECHAT_APP_ID: 'prod-customer-app-id',
        CUSTOMER_WECHAT_APP_SECRET: 'prod-customer-app-secret',
        MERCHANT_WECHAT_APP_ID: 'prod-merchant-app-id',
        MERCHANT_WECHAT_APP_SECRET: 'prod-merchant-app-secret',
        WECHAT_PAY_MCH_ID: '1900000001',
        WECHAT_PAY_MCH_SERIAL_NO: 'pay-serial-no',
        WECHAT_PAY_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----',
        WECHAT_PAY_NOTIFY_URL: 'https://api.xiaipet.vip/api/v1/customer/orders/payment-notify',
        WECHAT_PAY_API_V3_KEY: '12345678901234567890123456789012',
        WECHAT_PAY_PLATFORM_PUBLIC_KEY: '-----BEGIN PUBLIC KEY-----\\ntest\\n-----END PUBLIC KEY-----'
      })
    ).toEqual({
      nodeEnv: 'production',
      host: '127.0.0.1',
      port: 8080,
      logLevel: 'warn',
      publicBaseUrl: 'https://api.xiaipet.vip',
      databaseUrl: 'mysql://api_user:secret@rm-test.mysql.rds.aliyuncs.com:3306/xiaipet',
      sessionSecret: PROD_SESSION_SECRET,
      sessionTtlSeconds: 3600,
      ossRegion: 'oss-cn-hangzhou',
      ossBucket: 'xiaipet-assets',
      ossEndpoint: 'oss-cn-hangzhou.aliyuncs.com',
      ossPublicBaseUrl: 'https://xiaipet-assets.oss-cn-hangzhou.aliyuncs.com',
      ossAccessKeyId: 'prod-oss-key-id',
      ossAccessKeySecret: 'prod-oss-key-secret',
      ossUploadPolicyTtlSeconds: 600,
      customerWechatAppId: 'prod-customer-app-id',
      customerWechatAppSecret: 'prod-customer-app-secret',
      merchantWechatAppId: 'prod-merchant-app-id',
      merchantWechatAppSecret: 'prod-merchant-app-secret',
      wechatPay: {
        mchId: '1900000001',
        mchSerialNo: 'pay-serial-no',
        privateKey: '-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----',
        notifyUrl: 'https://api.xiaipet.vip/api/v1/customer/orders/payment-notify',
        apiV3Key: '12345678901234567890123456789012',
        platformPublicKey: '-----BEGIN PUBLIC KEY-----\\ntest\\n-----END PUBLIC KEY-----',
        apiBaseUrl: undefined
      }
    });
  });

  it('loads WeChat Pay secrets from configured file paths', () => {
    const dir = mkdtempSync(join(tmpdir(), 'xiaipet-pay-'));
    const privateKeyPath = join(dir, 'apiclient_key.pem');
    const publicKeyPath = join(dir, 'wechatpay_public.pem');
    writeFileSync(privateKeyPath, '-----BEGIN PRIVATE KEY-----\nfrom-file\n-----END PRIVATE KEY-----\n');
    writeFileSync(publicKeyPath, '-----BEGIN PUBLIC KEY-----\nfrom-file\n-----END PUBLIC KEY-----\n');

    try {
      const config = loadApiConfig({
        NODE_ENV: 'production',
        API_HOST: '127.0.0.1',
        API_PORT: '8080',
        API_PUBLIC_BASE_URL: 'https://api.xiaipet.vip',
        DATABASE_URL: 'mysql://api_user:secret@rm-test.mysql.rds.aliyuncs.com:3306/xiaipet',
        API_SESSION_SECRET: PROD_SESSION_SECRET,
        OSS_REGION: 'oss-cn-hangzhou',
        OSS_BUCKET: 'xiaipet-assets',
        OSS_ENDPOINT: 'oss-cn-hangzhou.aliyuncs.com',
        OSS_PUBLIC_BASE_URL: 'https://xiaipet-assets.oss-cn-hangzhou.aliyuncs.com',
        OSS_ACCESS_KEY_ID: 'prod-oss-key-id',
        OSS_ACCESS_KEY_SECRET: 'prod-oss-key-secret',
        CUSTOMER_WECHAT_APP_ID: 'prod-customer-app-id',
        CUSTOMER_WECHAT_APP_SECRET: 'prod-customer-app-secret',
        MERCHANT_WECHAT_APP_ID: 'prod-merchant-app-id',
        MERCHANT_WECHAT_APP_SECRET: 'prod-merchant-app-secret',
        WECHAT_PAY_MCH_ID: '1900000001',
        WECHAT_PAY_MCH_SERIAL_NO: 'pay-serial-no',
        WECHAT_PAY_PRIVATE_KEY_PATH: privateKeyPath,
        WECHAT_PAY_NOTIFY_URL: 'https://api.xiaipet.vip/api/v1/payments/wechat/notify',
        WECHAT_PAY_API_V3_KEY: '12345678901234567890123456789012',
        WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH: publicKeyPath
      });

      expect(config.wechatPay).toMatchObject({
        privateKey: '-----BEGIN PRIVATE KEY-----\nfrom-file\n-----END PRIVATE KEY-----',
        apiV3Key: '12345678901234567890123456789012',
        platformPublicKey: '-----BEGIN PUBLIC KEY-----\nfrom-file\n-----END PUBLIC KEY-----'
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('defaults DATABASE_URL only during tests', () => {
    const config = loadApiConfig({ NODE_ENV: 'test' });
    expect(config.databaseUrl).toBe('mysql://xiaipet:xiaipet_local_password@127.0.0.1:3307/xiaipet_test');
    expect(config.sessionSecret).toBe('test-api-session-secret');
    expect(config.ossRegion).toBe('oss-cn-shanghai');
    expect(config.ossBucket).toBe('xiaipet-test-assets');
    expect(config.ossEndpoint).toBe('oss-cn-shanghai.aliyuncs.com');
    expect(config.ossPublicBaseUrl).toBe('https://assets.example.test');
    expect(config.ossAccessKeyId).toBe('test-oss-access-key-id');
    expect(config.ossAccessKeySecret).toBe('test-oss-access-key-secret');
    expect(config.ossUploadPolicyTtlSeconds).toBe(900);
    expect(config.customerWechatAppId).toBe('test-customer-wechat-app-id');
    expect(config.customerWechatAppSecret).toBe('test-customer-wechat-app-secret');
    expect(config.merchantWechatAppId).toBe('test-merchant-wechat-app-id');
    expect(config.merchantWechatAppSecret).toBe('test-merchant-wechat-app-secret');
    expect(config.wechatPay).toBeNull();
  });

  it('rejects partial WeChat Pay configuration', () => {
    expect(() =>
      loadApiConfig({
        NODE_ENV: 'production',
        DATABASE_URL: 'mysql://xiaipet:secret@127.0.0.1:3307/xiaipet_dev',
        API_SESSION_SECRET: PROD_SESSION_SECRET,
        OSS_REGION: 'oss-cn-hangzhou',
        OSS_BUCKET: 'xiaipet-assets',
        OSS_ENDPOINT: 'oss-cn-hangzhou.aliyuncs.com',
        OSS_PUBLIC_BASE_URL: 'https://xiaipet-assets.oss-cn-hangzhou.aliyuncs.com',
        OSS_ACCESS_KEY_ID: 'oss-id',
        OSS_ACCESS_KEY_SECRET: 'oss-secret',
        CUSTOMER_WECHAT_APP_ID: 'customer-app-id',
        CUSTOMER_WECHAT_APP_SECRET: 'customer-app-secret',
        MERCHANT_WECHAT_APP_ID: 'merchant-app-id',
        MERCHANT_WECHAT_APP_SECRET: 'merchant-app-secret',
        WECHAT_PAY_MCH_ID: '1900000001'
      })
    ).toThrow('Invalid WECHAT_PAY_*');
  });

  it('rejects invalid ports', () => {
    expect(() => loadApiConfig({ API_PORT: '70000' })).toThrow('Invalid API_PORT');
    expect(() => loadApiConfig({ API_PORT: 'abc' })).toThrow('Invalid API_PORT');
  });

  it('rejects invalid log levels', () => {
    expect(() =>
      loadApiConfig({
        LOG_LEVEL: 'verbose',
        DATABASE_URL: 'mysql://xiaipet:secret@127.0.0.1:3307/xiaipet_dev',
        API_SESSION_SECRET: 'secret',
        OSS_ACCESS_KEY_ID: 'oss-id',
        OSS_ACCESS_KEY_SECRET: 'oss-secret',
        CUSTOMER_WECHAT_APP_ID: 'customer-app-id',
        CUSTOMER_WECHAT_APP_SECRET: 'customer-app-secret',
        MERCHANT_WECHAT_APP_ID: 'merchant-app-id',
        MERCHANT_WECHAT_APP_SECRET: 'merchant-app-secret'
      })
    ).toThrow('Invalid LOG_LEVEL');
  });

  it('rejects placeholder secrets outside tests', () => {
    expect(() =>
      loadApiConfig({
        NODE_ENV: 'production',
        DATABASE_URL: 'mysql://xiaipet:secret@127.0.0.1:3307/xiaipet_dev',
        API_SESSION_SECRET: '<session secret 32+ bytes>',
        OSS_REGION: 'oss-cn-hangzhou',
        OSS_BUCKET: 'xiaipet-assets',
        OSS_ENDPOINT: 'oss-cn-hangzhou.aliyuncs.com',
        OSS_PUBLIC_BASE_URL: 'https://xiaipet-assets.oss-cn-hangzhou.aliyuncs.com',
        OSS_ACCESS_KEY_ID: 'oss-id',
        OSS_ACCESS_KEY_SECRET: 'oss-secret',
        CUSTOMER_WECHAT_APP_ID: 'customer-app-id',
        CUSTOMER_WECHAT_APP_SECRET: 'customer-app-secret',
        MERCHANT_WECHAT_APP_ID: 'merchant-app-id',
        MERCHANT_WECHAT_APP_SECRET: 'merchant-app-secret'
      })
    ).toThrow('Invalid API_SESSION_SECRET: expected a real non-placeholder value');
  });

  it('rejects weak production session secrets', () => {
    expect(() =>
      loadApiConfig({
        NODE_ENV: 'production',
        DATABASE_URL: 'mysql://xiaipet:secret@127.0.0.1:3307/xiaipet_dev',
        API_SESSION_SECRET: 'secret',
        OSS_REGION: 'oss-cn-hangzhou',
        OSS_BUCKET: 'xiaipet-assets',
        OSS_ENDPOINT: 'oss-cn-hangzhou.aliyuncs.com',
        OSS_PUBLIC_BASE_URL: 'https://xiaipet-assets.oss-cn-hangzhou.aliyuncs.com',
        OSS_ACCESS_KEY_ID: 'oss-id',
        OSS_ACCESS_KEY_SECRET: 'oss-secret',
        CUSTOMER_WECHAT_APP_ID: 'customer-app-id',
        CUSTOMER_WECHAT_APP_SECRET: 'customer-app-secret',
        MERCHANT_WECHAT_APP_ID: 'merchant-app-id',
        MERCHANT_WECHAT_APP_SECRET: 'merchant-app-secret'
      })
    ).toThrow('Invalid API_SESSION_SECRET: expected at least 32 bytes in production');
  });

  it('rejects missing production OSS routing values', () => {
    expect(() =>
      loadApiConfig({
        NODE_ENV: 'production',
        DATABASE_URL: 'mysql://xiaipet:secret@127.0.0.1:3307/xiaipet_dev',
        API_SESSION_SECRET: PROD_SESSION_SECRET,
        CUSTOMER_WECHAT_APP_ID: 'customer-app-id',
        CUSTOMER_WECHAT_APP_SECRET: 'customer-app-secret',
        MERCHANT_WECHAT_APP_ID: 'merchant-app-id',
        MERCHANT_WECHAT_APP_SECRET: 'merchant-app-secret'
      })
    ).toThrow('Invalid OSS_REGION: expected a real non-placeholder value');
  });

  it('rejects missing OSS secrets outside tests', () => {
    expect(() =>
      loadApiConfig({
        NODE_ENV: 'production',
        DATABASE_URL: 'mysql://xiaipet:secret@127.0.0.1:3307/xiaipet_dev',
        API_SESSION_SECRET: PROD_SESSION_SECRET,
        OSS_REGION: 'oss-cn-hangzhou',
        OSS_BUCKET: 'xiaipet-assets',
        OSS_ENDPOINT: 'oss-cn-hangzhou.aliyuncs.com',
        OSS_PUBLIC_BASE_URL: 'https://xiaipet-assets.oss-cn-hangzhou.aliyuncs.com',
        CUSTOMER_WECHAT_APP_ID: 'customer-app-id',
        CUSTOMER_WECHAT_APP_SECRET: 'customer-app-secret',
        MERCHANT_WECHAT_APP_ID: 'merchant-app-id',
        MERCHANT_WECHAT_APP_SECRET: 'merchant-app-secret'
      })
    ).toThrow('Invalid OSS_ACCESS_KEY_ID: expected a real non-placeholder value');

    expect(() =>
      loadApiConfig({
        NODE_ENV: 'production',
        DATABASE_URL: 'mysql://xiaipet:secret@127.0.0.1:3307/xiaipet_dev',
        API_SESSION_SECRET: PROD_SESSION_SECRET,
        OSS_REGION: 'oss-cn-hangzhou',
        OSS_BUCKET: 'xiaipet-assets',
        OSS_ENDPOINT: 'oss-cn-hangzhou.aliyuncs.com',
        OSS_PUBLIC_BASE_URL: 'https://xiaipet-assets.oss-cn-hangzhou.aliyuncs.com',
        OSS_ACCESS_KEY_ID: 'oss-id',
        CUSTOMER_WECHAT_APP_ID: 'customer-app-id',
        CUSTOMER_WECHAT_APP_SECRET: 'customer-app-secret',
        MERCHANT_WECHAT_APP_ID: 'merchant-app-id',
        MERCHANT_WECHAT_APP_SECRET: 'merchant-app-secret'
      })
    ).toThrow('Invalid OSS_ACCESS_KEY_SECRET: expected a real non-placeholder value');
  });

  it('rejects missing or non-MySQL database urls outside tests', () => {
    expect(() => loadApiConfig({ NODE_ENV: 'production' })).toThrow(
      'Invalid DATABASE_URL: expected a MySQL connection string'
    );
    expect(() => loadApiConfig({ DATABASE_URL: 'postgres://user:secret@localhost:5432/db' })).toThrow(
      'Invalid DATABASE_URL: expected a MySQL connection string'
    );
  });
});
