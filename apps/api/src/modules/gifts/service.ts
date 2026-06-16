import type { Prisma, PrismaClient } from '@prisma/client';

import { USER_GIFT_STATUS, toSharedEnum } from '../../db/enums';
import { getPrismaClient } from '../../db/prisma';
import type { DbClient } from '../../db/types';
import { ApiError } from '../../lib/errors';
import { createGiftRepository } from './repository';

type UserGiftDisplayGroup = 'available' | 'locked' | 'redeemed' | 'expired';
type UserGiftStatus = 'available' | 'locked' | 'redeemed';

interface UserGiftRow {
  id: string;
  status: string;
  giftSnapshot: unknown;
  expiresAt: Date;
  lockedOrderId: string | null;
  redeemedOrderId: string | null;
  lockedAt: Date | null;
  redeemedAt: Date | null;
}

export interface UserGiftView {
  id: string;
  status: UserGiftStatus;
  displayGroup: UserGiftDisplayGroup;
  giftSnapshot: {
    name: string;
    description: string;
    validDays: number;
  };
  expiresAt: string;
  lockedOrderId?: string;
  redeemedOrderId?: string;
  lockedAt?: string;
  redeemedAt?: string;
}

export interface LockedGiftSnapshot {
  id: string;
  giftSnapshot: UserGiftView['giftSnapshot'];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function normalizeGiftIds(giftIds: string[]) {
  return [...new Set(giftIds.map((id) => id.trim()).filter(Boolean))];
}

function mapGiftSnapshot(value: unknown): UserGiftView['giftSnapshot'] {
  const snapshot = isRecord(value) ? value : {};
  return {
    name: typeof snapshot.name === 'string' ? snapshot.name : '',
    description: typeof snapshot.description === 'string' ? snapshot.description : '',
    validDays: typeof snapshot.validDays === 'number' && Number.isFinite(snapshot.validDays)
      ? Math.trunc(snapshot.validDays)
      : 0
  };
}

function summarizeGiftStatus(status: UserGiftStatus, expiresAt: string, now = new Date()): UserGiftDisplayGroup {
  if (status === 'redeemed') return 'redeemed';
  if (status === 'locked') return 'locked';
  const expiresAtDate = new Date(expiresAt);
  return !Number.isNaN(expiresAtDate.getTime()) && expiresAtDate.getTime() <= now.getTime()
    ? 'expired'
    : 'available';
}

function mapUserGift(row: UserGiftRow, now = new Date()): UserGiftView {
  const status = toSharedEnum(row.status, USER_GIFT_STATUS);
  const expiresAt = row.expiresAt.toISOString();
  return {
    id: row.id,
    status,
    displayGroup: summarizeGiftStatus(status, expiresAt, now),
    giftSnapshot: mapGiftSnapshot(row.giftSnapshot),
    expiresAt,
    lockedOrderId: row.lockedOrderId ?? undefined,
    redeemedOrderId: row.redeemedOrderId ?? undefined,
    lockedAt: row.lockedAt?.toISOString(),
    redeemedAt: row.redeemedAt?.toISOString()
  };
}

function groupUserGifts(gifts: UserGiftView[]) {
  return gifts.reduce<Record<UserGiftDisplayGroup, UserGiftView[]>>(
    (groups, gift) => {
      groups[gift.displayGroup].push(gift);
      return groups;
    },
    {
      available: [],
      locked: [],
      redeemed: [],
      expired: []
    }
  );
}

async function runWithOptionalTransaction<T>(
  client: DbClient,
  callback: (tx: Prisma.TransactionClient) => Promise<T>
) {
  const rootClient = client as PrismaClient;
  if (typeof rootClient.$transaction === 'function') {
    return rootClient.$transaction(callback);
  }

  return callback(client as Prisma.TransactionClient);
}

async function lockGiftsForOrder(
  client: DbClient,
  openid: string,
  orderId: string,
  giftIds: string[]
): Promise<LockedGiftSnapshot[]> {
  const ids = normalizeGiftIds(giftIds);
  if (ids.length === 0) {
    return [];
  }

  return runWithOptionalTransaction(client, async (tx) => {
    const now = new Date();
    const updated = await tx.userGift.updateMany({
      where: {
        openid,
        id: { in: ids },
        status: USER_GIFT_STATUS.available,
        expiresAt: { gt: now }
      },
      data: {
        status: USER_GIFT_STATUS.locked,
        lockedOrderId: orderId,
        lockedAt: now,
        releasedAt: null,
        redeemedOrderId: null,
        redeemedAt: null
      }
    });

    if (updated.count !== ids.length) {
      throw new ApiError('GIFT_UNAVAILABLE', 'Selected gift is unavailable', 409);
    }

    const gifts = await tx.userGift.findMany({
      where: {
        openid,
        id: { in: ids },
        lockedOrderId: orderId,
        status: USER_GIFT_STATUS.locked
      },
      orderBy: {
        expiresAt: 'asc'
      }
    });

    return gifts.map((gift) => ({
      id: gift.id,
      giftSnapshot: mapGiftSnapshot(gift.giftSnapshot)
    }));
  });
}

async function redeemGiftsForOrder(client: DbClient, orderId: string) {
  const now = new Date();
  const result = await client.userGift.updateMany({
    where: {
      lockedOrderId: orderId,
      status: USER_GIFT_STATUS.locked
    },
    data: {
      status: USER_GIFT_STATUS.redeemed,
      redeemedOrderId: orderId,
      redeemedAt: now
    }
  });

  return { ok: true as const, count: result.count };
}

async function releaseGiftsForOrder(client: DbClient, orderId: string) {
  const now = new Date();
  const result = await client.userGift.updateMany({
    where: {
      lockedOrderId: orderId,
      status: USER_GIFT_STATUS.locked
    },
    data: {
      status: USER_GIFT_STATUS.available,
      lockedOrderId: null,
      lockedAt: null,
      releasedAt: now
    }
  });

  return { ok: true as const, count: result.count };
}

export function createGiftService(client: DbClient = getPrismaClient()) {
  return {
    async listCustomerGifts(openid: string) {
      const now = new Date();
      const gifts = (await createGiftRepository(client).listByOpenid(openid)).map((gift) => mapUserGift(gift, now));
      return {
        ok: true as const,
        gifts,
        groups: groupUserGifts(gifts)
      };
    },

    async listCheckoutGifts(openid: string) {
      const now = new Date();
      const gifts = (await createGiftRepository(client).listCheckoutEligible(openid, now)).map((gift) => mapUserGift(gift, now));
      return { ok: true as const, gifts };
    },

    async lockGiftsForOrder(openid: string, orderId: string, giftIds: string[], txClient: DbClient = client) {
      return lockGiftsForOrder(txClient, openid, orderId, giftIds);
    },

    async redeemGiftsForOrder(orderId: string, txClient: DbClient = client) {
      return redeemGiftsForOrder(txClient, orderId);
    },

    async releaseGiftsForOrder(orderId: string, txClient: DbClient = client) {
      return releaseGiftsForOrder(txClient, orderId);
    }
  };
}
