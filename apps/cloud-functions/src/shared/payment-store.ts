import type { OrderRecord } from '@xiaipet/shared';
import type { MerchantUserBalanceAdjustmentPayload } from '@xiaipet/shared/types/user-admin';

export interface WechatPayConfig {
  enabled: boolean;
  appid?: string;
  mchid?: string;
  notifyUrl?: string;
}

export interface BalancePaymentResult {
  order: OrderRecord;
  balanceAfter: number;
}

export interface MerchantBalanceAdjustmentResult {
  balanceAfter: number;
  ledger: Record<string, unknown>;
}

export interface PaymentStore {
  getOrderById(orderId: string): Promise<OrderRecord | null>;
  saveOrder(order: OrderRecord): Promise<OrderRecord>;
  listOrdersByOpenid(openid: string): Promise<OrderRecord[]>;
  finalizeBalancePayment(order: OrderRecord, now: string): Promise<BalancePaymentResult | { error: 'INSUFFICIENT_BALANCE' }>;
  applyMerchantBalanceAdjustment(
    payload: MerchantUserBalanceAdjustmentPayload
  ): Promise<MerchantBalanceAdjustmentResult | { error: 'NEGATIVE_BALANCE' }>;
  getWechatPayConfig(): Promise<WechatPayConfig>;
}

function getNormalizedTitle(reasonType: MerchantUserBalanceAdjustmentPayload['reasonType']) {
  if (reasonType === '充值') {
    return '商户充值';
  }

  if (reasonType === '线下收款') {
    return '线下收款';
  }

  if (reasonType === '赠送') {
    return '商户赠送';
  }

  if (reasonType === '优惠券') {
    return '优惠券';
  }

  if (reasonType === '退款') {
    return '退款';
  }

  if (reasonType === '取消赠送') {
    return '取消赠送';
  }

  return '商户调整';
}

function getShortNote(payload: MerchantUserBalanceAdjustmentPayload) {
  const amount = Math.abs(payload.delta).toFixed(2);

  if (payload.action === 'add') {
    return `余额增加 ￥${amount}`;
  }

  if (payload.action === 'deduct') {
    return `余额扣减 ￥${amount}`;
  }

  return '余额未变化';
}

function getCloudSdk() {
  try {
    const cloud = require('wx-server-sdk') as {
      init?: (options?: Record<string, unknown>) => void;
      database?: () => {
        collection: (name: string) => {
          where: (query: Record<string, unknown>) => {
            get: () => Promise<{ data: OrderRecord[] }>;
          };
          doc: (id: string) => {
            get: () => Promise<{ data: Record<string, unknown> }>;
            set: (options: { data: Record<string, unknown> }) => Promise<unknown>;
          };
        };
        startTransaction?: () => Promise<{
          collection: (name: string) => {
            doc: (id: string) => {
              get: () => Promise<{ data: Record<string, unknown> }>;
              set: (options: { data: Record<string, unknown> }) => Promise<unknown>;
            };
          };
          commit: () => Promise<unknown>;
          rollback: () => Promise<unknown>;
        }>;
      };
    };

    cloud.init?.();
    return cloud;
  } catch (error) {
    return null;
  }
}

