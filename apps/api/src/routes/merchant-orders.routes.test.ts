import { describe, expect, it, vi } from 'vitest';

import { buildApp } from '../app';
import { authHeader, testConfig } from './test-helpers';

describe('merchant order routes', () => {
  it('rejects before merchant order service when access is denied', async () => {
    const queryMerchantOrders = vi.fn(async () => ({ ok: true, orders: [] }));
    const app = buildApp({
      config: testConfig,
      dependencies: {
        identityService: {
          bootstrapUser: async () => ({ ok: true }),
          bindPhone: async () => ({ ok: true }),
          assertMerchantAccess: async () => ({ ok: true, status: 'denied', allowed: false, reason: 'denied' })
        },
        orderService: {
          createCustomerOrder: async () => ({ ok: true }),
          startCustomerPayment: async () => ({ ok: true }),
          confirmCustomerPayment: async () => ({ ok: true }),
          syncCustomerPayment: async () => ({ ok: true }),
          queryCustomerOrders: async () => ({ ok: true }),
          getCustomerOrderDetail: async () => ({ ok: true }),
          queryMerchantOrders,
          getMerchantOrderDetail: async () => ({ ok: true }),
          updateMerchantOrderStatus: async () => ({ ok: true })
        }
      }
    });

    const response = await app.inject({ method: 'GET', url: '/api/v1/merchant/orders', headers: authHeader('openid-1') });
    expect(response.statusCode).toBe(403);
    expect(queryMerchantOrders).not.toHaveBeenCalled();
  });

  it('routes merchant list detail and status update for allowed merchants', async () => {
    const orderService = {
      createCustomerOrder: vi.fn(async () => ({ ok: true })),
      startCustomerPayment: vi.fn(async () => ({ ok: true })),
      confirmCustomerPayment: vi.fn(async () => ({ ok: true })),
      syncCustomerPayment: vi.fn(async () => ({ ok: true })),
      queryCustomerOrders: vi.fn(async () => ({ ok: true })),
      getCustomerOrderDetail: vi.fn(async () => ({ ok: true })),
      queryMerchantOrders: vi.fn(async () => ({ ok: true, orders: [] })),
      getMerchantOrderDetail: vi.fn(async () => ({ ok: true, order: { id: 'order-1' } })),
      updateMerchantOrderStatus: vi.fn(async () => ({ ok: true, order: { id: 'order-1', status: 'paid' } }))
    };
    const app = buildApp({
      config: testConfig,
      dependencies: {
        identityService: {
          bootstrapUser: async () => ({ ok: true }),
          bindPhone: async () => ({ ok: true }),
          assertMerchantAccess: async () => ({ ok: true, status: 'allowed', allowed: true, merchant: { merchantId: 'm1', storeName: 'store' } })
        },
        orderService
      }
    });

    expect((await app.inject({ method: 'GET', url: '/api/v1/merchant/orders', headers: authHeader('m') })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/api/v1/merchant/orders/order-1', headers: authHeader('m') })).statusCode).toBe(200);
    expect((await app.inject({ method: 'PATCH', url: '/api/v1/merchant/orders/order-1/status', headers: authHeader('m'), payload: { status: 'paid' } })).statusCode).toBe(200);
    expect(orderService.queryMerchantOrders).toHaveBeenCalled();
    expect(orderService.getMerchantOrderDetail).toHaveBeenCalled();
    expect(orderService.updateMerchantOrderStatus).toHaveBeenCalled();
  });
});
