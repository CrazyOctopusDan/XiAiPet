import { createCipheriv, createSign, generateKeyPairSync, randomBytes } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DbClient } from '../../db/types';
import { createPaymentNotifyService } from './notification-service';

const API_V3_KEY = '12345678901234567890123456789012';
const rechargeSettlementMock = vi.hoisted(() => vi.fn());

vi.mock('../recharge/service', () => ({
  createRechargeService: vi.fn(() => ({
    settleWechatRechargePayment: rechargeSettlementMock
  }))
}));

function createOrderRow(orderId: string) {
  const now = new Date('2026-06-11T01:00:00.000Z');
  return {
    id: orderId,
    openid: 'openid-1',
    status: 'PAID',
    idempotencyKey: 'idem-1',
    paymentMethod: 'WECHAT',
    paymentStatus: 'PAID',
    fulfillmentMode: 'PICKUP',
    fulfillmentStatus: 'PENDING',
    itemsSubtotal: { toNumber: () => 0.01 },
    deliveryFee: { toNumber: () => 0 },
    payableTotal: { toNumber: () => 0.01 },
    snapshot: {},
    createdAt: now,
    updatedAt: now,
    paidAt: now,
    cancelledAt: null
  };
}

function encryptResource(resource: object) {
  const nonce = 'notify-nonce';
  const associatedData = 'transaction';
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(API_V3_KEY, 'utf8'), nonce);
  cipher.setAAD(Buffer.from(associatedData, 'utf8'));
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(resource), 'utf8'),
    cipher.final(),
    cipher.getAuthTag()
  ]);

  return {
    ciphertext: encrypted.toString('base64'),
    nonce,
    associated_data: associatedData
  };
}

function signBody(privateKey: string, timestamp: string, nonce: string, rawBody: string) {
  return createSign('RSA-SHA256')
    .update(`${timestamp}\n${nonce}\n${rawBody}\n`)
    .sign(privateKey, 'base64');
}

describe('createPaymentNotifyService', () => {
  beforeEach(() => {
    rechargeSettlementMock.mockReset();
  });

  it('verifies, decrypts and records successful WeChat Pay notifications', async () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const paymentUpsert = vi.fn(async () => ({}));
    const orderUpdate = vi.fn(async ({ where }: { where: { id: string } }) => createOrderRow(where.id));
    const client = {
      payment: { upsert: paymentUpsert },
      order: { update: orderUpdate }
    } as unknown as DbClient;
    const rawBody = JSON.stringify({
      id: 'notice-1',
      resource: encryptResource({
        out_trade_no: 'order-1',
        transaction_id: 'wx-transaction-1',
        trade_state: 'SUCCESS',
        success_time: '2026-06-11T01:02:03+08:00'
      })
    });
    const timestamp = '1700000000';
    const nonce = randomBytes(12).toString('hex');
    const service = createPaymentNotifyService({
      mchId: '1113847744',
      mchSerialNo: 'merchant-serial',
      privateKey: privatePem,
      notifyUrl: 'https://api.xiaipet.vip/api/v1/payments/wechat/notify',
      apiV3Key: API_V3_KEY,
      platformPublicKey: publicPem
    }, client);

    await expect(service.handleWechatPayNotification({
      rawBody,
      headers: {
        timestamp,
        nonce,
        serial: 'platform-serial',
        signature: signBody(privatePem, timestamp, nonce, rawBody)
      }
    })).resolves.toEqual({ ok: true });

    expect(paymentUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { orderId: 'order-1' },
      update: expect.objectContaining({
        status: 'PAID',
        transactionId: 'wx-transaction-1'
      })
    }));
    expect(orderUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'order-1' },
      data: expect.objectContaining({
        status: 'PAID',
        paymentStatus: 'PAID'
      })
    }));
    expect(rechargeSettlementMock).not.toHaveBeenCalled();
  });

  it('routes successful recharge notifications to recharge settlement', async () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const paymentUpsert = vi.fn();
    const orderUpdate = vi.fn();
    const client = {
      payment: { upsert: paymentUpsert },
      order: { update: orderUpdate }
    } as unknown as DbClient;
    const rawBody = JSON.stringify({
      id: 'notice-1',
      resource: encryptResource({
        out_trade_no: 'recharge-openid-1_idem-1',
        transaction_id: 'wx-recharge-transaction-1',
        trade_state: 'SUCCESS',
        success_time: '2026-06-11T01:02:03+08:00'
      })
    });
    const timestamp = '1700000000';
    const nonce = randomBytes(12).toString('hex');
    const service = createPaymentNotifyService({
      mchId: '1113847744',
      mchSerialNo: 'merchant-serial',
      privateKey: privatePem,
      notifyUrl: 'https://api.xiaipet.vip/api/v1/payments/wechat/notify',
      apiV3Key: API_V3_KEY,
      platformPublicKey: publicPem
    }, client);

    await expect(service.handleWechatPayNotification({
      rawBody,
      headers: {
        timestamp,
        nonce,
        serial: 'platform-serial',
        signature: signBody(privatePem, timestamp, nonce, rawBody)
      }
    })).resolves.toEqual({ ok: true });

    expect(rechargeSettlementMock).toHaveBeenCalledWith('recharge-openid-1_idem-1', {
      transactionId: 'wx-recharge-transaction-1',
      paidAt: new Date('2026-06-10T17:02:03.000Z')
    });
    expect(paymentUpsert).not.toHaveBeenCalled();
    expect(orderUpdate).not.toHaveBeenCalled();
  });

  it('rejects notifications with invalid signatures', async () => {
    const { publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const service = createPaymentNotifyService({
      mchId: '1113847744',
      mchSerialNo: 'merchant-serial',
      privateKey: 'unused',
      notifyUrl: 'https://api.xiaipet.vip/api/v1/payments/wechat/notify',
      apiV3Key: API_V3_KEY,
      platformPublicKey: publicPem
    }, {} as DbClient);

    await expect(service.handleWechatPayNotification({
      rawBody: '{}',
      headers: {
        timestamp: '1700000000',
        nonce: 'nonce',
        serial: 'platform-serial',
        signature: 'invalid-signature'
      }
    })).rejects.toMatchObject({
      code: 'WECHAT_PAY_NOTIFY_SIGNATURE_INVALID'
    });
  });
});
