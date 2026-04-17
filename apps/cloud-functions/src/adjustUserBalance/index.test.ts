import { describe, expect, it, vi } from 'vitest';

import { main } from './index';

process.env.CLOUDBASE_ENV_NAME = 'dev';

const merchantUser = {
  openid: 'merchant-openid',
  merchantId: 'merchant-001',
  storeName: '虾衣宠物烘焙工作室',
  enabled: true,
  grantedAt: '2026-04-01T00:00:00.000Z'
};

function createPayload() {
  return {
    userOpenid: 'user-openid',
    action: 'set' as const,
    reasonType: '人工纠错' as const,
    note: '修正重复到账金额',
    operator: {
      openid: 'merchant-openid',
      name: '店主小虾'
    },
    operatedAt: '2026-04-17T12:00:00.000Z',
    beforeBalance: 120,
    delta: -20,
    targetBalance: 100,
    afterBalance: 100,
    requiresConfirmation: true as const
  };
}

describe('adjustUserBalance cloud function', () => {
  it('writes account and ledger changes atomically with customer-safe normalizedTitle and shortNote', async () => {
    const applyMerchantBalanceAdjustment = vi.fn(async () => ({
      balanceAfter: 100,
      ledger: {
        normalizedTitle: '余额纠错',
        shortNote: '余额调整至 ￥100.00'
      }
    }));

    const result = await main(
      {
        payload: createPayload(),
        merchantUser
      },
      { OPENID: 'merchant-openid' },
      {
        applyMerchantBalanceAdjustment
      }
    );

    expect(result).toMatchObject({
      balanceAfter: 100,
      ledger: {
        normalizedTitle: '余额纠错',
        shortNote: '余额调整至 ￥100.00'
      }
    });
    expect(applyMerchantBalanceAdjustment).toHaveBeenCalledWith(createPayload());
  });

  it('rejects negative outcomes', async () => {
    await expect(
      main(
        {
          payload: {
            ...createPayload(),
            action: 'deduct',
            delta: -200,
            targetBalance: -80,
            afterBalance: -80
          },
          merchantUser
        },
        { OPENID: 'merchant-openid' },
        {
          applyMerchantBalanceAdjustment: async () => ({
            error: 'NEGATIVE_BALANCE' as const
          })
        }
      )
    ).rejects.toThrow('INVALID_BALANCE_ADJUSTMENT');
  });
});
