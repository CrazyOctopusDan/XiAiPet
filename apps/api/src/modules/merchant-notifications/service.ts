import type { WechatLoginProvider } from '../auth/wechat-login';
import { getPrismaClient } from '../../db/prisma';
import type { DbClient } from '../../db/types';
import type { MerchantAccountRecord } from '../merchant-accounts/service';
import { createWechatSubscriptionMessageSender, type NewOrderSubscriptionMessageSender } from './wechat-sender';

export const NEW_ORDER_SUBSCRIPTION_TEMPLATE_ID = 'tTJBDAEzr5FVXraGKu75bwi5RqMD3ewsmpYqE926u8M';

export interface MerchantNotificationSubscriberRecord {
  id: string;
  merchantAccountId: string;
  openid: string;
  templateId: string;
  enabled: boolean;
  lastSubscribedAt: Date;
  lastNotifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MerchantNotificationSubscriberRepository {
  upsertSubscriber(input: {
    merchantAccountId: string;
    openid: string;
    templateId: string;
  }): Promise<MerchantNotificationSubscriberRecord>;
  listEnabledSubscribersForActiveAccounts(templateId: string): Promise<MerchantNotificationSubscriberRecord[]>;
  markNotified(subscriberId: string, notifiedAt: Date): Promise<void>;
}

interface NewOrderNotificationInput {
  id: string;
  snapshot: unknown;
  pricing: {
    payableTotal: number;
  };
  createdAt: string;
  paidAt?: string;
}

interface MerchantNotificationServiceOptions {
  repository?: MerchantNotificationSubscriberRepository;
  merchantWechatLoginProvider: WechatLoginProvider;
  sender?: NewOrderSubscriptionMessageSender;
}

function subscriberClient(client: DbClient) {
  return (client as unknown as { merchantOrderNotificationSubscriber: any }).merchantOrderNotificationSubscriber;
}

export function createMerchantNotificationSubscriberRepository(
  client: DbClient = getPrismaClient()
): MerchantNotificationSubscriberRepository {
  const subscribers = subscriberClient(client);

  return {
    async upsertSubscriber(input) {
      return subscribers.upsert({
        where: {
          merchantAccountId_openid_templateId: {
            merchantAccountId: input.merchantAccountId,
            openid: input.openid,
            templateId: input.templateId
          }
        },
        create: {
          merchantAccountId: input.merchantAccountId,
          openid: input.openid,
          templateId: input.templateId,
          enabled: true,
          lastSubscribedAt: new Date()
        },
        update: {
          enabled: true,
          lastSubscribedAt: new Date()
        }
      });
    },

    async listEnabledSubscribersForActiveAccounts(templateId) {
      return subscribers.findMany({
        where: {
          templateId,
          enabled: true,
          merchantAccount: {
            status: 'ACTIVE'
          }
        },
        orderBy: [{ merchantAccountId: 'asc' }, { createdAt: 'asc' }]
      });
    },

    async markNotified(subscriberId, notifiedAt) {
      await subscribers.update({
        where: { id: subscriberId },
        data: { lastNotifiedAt: notifiedAt }
      });
    }
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function getNestedObject(value: unknown, key: string) {
  return isObject(value) && isObject(value[key]) ? value[key] : null;
}

function getCustomerName(snapshot: unknown) {
  const contact = getNestedObject(snapshot, 'contact');
  if (typeof contact?.name === 'string' && contact.name.trim()) {
    return contact.name.trim();
  }

  const fulfillment = getNestedObject(snapshot, 'fulfillment');
  const address = getNestedObject(fulfillment, 'address');
  if (typeof address?.recipientName === 'string' && address.recipientName.trim()) {
    return address.recipientName.trim();
  }

  return '顾客';
}

function getItemQuantity(snapshot: unknown) {
  if (!isObject(snapshot) || !Array.isArray(snapshot.items)) {
    return 0;
  }

  return snapshot.items.reduce((total, item) => {
    return total + (isObject(item) ? Math.max(0, Math.trunc(toNumber(item.quantity))) : 0);
  }, 0);
}

export function createMerchantNotificationService(options: MerchantNotificationServiceOptions) {
  const repository = options.repository ?? createMerchantNotificationSubscriberRepository();
  const sender = options.sender ?? createWechatSubscriptionMessageSender();

  return {
    async enableNewOrderSubscription(account: MerchantAccountRecord, input: { code?: string; templateId?: string }) {
      if (!input.code?.trim()) {
        throw new Error('INVALID_WECHAT_LOGIN_CODE');
      }
      const templateId = input.templateId === NEW_ORDER_SUBSCRIPTION_TEMPLATE_ID
        ? input.templateId
        : NEW_ORDER_SUBSCRIPTION_TEMPLATE_ID;
      const login = await options.merchantWechatLoginProvider.exchangeLoginCode(input.code);
      const subscriber = await repository.upsertSubscriber({
        merchantAccountId: account.id,
        openid: login.openid,
        templateId
      });

      return {
        ok: true as const,
        subscriber: {
          id: subscriber.id,
          openid: subscriber.openid,
          templateId: subscriber.templateId,
          enabled: subscriber.enabled
        }
      };
    },

    async notifyNewOrder(order: NewOrderNotificationInput) {
      const subscribers = await repository.listEnabledSubscribersForActiveAccounts(NEW_ORDER_SUBSCRIPTION_TEMPLATE_ID);
      const paidAt = order.paidAt ?? order.createdAt;
      const notifiedAt = new Date(paidAt);

      await Promise.allSettled(
        subscribers.map(async (subscriber) => {
          await sender.sendNewOrderMessage({
            touser: subscriber.openid,
            orderId: order.id,
            customerName: getCustomerName(order.snapshot),
            itemQuantity: getItemQuantity(order.snapshot),
            payableTotal: order.pricing.payableTotal,
            paidAt
          });
          await repository.markNotified(subscriber.id, notifiedAt);
        })
      );

      return {
        ok: true as const,
        attempted: subscribers.length
      };
    }
  };
}
