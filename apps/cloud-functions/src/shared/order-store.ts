import type { OrderRecord } from '@xiaipet/shared';

export interface MerchantOrderTimelineEntry {
  type: 'created' | 'payment' | 'manual_settlement' | 'fulfillment' | 'cancelled';
  label: string;
  at: string;
  detail?: string;
  operator?: {
    id: string;
    name: string;
  };
  fromStatus?: string;
  toStatus?: string;
}

export interface MerchantManagedOrderRecord extends OrderRecord {
  merchantTimeline?: MerchantOrderTimelineEntry[];
}

export interface OrderStore {
  getByOpenidAndIdempotencyKey(openid: string, idempotencyKey: string): Promise<OrderRecord | null>;
  getById(orderId: string): Promise<OrderRecord | null>;
  listMerchantOrders(): Promise<OrderRecord[]>;
  save(order: OrderRecord): Promise<OrderRecord>;
}

function getCloudDatabase() {
  try {
    const cloud = require('wx-server-sdk') as {
      init?: (options?: Record<string, unknown>) => void;
      database?: () => {
        collection: (name: string) => {
          get: () => Promise<{ data: OrderRecord[] }>;
          where: (query: Record<string, unknown>) => {
            get: () => Promise<{ data: OrderRecord[] }>;
          };
          doc: (id: string) => {
            set: (options: { data: OrderRecord }) => Promise<unknown>;
            get: () => Promise<{ data: OrderRecord }>;
          };
        };
      };
    };

    cloud.init?.();
    return cloud.database?.();
  } catch (error) {
    return undefined;
  }
}

export function createOrderStore(): OrderStore {
  return {
    async getByOpenidAndIdempotencyKey(openid, idempotencyKey) {
      const db = getCloudDatabase();

      if (!db) {
        return null;
      }

      const result = await db.collection('orders').where({ openid, idempotencyKey }).get();
      return result.data[0] ?? null;
    },
    async getById(orderId) {
      const db = getCloudDatabase();

      if (!db) {
        return null;
      }

      const result = await db.collection('orders').doc(orderId).get();
      return result.data ?? null;
    },
    async listMerchantOrders() {
      const db = getCloudDatabase();

      if (!db) {
        return [];
      }

      const result = await db.collection('orders').get();
      return result.data ?? [];
    },
    async save(order) {
      const db = getCloudDatabase();

      if (!db) {
        return order;
      }

      await db.collection('orders').doc(order.id).set({
        data: order
      });

      return order;
    }
  };
}
