import { describe, expect, it, vi } from 'vitest';

import { USER_GIFT_STATUS } from '../../db/enums';
import { createGiftRepository } from './repository';

describe('gift repository', () => {
  it('exports user gift status enum map', () => {
    expect(USER_GIFT_STATUS).toEqual({
      available: 'AVAILABLE',
      locked: 'LOCKED',
      redeemed: 'REDEEMED'
    });
  });

  it('lists user gifts by openid in stable display order', async () => {
    const findMany = vi.fn(async () => []);
    const repository = createGiftRepository({
      userGift: {
        findMany
      }
    } as never);

    await expect(repository.listByOpenid('openid-1')).resolves.toEqual([]);

    expect(findMany).toHaveBeenCalledWith({
      where: {
        openid: 'openid-1'
      },
      orderBy: [
        { status: 'asc' },
        { expiresAt: 'asc' },
        { createdAt: 'desc' }
      ]
    });
  });

  it('lists checkout eligible available gifts that have not expired', async () => {
    const now = new Date('2026-06-16T09:00:00.000Z');
    const findMany = vi.fn(async () => []);
    const repository = createGiftRepository({
      userGift: {
        findMany
      }
    } as never);

    await expect(repository.listCheckoutEligible('openid-1', now)).resolves.toEqual([]);

    expect(findMany).toHaveBeenCalledWith({
      where: {
        openid: 'openid-1',
        status: USER_GIFT_STATUS.available,
        expiresAt: {
          gt: now
        }
      },
      orderBy: [
        { expiresAt: 'asc' },
        { createdAt: 'desc' }
      ]
    });
  });
});
