import type { FastifyInstance } from 'fastify';

import type { ApiRouteDependencies } from './dependencies';

function getHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function paymentRoutes(
  app: FastifyInstance,
  options: { dependencies: ApiRouteDependencies }
) {
  const { dependencies } = options;

  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_request, body, done) => {
    done(null, body);
  });

  app.post('/wechat/notify', async (request) => {
    await dependencies.paymentNotifyService.handleWechatPayNotification({
      rawBody: typeof request.body === 'string' ? request.body : JSON.stringify(request.body ?? {}),
      headers: {
        timestamp: getHeader(request.headers['wechatpay-timestamp']) ?? '',
        nonce: getHeader(request.headers['wechatpay-nonce']) ?? '',
        serial: getHeader(request.headers['wechatpay-serial']) ?? '',
        signature: getHeader(request.headers['wechatpay-signature']) ?? ''
      }
    });

    return { code: 'SUCCESS', message: '成功' };
  });
}
