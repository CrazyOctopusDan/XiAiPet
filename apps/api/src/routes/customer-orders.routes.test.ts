import { describe, expect, it, vi } from 'vitest';

import { buildApp } from '../app';
import { authHeader, testConfig } from './test-helpers';

function createOrderService(overrides: Record<string, unknown> = {}) {
  return {
    createCustomerOrder: vi.fn(async () => ({ ok: true, order: { id: 'order-1' } })),
    startCustomerPayment: vi.fn(async () => ({ ok: true, paymentStatus: 'pending_wechat' })),
    confirmCustomerPayment: vi.fn(async () => ({ ok: true, order: { id: 'order-1', paymentStatus: 'paid' } })),
    syncCustomerPayment: vi.fn(async () => ({ ok: true, order: { id: 'order-1' } })),
    queryCustomerOrders: vi.fn(async () => ({ ok: true, orders: [] })),
    getCustomerOrderDetail: vi.fn(async () => ({ ok: true, order: { id: 'order-1' } })),
    queryMerchantOrders: vi.fn(async () => ({ ok: true })),
    getMerchantOrderDetail: vi.fn(async () => ({ ok: true })),
    updateMerchantOrderStatus: vi.fn(async () => ({ ok: true })),
    ...overrides
  };
}

describe('customer order routes', () => {
  it('routes customer order creation and payment calls with session openid', async () => {
    const orderService = createOrderService();
    const app = buildApp({ config: testConfig, dependencies: { orderService } });

    await app.inject({ method: 'POST', url: '/api/v1/customer/orders', headers: authHeader('openid-1'), payload: { idempotencyKey: 'k1' } });
    await app.inject({ method: 'POST', url: '/api/v1/customer/orders/order-1/payment', headers: authHeader('openid-1'), payload: { method: 'wechat' } });
    await app.inject({ method: 'POST', url: '/api/v1/customer/orders/order-1/payment-sync', headers: authHeader('openid-1') });
    await app.inject({ method: 'POST', url: '/api/v1/customer/orders/order-1/payment-confirmation', headers: authHeader('openid-1'), payload: { transactionId: 't1' } });
    await app.inject({ method: 'GET', url: '/api/v1/customer/orders', headers: authHeader('openid-1') });
    await app.inject({ method: 'GET', url: '/api/v1/customer/orders/order-1', headers: authHeader('openid-1') });

    expect(orderService.createCustomerOrder).toHaveBeenCalledWith('openid-1', expect.any(Object));
    expect(orderService.startCustomerPayment).toHaveBeenCalledWith('openid-1', 'order-1', expect.any(Object));
    expect(orderService.syncCustomerPayment).toHaveBeenCalledWith('openid-1', 'order-1');
    expect(orderService.confirmCustomerPayment).toHaveBeenCalledWith('openid-1', 'order-1', expect.any(Object));
    expect(orderService.queryCustomerOrders).toHaveBeenCalledWith('openid-1', expect.any(Object));
    expect(orderService.getCustomerOrderDetail).toHaveBeenCalledWith('openid-1', 'order-1');
  });

  it('preserves insufficient balance business payloads', async () => {
    const app = buildApp({
      config: testConfig,
      dependencies: {
        orderService: createOrderService({
          startCustomerPayment: vi.fn(async () => ({ ok: false, code: 'INSUFFICIENT_BALANCE', paymentStatus: 'blocked' }))
        })
      }
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/customer/orders/order-1/payment',
      headers: authHeader('openid-1'),
      payload: { method: 'balance' }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ ok: false, code: 'INSUFFICIENT_BALANCE', paymentStatus: 'blocked' });
  });
});
