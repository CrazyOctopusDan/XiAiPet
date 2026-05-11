import type { PrismaClient } from '@prisma/client';

import { createCatalogRepository } from '../catalog/repository';
import { createOrderRepository, type CreateOrderInput, type OrderRecord } from './repository';
import { getPrismaClient } from '../../db/prisma';

export function createOrderService(client: PrismaClient = getPrismaClient()) {
  return {
    async createPendingOrder(input: CreateOrderInput): Promise<OrderRecord> {
      return client.$transaction(async (tx) => {
        const orderRepository = createOrderRepository(tx);
        const catalogRepository = createCatalogRepository(tx);
        const existing = await orderRepository.getByOpenidAndIdempotencyKey(input.openid, input.idempotencyKey);

        if (existing) {
          return existing;
        }

        const order = await orderRepository.createPending(input);

        for (const item of input.items) {
          await catalogRepository.decrementStock(item.productId, item.quantity);
        }

        return order;
      });
    }
  };
}
