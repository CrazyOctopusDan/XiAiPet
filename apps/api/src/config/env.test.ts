import { describe, expect, it } from 'vitest';

import { loadApiConfig } from './env';

describe('loadApiConfig', () => {
  it('returns safe defaults for local development', () => {
    expect(loadApiConfig({
      DATABASE_URL: 'mysql://xiaipet:xiaipet_local_password@127.0.0.1:3307/xiaipet_dev',
      API_SESSION_SECRET: 'dev-session-secret',
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
      wechatAppId: 'prod-app-id',
      wechatAppSecret: 'prod-app-secret'
    });
  });

  it('defaults DATABASE_URL only during tests', () => {
    const config = loadApiConfig({ NODE_ENV: 'test' });
    expect(config.databaseUrl).toBe('mysql://xiaipet:xiaipet_local_password@127.0.0.1:3307/xiaipet_test');
    expect(config.sessionSecret).toBe('test-api-session-secret');
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
        WECHAT_APP_ID: 'app-id',
        WECHAT_APP_SECRET: 'app-secret'
      })
    ).toThrow('Invalid LOG_LEVEL');
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
