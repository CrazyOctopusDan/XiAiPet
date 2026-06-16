import type { OrderRecord } from '../orders/repository';
import { ApiError } from '../../lib/errors';
import { request as httpsRequest } from 'node:https';
import { createSign, randomUUID } from 'node:crypto';

export interface WechatPaymentContext {
  openid: string;
}

export interface WechatPaymentStartResult {
  outTradeNo: string;
  prepayId: string;
  paymentParams: {
    timeStamp: string;
    nonceStr: string;
    package: string;
    signType: string;
    paySign: string;
  };
  providerTraceId?: string;
}

export interface WechatPaymentSyncResult {
  tradeState: string;
  transactionId?: string;
  paidAt?: Date;
  failureCode?: string;
  failureMessage?: string;
}

export interface WechatPaymentSubject {
  id: string;
  description: string;
  amount: number;
}

export function createOrderPaymentSubject(order: OrderRecord): WechatPaymentSubject {
  return {
    id: order.id,
    description: `XiAiPet 订单 ${order.id}`,
    amount: order.pricing.payableTotal
  };
}

export interface PaymentProvider {
  kind?: 'mock' | 'wechat' | 'unconfigured';
  supportsRechargePayments?: boolean;
  startWechatPayment(subject: WechatPaymentSubject, context: WechatPaymentContext): Promise<WechatPaymentStartResult>;
  syncWechatPayment(subject: WechatPaymentSubject, context: WechatPaymentContext): Promise<WechatPaymentSyncResult>;
}

export interface WechatPayProviderOptions {
  appId: string;
  mchId: string;
  mchSerialNo: string;
  privateKey: string;
  notifyUrl: string;
  apiBaseUrl?: string;
}

interface WechatPrepayResponse {
  prepay_id?: string;
  code?: string;
  message?: string;
}

interface WechatTransactionResponse {
  trade_state?: string;
  transaction_id?: string;
  success_time?: string;
  trade_state_desc?: string;
}

function normalizePrivateKey(privateKey: string) {
  return privateKey.includes('\\n') ? privateKey.replaceAll('\\n', '\n') : privateKey;
}

function sign(privateKey: string, message: string) {
  return createSign('RSA-SHA256').update(message).sign(normalizePrivateKey(privateKey), 'base64');
}

function createAuthorizationHeader(
  options: WechatPayProviderOptions,
  method: 'GET' | 'POST',
  urlPathWithQuery: string,
  body: string,
  timestamp: string,
  nonceStr: string
) {
  const message = `${method}\n${urlPathWithQuery}\n${timestamp}\n${nonceStr}\n${body}\n`;
  const signature = sign(options.privateKey, message);

  const authorizationParameters = [
    `mchid="${options.mchId}"`,
    `nonce_str="${nonceStr}"`,
    `timestamp="${timestamp}"`,
    `serial_no="${options.mchSerialNo}"`,
    `signature="${signature}"`
  ].join(',');

  return `WECHATPAY2-SHA256-RSA2048 ${authorizationParameters}`;
}

function requestWechatPay<T>(
  options: WechatPayProviderOptions,
  method: 'GET' | 'POST',
  urlPathWithQuery: string,
  payload?: unknown
) {
  const apiBaseUrl = new URL(options.apiBaseUrl ?? 'https://api.mch.weixin.qq.com');
  const body = payload ? JSON.stringify(payload) : '';
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = randomUUID().replaceAll('-', '');
  const authorization = createAuthorizationHeader(options, method, urlPathWithQuery, body, timestamp, nonceStr);

  return new Promise<T>((resolve, reject) => {
    const request = httpsRequest(
      {
        hostname: apiBaseUrl.hostname,
        port: apiBaseUrl.port ? Number(apiBaseUrl.port) : 443,
        method,
        path: urlPathWithQuery,
        headers: {
          Authorization: authorization,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'xiaipet-api/1.0',
          ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {})
        }
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        response.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          const data = raw ? JSON.parse(raw) : {};

          if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
            const message = typeof data.message === 'string' ? data.message : 'WeChat Pay request failed';
            reject(new ApiError('WECHAT_PAY_REQUEST_FAILED', message, 502));
            return;
          }

          resolve(data as T);
        });
      }
    );

    request.on('error', () => {
      reject(new ApiError('WECHAT_PAY_REQUEST_FAILED', 'WeChat Pay request failed', 502));
    });

    if (body) {
      request.write(body);
    }
    request.end();
  });
}

