import { describe, expect, it, vi } from 'vitest';

import {
  NEW_ORDER_SUBSCRIPTION_TEMPLATE_ID,
  createMerchantNotificationService,
  type MerchantNotificationSubscriberRepository
} from './service';

const account = {
  id: 'acct-admin',
  username: 'admin',
  passwordHash: 'hidden',
  role: 'admin' as const,
  status: 'active' as const,
  mustChangePassword: false,
  createdBy: null,
  lastLoginAt: null,
  createdAt: new Date('2026-06-30T00:00:00.000Z'),
  updatedAt: new Date('2026-06-30T00:00:00.000Z')
};

function createRepository(): MerchantNotificationSubscriberRepository {
  return {
    upsertSubscriber: vi.fn(async (input) => ({
      id: 'sub-1',
      merchantAccountId: input.merchantAccountId,
      openid: input.openid,
      templateId: input.templateId,
      enabled: true,
      lastSubscribedAt: new Date('2026-06-30T10:00:00.000Z'),
      lastNotifiedAt: null,
      createdAt: new Date('2026-06-30T10:00:00.000Z'),
      updatedAt: new Date('2026-06-30T10:00:00.000Z')
    })),
    listEnabledSubscribersForActiveAccounts: vi.fn(async () => [
      {
        id: 'sub-admin-1',
        merchantAccountId: 'acct-admin',
        openid: 'openid-owner',
        templateId: NEW_ORDER_SUBSCRIPTION_TEMPLATE_ID,
        enabled: true,
        lastSubscribedAt: new Date('2026-06-30T10:00:00.000Z'),
        lastNotifiedAt: null,
        createdAt: new Date('2026-06-30T10:00:00.000Z'),
        updatedAt: new Date('2026-06-30T10:00:00.000Z')
      },
      {
        id: 'sub-admin-2',
        merchantAccountId: 'acct-admin',
        openid: 'openid-staff-phone',
        templateId: NEW_ORDER_SUBSCRIPTION_TEMPLATE_ID,
        enabled: true,
        lastSubscribedAt: new Date('2026-06-30T10:05:00.000Z'),
        lastNotifiedAt: null,
        createdAt: new Date('2026-06-30T10:05:00.000Z'),
        updatedAt: new Date('2026-06-30T10:05:00.000Z')
      }
    ]),
    markNotified: vi.fn(async () => undefined)
  };
}

describe('merchant notification service', () => {
  it('binds multiple WeChat receivers to the same merchant account subscription template', async () => {
    const repository = createRepository();
    const loginProvider = {
      exchangeLoginCode: vi.fn(async (code: string) => ({ openid: `openid-${code}` }))
    };
    const service = createMerchantNotificationService({
      repository,
      merchantWechatLoginProvider: loginProvider
    });

    await service.enableNewOrderSubscription(account, {
      code: 'owner',
      templateId: NEW_ORDER_SUBSCRIPTION_TEMPLATE_ID
    });
    await service.enableNewOrderSubscription(account, {
      code: 'staff-phone',
      templateId: NEW_ORDER_SUBSCRIPTION_TEMPLATE_ID
    });

    expect(repository.upsertSubscriber).toHaveBeenNthCalledWith(1, {
      merchantAccountId: 'acct-admin',
      openid: 'openid-owner',
      templateId: NEW_ORDER_SUBSCRIPTION_TEMPLATE_ID
    });
    expect(repository.upsertSubscriber).toHaveBeenNthCalledWith(2, {
      merchantAccountId: 'acct-admin',
      openid: 'openid-staff-phone',
      templateId: NEW_ORDER_SUBSCRIPTION_TEMPLATE_ID
    });
  });

  it('sends new-order messages to every enabled receiver under active merchant accounts', async () => {
    const repository = createRepository();
    const sender = {
      sendNewOrderMessage: vi.fn(async () => ({ ok: true as const }))
    };
    const service = createMerchantNotificationService({
      repository,
      merchantWechatLoginProvider: { exchangeLoginCode: vi.fn() },
      sender
    });

    await service.notifyNewOrder({
      id: 'order-20260630-001',
      snapshot: {
        contact: { name: '张女士' },
        items: [{ quantity: 2 }, { quantity: 1 }]
      },
      pricing: {
        payableTotal: 188.8
      },
      createdAt: '2026-06-30T10:30:00.000Z'
    });

    expect(sender.sendNewOrderMessage).toHaveBeenCalledTimes(2);
    expect(sender.sendNewOrderMessage).toHaveBeenNthCalledWith(1, {
      touser: 'openid-owner',
      orderId: 'order-20260630-001',
      customerName: '张女士',
      itemQuantity: 3,
      payableTotal: 188.8,
      paidAt: '2026-06-30T10:30:00.000Z'
    });
    expect(sender.sendNewOrderMessage).toHaveBeenNthCalledWith(2, expect.objectContaining({
      touser: 'openid-staff-phone'
    }));
    expect(repository.markNotified).toHaveBeenCalledWith('sub-admin-1', new Date('2026-06-30T10:30:00.000Z'));
    expect(repository.markNotified).toHaveBeenCalledWith('sub-admin-2', new Date('2026-06-30T10:30:00.000Z'));
  });
});
