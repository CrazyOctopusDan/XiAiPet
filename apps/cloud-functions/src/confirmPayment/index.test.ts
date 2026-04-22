import { describe, expect, it } from 'vitest';

import { main } from './index';

describe('confirmPayment cloud function', () => {
  it('marks the order as paid and returns stock adjustments after successful payment', async () => {
    const result = await main({
      order: {
        id: 'order-001',
        status: 'pending_payment',
        pricing: {
          itemsSubtotal: 116,
          deliveryFee: 12,
          payableTotal: 128
        },
        snapshot: {
          fulfillment: {
            mode: 'delivery',
            store: {
              name: '虾衣宠物烘焙工作室',
              address: '上海市静安区南京西路 1266 号 8 楼'
            }
          },
          items: [
            {
              productId: 'ocean-party',
              name: '海洋派对蛋糕',
              quantity: 2,
              unitPrice: 58,
              lineTotal: 116,
              specId: 'party-6inch',
              specLabel: '6 寸'
            }
          ],
          pets: [],
          remark: '少糖'
        }
      },
      paymentMethod: 'balance',
      paymentStatus: 'paid'
    });

    expect(result).toMatchObject({
      ok: true,
      order: {
        id: 'order-001',
        status: 'paid'
      },
      inventoryAdjustments: [
        {
          productId: 'ocean-party',
          quantityDelta: -2
        }
      ],
      balanceAdjustment: {
        amount: -128
      }
    });
  });
});
