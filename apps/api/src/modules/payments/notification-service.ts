import { createDecipheriv, createVerify } from 'node:crypto';

import type { ApiConfig } from '../../config/env';
import { ApiError } from '../../lib/errors';
import { getPrismaClient } from '../../db/prisma';
import type { DbClient } from '../../db/types';
import { createRechargeService } from '../recharge/service';
import { createPaymentRepository } from './repository';

export interface WechatPayNotificationHeaders {
  timestamp: string;
  nonce: string;
  serial: string;
  signature: string;
}

export interface WechatPayNotificationInput {
  rawBody: string;
  headers: WechatPayNotificationHeaders;
}

interface WechatPayNotificationBody {
  resource?: {
    ciphertext?: string;
    nonce?: string;
    associated_data?: string;
  };
}

interface WechatPayTransactionResource {
  out_trade_no?: string;
  transaction_id?: string;
  trade_state?: string;
  success_time?: string;
  amount?: {
    total?: number;
    payer_total?: number;
  };
}

function normalizeKey(key: string) {
  return key.includes('\\n') ? key.replaceAll('\\n', '\n') : key;
}

function verifyWechatPaySignature(input: WechatPayNotificationInput, platformPublicKey: string) {
  const message = `${input.headers.timestamp}\n${input.headers.nonce}\n${input.rawBody}\n`;
  return createVerify('RSA-SHA256')
    .update(message)
    .verify(normalizeKey(platformPublicKey), input.headers.signature, 'base64');
}

function decryptWechatPayResource(resource: NonNullable<WechatPayNotificationBody['resource']>, apiV3Key: string) {
  if (!resource.ciphertext || !resource.nonce) {
    throw new ApiError('WECHAT_PAY_NOTIFY_INVALID_RESOURCE', 'Invalid WeChat Pay notification resource', 400);
  }

  const ciphertext = Buffer.from(resource.ciphertext, 'base64');
  const encrypted = ciphertext.subarray(0, ciphertext.length - 16);
  const authTag = ciphertext.subarray(ciphertext.length - 16);
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(apiV3Key, 'utf8'), resource.nonce);

  if (resource.associated_data) {
    decipher.setAAD(Buffer.from(resource.associated_data, 'utf8'));
  }

  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

function readPaidAmountCents(resource: WechatPayTransactionResource) {
  const amount = resource.amount?.payer_total ?? resource.amount?.total;
  return typeof amount === 'number' && Number.isFinite(amount) ? amount : undefined;
}

function toCents(value: number) {
  return Math.round(value * 100);
}

function decimalToNumber(value: unknown) {
  if (typeof value === 'number') {
    return value;
  }
  if (value && typeof value === 'object' && 'toNumber' in value && typeof value.toNumber === 'function') {
    return value.toNumber();
  }
  return Number(value);
}

async function assertOrderPaymentAmountMatches(client: DbClient, orderId: string, paidAmountCents?: number) {
  if (paidAmountCents === undefined) {
    return;
  }

  const order = await client.order.findUnique({
    where: { id: orderId },
    select: { payableTotal: true }
  });
  if (!order) {
    throw new ApiError('ORDER_NOT_FOUND', 'Order not found', 404);
  }

  const expectedAmountCents = toCents(decimalToNumber(order.payableTotal));
  if (expectedAmountCents !== paidAmountCents) {
    throw new ApiError('ORDER_PAYMENT_AMOUNT_MISMATCH', 'Order payment amount does not match order total', 409);
  }
}

export function createPaymentNotifyService(
  config: ApiConfig['wechatPay'],
  client: DbClient = getPrismaClient()
) {
  return {
    async handleWechatPayNotification(input: WechatPayNotificationInput) {
      if (!config) {
        throw new ApiError('WECHAT_PAY_NOT_CONFIGURED', 'WeChat Pay is not configured', 503);
      }

      if (!verifyWechatPaySignature(input, config.platformPublicKey)) {
        throw new ApiError('WECHAT_PAY_NOTIFY_SIGNATURE_INVALID', 'Invalid WeChat Pay notification signature', 401);
      }

      const body = JSON.parse(input.rawBody) as WechatPayNotificationBody;
      if (!body.resource) {
        throw new ApiError('WECHAT_PAY_NOTIFY_INVALID_RESOURCE', 'Invalid WeChat Pay notification resource', 400);
      }

      const resource = JSON.parse(decryptWechatPayResource(body.resource, config.apiV3Key)) as WechatPayTransactionResource;
      if (!resource.out_trade_no) {
        throw new ApiError('WECHAT_PAY_NOTIFY_MISSING_ORDER', 'WeChat Pay notification missing out_trade_no', 400);
      }

      if (resource.trade_state === 'SUCCESS') {
        const paidAt = resource.success_time ? new Date(resource.success_time) : new Date();
        const paidAmountCents = readPaidAmountCents(resource);
        if (resource.out_trade_no.startsWith('recharge-')) {
          await createRechargeService(client as never).settleWechatRechargePayment(resource.out_trade_no, {
            transactionId: resource.transaction_id,
            paidAt,
            paidAmountCents
          });
        } else {
          await assertOrderPaymentAmountMatches(client, resource.out_trade_no, paidAmountCents);
          const paymentRepository = createPaymentRepository(client);
          await paymentRepository.upsertPayment({
            orderId: resource.out_trade_no,
            method: 'wechat',
            status: 'paid',
            outTradeNo: resource.out_trade_no,
            transactionId: resource.transaction_id,
            paidAt
          });
          await paymentRepository.markOrderPaid(resource.out_trade_no, paidAt);
        }
      }

      return { ok: true as const };
    }
  };
}
