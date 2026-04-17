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

describe('upsertCategory cloud function', () => {
  it('persists both category name and icon token', async () => {
    const saveCategory = vi.fn(async (category) => category);
    const category = {
      id: 'cakes',
      name: '生日蛋糕',
      iconToken: '🎂',
      createdAt: '2026-04-17T10:00:00.000Z',
      updatedAt: '2026-04-17T10:00:00.000Z'
    };

    const result = await main(
      {
        action: 'create',
        category,
        merchantUser
      },
      { OPENID: 'merchant-openid' },
      {
        saveCategory,
        deleteCategory: async () => undefined,
        countProductsByCategory: async () => 0
      }
    );

    expect(result.category).toEqual(category);
    expect(saveCategory).toHaveBeenCalledWith(category);
  });

  it('rejects category deletion while products still reference the category', async () => {
    await expect(
      main(
        {
          action: 'delete',
          categoryId: 'cakes',
          merchantUser
        },
        { OPENID: 'merchant-openid' },
        {
          saveCategory: async (category) => category,
          deleteCategory: async () => undefined,
          countProductsByCategory: async () => 3
        }
      )
    ).rejects.toThrow('CATEGORY_HAS_LINKED_PRODUCTS:3');
  });
});
