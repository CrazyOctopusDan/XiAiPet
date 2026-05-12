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
  ossRegion: 'oss-cn-shanghai',
  ossBucket: 'xiaipet-test-assets',
  ossEndpoint: 'oss-cn-shanghai.aliyuncs.com',
  ossPublicBaseUrl: 'https://assets.example.test',
  ossAccessKeyId: 'test-oss-key-id',
  ossAccessKeySecret: 'test-oss-key-secret',
  ossUploadPolicyTtlSeconds: 900,
  customerWechatAppId: 'test-customer-app-id',
  customerWechatAppSecret: 'test-customer-app-secret',
  merchantWechatAppId: 'test-merchant-app-id',
  merchantWechatAppSecret: 'test-merchant-app-secret'
};

export function authHeader(openid = 'customer-openid') {
  return {
    authorization: `Bearer ${createSessionToken({ openid }, testConfig.sessionSecret, testConfig.sessionTtlSeconds)}`
  };
}
