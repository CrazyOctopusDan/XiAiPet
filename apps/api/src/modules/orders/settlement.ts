import type { Prisma, PrismaClient } from '@prisma/client';

import { USER_GIFT_STATUS } from '../../db/enums';
import type { DbClient } from '../../db/types';
import { ApiError } from '../../lib/errors';
import { createPaymentRepository, type PaymentUpsertInput } from '../payments/repository';
import { createOrderRepository, type OrderRecord } from './repository';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function normalizeGiftIds(giftIds: string[]) {
  return [...new Set(giftIds.map((id) => id.trim()).filter(Boolean))];
}

export function getOrderSnapshotGiftIds(snapshot: unknown): string[] {
  if (!isRecord(snapshot) || !Array.isArray(snapshot.gifts)) {
    return [];
  }

  return normalizeGiftIds(
    snapshot.gifts
      .map((gift) => isRecord(gift) && typeof gift.id === 'string' ? gift.id : '')
  );
}

export function runOrderSettlementTransaction<T>(
  client: DbClient,
  callback: (tx: Prisma.TransactionClient) => Promise<T>
) {
  const rootClient = client as PrismaClient;
  if (typeof rootClient.$transaction === 'function') {
    return rootClient.$transaction(callback);
  }

  return callback(client as Prisma.TransactionClient);
}

function assertGiftCountMatches(expectedCount: number, actualCount: number) {
  if (actualCount !== expectedCount) {
    throw new ApiError('ORDER_GIFT_UNAVAILABLE', 'Order gifts are no longer available', 409);
  }
}

export async function assertOrderGiftsLockedForSettlement(
  client: DbClient,
  orderId: string,
  snapshot: unknown
) {
  const giftIds = getOrderSnapshotGiftIds(snapshot);
  if (giftIds.length === 0) {
    return;
  }

  const gifts = await client.userGift.findMany({
    where: {
      id: { in: giftIds },
      lockedOrderId: orderId,
      status: USER_GIFT_STATUS.locked
    },
    select: {
      id: true
    }
  });
  assertGiftCountMatches(giftIds.length, gifts.length);
}

async function assertOrderGiftsRedeemedForSettlement(
  client: DbClient,
  orderId: string,
  snapshot: unknown
) {
  const giftIds = getOrderSnapshotGiftIds(snapshot);
  if (giftIds.length === 0) {
    return;
  }

  const gifts = await client.userGift.findMany({
    where: {
      id: { in: giftIds },
      redeemedOrderId: orderId,
      status: USER_GIFT_STATUS.redeemed
    },
    select: {
      id: true
    }
  });
  assertGiftCountMatches(giftIds.length, gifts.length);
}

async function redeemExpectedOrderGifts(
  client: DbClient,
  orderId: string,
  snapshot: unknown,
  redeemedAt: Date
) {
  const giftIds = getOrderSnapshotGiftIds(snapshot);
  if (giftIds.length === 0) {
    return;
  }

  const result = await client.userGift.updateMany({
    where: {
      id: { in: giftIds },
      lockedOrderId: orderId,
      status: USER_GIFT_STATUS.locked
    },
    data: {
      status: USER_GIFT_STATUS.redeemed,
      redeemedOrderId: orderId,
      redeemedAt
    }
  });
  assertGiftCountMatches(giftIds.length, result.count);
}

export async function markOrderPaidAndRedeemGifts(
  client: DbClient,
  orderId: string,
  paidAt: Date = new Date()
): Promise<OrderRecord> {
  return runOrderSettlementTransaction(client, async (tx) => {
    const order = await createOrderRepository(tx as never).getById(orderId);
    if (!order) {
      throw new ApiError('ORDER_NOT_FOUND', 'Order not found', 404);
    }

    if (order.paymentStatus === 'paid') {
      await assertOrderGiftsRedeemedForSettlement(tx as never, orderId, order.snapshot);
      return order;
    }

    await redeemExpectedOrderGifts(tx as never, orderId, order.snapshot, paidAt);
    return createPaymentRepository(tx as never).markOrderPaid(orderId, paidAt);
  });
}

export async function recordOrderPaymentAndSettle(
  client: DbClient,
  payment: PaymentUpsertInput
): Promise<OrderRecord> {
  return runOrderSettlementTransaction(client, async (tx) => {
    await createPaymentRepository(tx as never).upsertPayment(payment);
    return markOrderPaidAndRedeemGifts(tx as never, payment.orderId, payment.paidAt);
  });
}
