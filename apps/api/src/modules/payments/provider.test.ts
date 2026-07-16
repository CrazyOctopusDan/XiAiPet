import { EventEmitter } from 'node:events';
import { generateKeyPairSync } from 'node:crypto';

import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { OrderRecord } from '../orders/repository';

const requestMock = vi.hoisted(() => vi.fn());

vi.mock('node:https', () => ({
  request: requestMock
}));

import { createMockPaymentProvider, createOrderPaymentSubject, createWechatPayProvider } from './provider';

function createOrder(overrides: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id: 'order-1',
    openid: 'openid-1',
    status: 'pending_payment',
    paymentMethod: 'wechat',
    paymentStatus: 'pending',
    fulfillmentMode: 'pickup',
    pricing: {
      itemsSubtotal: 0.01,
      deliveryFee: 0,
      payableTotal: 0.01
    },
    snapshot: {},
    createdAt: '2026-06-11T05:00:00.000Z',
    updatedAt: '2026-06-11T05:00:00.000Z',
    ...overrides
  };
}

describe('createWechatPayProvider', () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it('sends comma-separated WeChat Pay V3 authorization parameters', async () => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    let capturedOptions: { path?: string; headers?: Record<string, string | number> } | undefined;
    let capturedBody = '';

    requestMock.mockImplementation((options, callback) => {
      capturedOptions = options;
      const request = new EventEmitter() as EventEmitter & {
        write: ReturnType<typeof vi.fn>;
        end: ReturnType<typeof vi.fn>;
      };

      request.write = vi.fn((chunk: string | Buffer) => {
        capturedBody += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk;
      });
      request.end = vi.fn(() => {
        const response = new EventEmitter() as EventEmitter & { statusCode: number };
        response.statusCode = 200;
        callback(response);
        response.emit('data', Buffer.from(JSON.stringify({ prepay_id: 'wx-prepay-1' })));
        response.emit('end');
      });

      return request;
    });

    const provider = createWechatPayProvider({
      appId: 'wx132ec4cb42c2dbf6',
      mchId: '1113847744',
      mchSerialNo: '124FDE2354D9055D23DD16058265C6FDF8DDFF09',
      privateKey: privatePem,
      notifyUrl: 'https://api.xiaipet.vip/api/v1/payments/wechat/notify'
    });

    await expect(provider.startWechatPayment(createOrderPaymentSubject(createOrder()), { openid: 'openid-1' })).resolves.toMatchObject({
      prepayId: 'wx-prepay-1',
      paymentParams: {
        package: 'prepay_id=wx-prepay-1',
        signType: 'RSA'
      }
    });

    expect(capturedOptions?.path).toBe('/v3/pay/transactions/jsapi');
    expect(capturedBody).toContain('"mchid":"1113847744"');
    const authorization = String(capturedOptions?.headers?.Authorization);
    expect(authorization.startsWith('WECHATPAY2-SHA256-RSA2048 ')).toBe(true);
    expect(
      authorization
        .replace('WECHATPAY2-SHA256-RSA2048 ', '')
        .split(',')
        .map((part) => part.split('=')[0])
    ).toEqual(['mchid', 'nonce_str', 'timestamp', 'serial_no', 'signature']);
  });

  it('starts payments from a generic payment subject', async () => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    let capturedBody = '';

    requestMock.mockImplementation((_, callback) => {
      const request = new EventEmitter() as EventEmitter & {
        write: ReturnType<typeof vi.fn>;
        end: ReturnType<typeof vi.fn>;
      };

      request.write = vi.fn((chunk: string | Buffer) => {
        capturedBody += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk;
      });
      request.end = vi.fn(() => {
        const response = new EventEmitter() as EventEmitter & { statusCode: number };
        response.statusCode = 200;
        callback(response);
        response.emit('data', Buffer.from(JSON.stringify({ prepay_id: 'wx-recharge-prepay-1' })));
        response.emit('end');
      });

      return request;
    });

    const provider = createWechatPayProvider({
      appId: 'wx132ec4cb42c2dbf6',
      mchId: '1113847744',
      mchSerialNo: '124FDE2354D9055D23DD16058265C6FDF8DDFF09',
      privateKey: privatePem,
      notifyUrl: 'https://api.xiaipet.vip/api/v1/payments/wechat/notify'
    });

    await expect(
      provider.startWechatPayment(
        {
          id: 'recharge-001',
          description: 'XiAiPet 充值 5000',
          amount: 5000
        },
        { openid: 'openid-1' }
      )
    ).resolves.toMatchObject({
      outTradeNo: 'recharge-001',
      prepayId: 'wx-recharge-prepay-1',
      paymentParams: expect.objectContaining({ package: 'prepay_id=wx-recharge-prepay-1' })
    });

    expect(JSON.parse(capturedBody)).toMatchObject({
      description: 'XiAiPet 充值 5000',
      out_trade_no: 'recharge-001',
      amount: {
        total: 500000
      }
    });
    expect(provider.supportsRechargePayments).toBe(true);
  });

  it('keeps the WeChat order total separate from the post-coupon payer total', async () => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

    requestMock.mockImplementation((_, callback) => {
      const request = new EventEmitter() as EventEmitter & {
        write: ReturnType<typeof vi.fn>;
        end: ReturnType<typeof vi.fn>;
      };
      request.write = vi.fn();
      request.end = vi.fn(() => {
        const response = new EventEmitter() as EventEmitter & { statusCode: number };
        response.statusCode = 200;
        callback(response);
        response.emit(
          'data',
          Buffer.from(
            JSON.stringify({
              trade_state: 'SUCCESS',
              transaction_id: 'wx-transaction-coupon',
              success_time: '2026-07-16T09:59:05+08:00',
              amount: { total: 50000, payer_total: 38500 }
            })
          )
        );
        response.emit('end');
      });
      return request;
    });

    const provider = createWechatPayProvider({
      appId: 'wx-test-app',
      mchId: 'test-merchant',
      mchSerialNo: 'test-serial',
      privateKey: privatePem,
      notifyUrl: 'https://api.example.test/api/v1/payments/wechat/notify'
    });

    await expect(
      provider.syncWechatPayment(
        { id: 'recharge-coupon-case', description: 'Test recharge', amount: 500 },
        { openid: 'openid-test' }
      )
    ).resolves.toMatchObject({
      tradeState: 'SUCCESS',
      orderAmountCents: 50000,
      payerAmountCents: 38500
    });
  });
});

describe('createMockPaymentProvider', () => {
  it('starts mock payments from a generic payment subject', async () => {
    const provider = createMockPaymentProvider();

    await expect(
      provider.startWechatPayment(
        {
          id: 'recharge-001',
          description: 'XiAiPet 充值 5000',
          amount: 5000
        },
        { openid: 'openid-1' }
      )
    ).resolves.toMatchObject({
      outTradeNo: 'recharge-001',
      prepayId: 'mock_recharge-001_500000_openid-1',
      paymentParams: expect.objectContaining({ package: 'prepay_id=mock_recharge-001_500000_openid-1' }),
      providerTraceId: 'mock-recharge-001-XiAiPet_5000-500000'
    });
  });
});