export function createPaymentStore(): PaymentStore {
  return {
    async getOrderById(orderId) {
      const cloud = getCloudSdk();
      const db = cloud?.database?.();

      if (!db) {
        return null;
      }

      const result = await db.collection('orders').doc(orderId).get();
      return ((result.data as unknown) as OrderRecord | undefined) ?? null;
    },
    async saveOrder(order) {
      const cloud = getCloudSdk();
      const db = cloud?.database?.();

      if (!db) {
        return order;
      }

      await db.collection('orders').doc(order.id).set({
        data: (order as unknown) as Record<string, unknown>
      });

      return order;
    },
    async listOrdersByOpenid(openid) {
      const cloud = getCloudSdk();
      const db = cloud?.database?.();

      if (!db) {
        return [];
      }

      const result = await db.collection('orders').where({ openid }).get();
      return result.data ?? [];
    },
    async finalizeBalancePayment(order, now) {
      const cloud = getCloudSdk();
      const db = cloud?.database?.();

      if (!db?.startTransaction) {
        return {
          error: 'INSUFFICIENT_BALANCE' as const
        };
      }

      const transaction = await db.startTransaction();
      const accounts = transaction.collection('balance_accounts');
      const orders = transaction.collection('orders');
      const ledgers = transaction.collection('balance_ledgers');
      const products = transaction.collection('products');
      const accountSnapshot = await accounts.doc(order.openid).get();
      const currentBalance = Number(accountSnapshot.data?.balance ?? 0);

      if (currentBalance < order.pricing.payableTotal) {
        await transaction.rollback();
        return {
          error: 'INSUFFICIENT_BALANCE' as const
        };
      }

      const nextBalance = Number((currentBalance - order.pricing.payableTotal).toFixed(2));
      const paidOrder: OrderRecord = {
        ...order,
        status: 'paid',
        payment: {
          method: 'balance',
          status: 'paid'
        },
        updatedAt: now,
        paidAt: now
      };

      await orders.doc(order.id).set({
        data: (paidOrder as unknown) as Record<string, unknown>
      });
      await accounts.doc(order.openid).set({
        data: {
          ...(accountSnapshot.data ?? { openid: order.openid, createdAt: now }),
          openid: order.openid,
          balance: nextBalance,
          updatedAt: now
        }
      });
      await ledgers.doc(`ledger-${order.id}`).set({
        data: {
          id: `ledger-${order.id}`,
          openid: order.openid,
          orderId: order.id,
          amountDelta: -order.pricing.payableTotal,
          beforeBalance: currentBalance,
          afterBalance: nextBalance,
          reason: 'order_payment',
          createdAt: now
        }
      });

      for (const item of order.snapshot.items) {
        const productSnapshot = await products.doc(item.productId).get();
        const currentStock = Number(productSnapshot.data?.stock ?? 0);

        await products.doc(item.productId).set({
          data: {
            ...(productSnapshot.data ?? {}),
            stock: Math.max(0, currentStock - item.quantity),
            updatedAt: now
          }
        });
      }

      await transaction.commit();

      return {
        order: paidOrder,
        balanceAfter: nextBalance
      };
    },
    async applyMerchantBalanceAdjustment(payload) {
      const cloud = getCloudSdk();
      const db = cloud?.database?.();

      if (!db?.startTransaction) {
        return {
          error: 'NEGATIVE_BALANCE' as const
        };
      }

      const transaction = await db.startTransaction();
      const accounts = transaction.collection('balance_accounts');
      const ledgers = transaction.collection('balance_ledgers');
      const accountSnapshot = await accounts.doc(payload.userOpenid).get();
      const currentBalance = Number(accountSnapshot.data?.balance ?? 0);
      const nextBalance = Number((currentBalance + payload.delta).toFixed(2));

      if (nextBalance < 0) {
        await transaction.rollback();
        return {
          error: 'NEGATIVE_BALANCE' as const
        };
      }

      const normalizedTitle = getNormalizedTitle(payload.reasonType);
      const shortNote = getShortNote(payload);
      const ledger = {
        id: `ledger-merchant-${payload.userOpenid}-${payload.operatedAt.replace(/\D/g, '')}`,
        openid: payload.userOpenid,
        amountDelta: payload.delta,
        beforeBalance: currentBalance,
        afterBalance: nextBalance,
        reason: 'merchant_adjustment',
        reasonType: payload.reasonType,
        note: payload.note,
        normalizedTitle,
        shortNote,
        operator: payload.operator,
        action: payload.action,
        targetBalance: payload.targetBalance,
        createdAt: payload.operatedAt
      };

      await accounts.doc(payload.userOpenid).set({
        data: {
          ...(accountSnapshot.data ?? { openid: payload.userOpenid, createdAt: payload.operatedAt }),
          openid: payload.userOpenid,
          balance: nextBalance,
          updatedAt: payload.operatedAt
        }
      });
      await ledgers.doc(ledger.id).set({
        data: ledger
      });
      await transaction.commit();

      return {
        balanceAfter: nextBalance,
        ledger
      };
    },
    async getWechatPayConfig() {
      return {
        enabled: process.env.WECHAT_PAY_ENABLED === 'true',
        appid: process.env.WECHAT_PAY_APP_ID,
        mchid: process.env.WECHAT_PAY_MCH_ID,
        notifyUrl: process.env.WECHAT_PAY_NOTIFY_URL
      };
    }
  };
}