function toCents(value: number) {
  return Math.max(1, Math.round(value * 100));
}

function createPaymentParams(options: WechatPayProviderOptions, prepayId: string) {
  const timeStamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = randomUUID().replaceAll('-', '');
  const packageValue = `prepay_id=${prepayId}`;
  const paySign = sign(options.privateKey, `${options.appId}\n${timeStamp}\n${nonceStr}\n${packageValue}\n`);

  return {
    timeStamp,
    nonceStr,
    package: packageValue,
    signType: 'RSA',
    paySign
  };
}

export function createUnconfiguredWechatPaymentProvider(): PaymentProvider {
  return {
    kind: 'unconfigured',
    async startWechatPayment() {
      throw new ApiError('WECHAT_PAY_NOT_CONFIGURED', 'WeChat Pay is not configured', 503);
    },
    async syncWechatPayment() {
      throw new ApiError('WECHAT_PAY_NOT_CONFIGURED', 'WeChat Pay is not configured', 503);
    }
  };
}

export function createMockPaymentProvider(): PaymentProvider {
  return {
    kind: 'mock',
    supportsRechargePayments: true,
    async startWechatPayment(subject: WechatPaymentSubject, context: WechatPaymentContext): Promise<WechatPaymentStartResult> {
      const amountCents = toCents(subject.amount);
      const descriptionKey = subject.description.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 32) || 'payment';
      const prepayId = `mock_${subject.id}_${amountCents}_${context.openid}`;
      return {
        outTradeNo: subject.id,
        prepayId,
        paymentParams: {
          timeStamp: '1700000000',
          nonceStr: `mock-${subject.id}`,
          package: `prepay_id=${prepayId}`,
          signType: 'RSA',
          paySign: 'mock-pay-sign'
        },
        providerTraceId: `mock-${subject.id}-${descriptionKey}-${amountCents}`
      };
    },
    async syncWechatPayment(subject: WechatPaymentSubject): Promise<WechatPaymentSyncResult> {
      return {
        tradeState: 'SUCCESS',
        transactionId: `mock-transaction-${subject.id}-${toCents(subject.amount)}`,
        paidAt: new Date()
      };
    }
  };
}

export function createWechatPayProvider(options: WechatPayProviderOptions): PaymentProvider {
  return {
    kind: 'wechat',
    supportsRechargePayments: true,
    async startWechatPayment(subject: WechatPaymentSubject, context: WechatPaymentContext): Promise<WechatPaymentStartResult> {
      const outTradeNo = subject.id;
      const response = await requestWechatPay<WechatPrepayResponse>(
        options,
        'POST',
        '/v3/pay/transactions/jsapi',
        {
          appid: options.appId,
          mchid: options.mchId,
          description: subject.description,
          out_trade_no: outTradeNo,
          notify_url: options.notifyUrl,
          amount: {
            total: toCents(subject.amount),
            currency: 'CNY'
          },
          payer: {
            openid: context.openid
          }
        }
      );

      if (!response.prepay_id) {
        throw new ApiError('WECHAT_PAY_PREPAY_FAILED', response.message ?? 'WeChat Pay prepay failed', 502);
      }

      return {
        outTradeNo,
        prepayId: response.prepay_id,
        paymentParams: createPaymentParams(options, response.prepay_id),
        providerTraceId: response.prepay_id
      };
    },

    async syncWechatPayment(subject: WechatPaymentSubject): Promise<WechatPaymentSyncResult> {
      const query = `/v3/pay/transactions/out-trade-no/${encodeURIComponent(subject.id)}?mchid=${encodeURIComponent(options.mchId)}`;
      const response = await requestWechatPay<WechatTransactionResponse>(options, 'GET', query);

      return {
        tradeState: response.trade_state ?? 'UNKNOWN',
        transactionId: response.transaction_id,
        paidAt: response.success_time ? new Date(response.success_time) : undefined,
        failureCode: response.trade_state && response.trade_state !== 'SUCCESS' ? response.trade_state : undefined,
        failureMessage: response.trade_state_desc
      };
    }
  };
}
