import type { FastifyServerOptions } from 'fastify';

import type { ApiConfig } from '../config/env';

export function createLoggerOptions(config: ApiConfig): FastifyServerOptions['logger'] {
  if (config.nodeEnv === 'test' || config.logLevel === 'silent') {
    return false;
  }

  return {
    level: config.logLevel,
    redact: [
      'req.headers.authorization',
      'req.headers.cookie',
      'DATABASE_URL',
      'OSS_ACCESS_KEY_SECRET',
      'ossAccessKeySecret',
      'WECHAT_APP_SECRET',
      'CUSTOMER_WECHAT_APP_SECRET',
      'MERCHANT_WECHAT_APP_SECRET',
      'customerWechatAppSecret',
      'merchantWechatAppSecret'
    ]
  };
}
