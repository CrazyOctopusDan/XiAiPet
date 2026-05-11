import { describe, expect, it } from 'vitest';

import { loadApiConfig } from './env';

describe('loadApiConfig', () => {
  it('returns safe defaults for local development', () => {
    expect(loadApiConfig({
      DATABASE_URL: 'mysql://xiaipet:xiaipet_local_password@127.0.0.1:3307/xiaipet_dev',
      API_SESSION_SECRET: 'dev-session-secret',
      OSS_ACCESS_KEY_ID: 'dev-oss-key-id',
      OSS_ACCESS_KEY_SECRET: 'dev-oss-key-secret',
      WECHAT_APP_ID: 'dev-app-id',
      WECHAT_APP_SECRET: 'dev-app-secret'
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
      wechatAppId: 'dev-app-id',
      wechatAppSecret: 'dev-app-secret'
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
        API_SESSION_SECRET: 'prod-session-secret',
        API_SESSION_TTL_SECONDS: '3600',
        OSS_REGION: 'oss-cn-hangzhou',
        OSS_BUCKET: 'xiaipet-assets',
        OSS_ENDPOINT: 'oss-cn-hangzhou.aliyuncs.com',
        OSS_PUBLIC_BASE_URL: 'https://xiaipet-assets.oss-cn-hangzhou.aliyuncs.com',
        OSS_ACCESS_KEY_ID: 'prod-oss-key-id',
        OSS_ACCESS_KEY_SECRET: 'prod-oss-key-secret',
        OSS_UPLOAD_POLICY_TTL_SECONDS: '600',
        WECHAT_APP_ID: 'prod-app-id',
        WECHAT_APP_SECRET: 'prod-app-secret'
      })
    ).toEqual({
      nodeEnv: 'production',
      host: '127.0.0.1',
      port: 8080,
      logLevel: 'warn',
      publicBaseUrl: 'https://api.xiaipet.vip',
      databaseUrl: 'mysql://api_user:secret@rm-test.mysql.rds.aliyuncs.com:3306/xiaipet',
      sessionSecret: 'prod-session-secret',
      sessionTtlSeconds: 3600,
      ossRegion: 'oss-cn-hangzhou',
      ossBucket: 'xiaipet-assets',
      ossEndpoint: 'oss-cn-hangzhou.aliyuncs.com',
      ossPublicBaseUrl: 'https://xiaipet-assets.oss-cn-hangzhou.aliyuncs.com',
      ossAccessKeyId: 'prod-oss-key-id',
      ossAccessKeySecret: 'prod-oss-key-secret',
      ossUploadPolicyTtlSeconds: 600,
      wechatAppId: 'prod-app-id',
      wechatAppSecret: 'prod-app-secret'
    });
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
    expect(config.wechatAppId).toBe('test-wechat-app-id');
    expect(config.wechatAppSecret).toBe('test-wechat-app-secret');
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
        WECHAT_APP_ID: 'app-id',
        WECHAT_APP_SECRET: 'app-secret'
      })
    ).toThrow('Invalid LOG_LEVEL');
  });

  it('rejects missing OSS secrets outside tests', () => {
    expect(() =>
      loadApiConfig({
        NODE_ENV: 'production',
        DATABASE_URL: 'mysql://xiaipet:secret@127.0.0.1:3307/xiaipet_dev',
        API_SESSION_SECRET: 'secret',
        WECHAT_APP_ID: 'app-id',
        WECHAT_APP_SECRET: 'app-secret'
      })
    ).toThrow('Invalid OSS_ACCESS_KEY_ID: expected a non-empty value');

    expect(() =>
      loadApiConfig({
        NODE_ENV: 'production',
        DATABASE_URL: 'mysql://xiaipet:secret@127.0.0.1:3307/xiaipet_dev',
        API_SESSION_SECRET: 'secret',
        OSS_ACCESS_KEY_ID: 'oss-id',
        WECHAT_APP_ID: 'app-id',
        WECHAT_APP_SECRET: 'app-secret'
      })
    ).toThrow('Invalid OSS_ACCESS_KEY_SECRET: expected a non-empty value');
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
