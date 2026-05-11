import type { ApiConfig } from '../config/env';
import { createSessionToken } from '../modules/auth/session';

export const testConfig: ApiConfig = {
  nodeEnv: 'test',
  host: '127.0.0.1',
  port: 3000,
  logLevel: 'silent',
  publicBaseUrl: 'http://127.0.0.1:3000',
  databaseUrl: 'mysql://xiaipet:xiaipet_local_password@127.0.0.1:3307/xiaipet_test',
  sessionSecret: 'test-session-secret',
  sessionTtlSeconds: 3600,
  wechatAppId: 'test-app-id',
  wechatAppSecret: 'test-app-secret'
};

export function authHeader(openid = 'customer-openid') {
  return {
    authorization: `Bearer ${createSessionToken({ openid }, testConfig.sessionSecret, testConfig.sessionTtlSeconds)}`
  };
}
