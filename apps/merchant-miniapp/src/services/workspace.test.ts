import { describe, expect, it } from 'vitest';

import { getMerchantWorkspaceCards } from './workspace';

describe('merchant workspace service', () => {
  it('returns the four locked management cards for the merchant workspace', () => {
    const cards = getMerchantWorkspaceCards();

    expect(cards.map((item) => item.title)).toEqual([
      '订单管理',
      '品类/商品管理',
      '用户管理',
      '运营配置'
    ]);
  });

  it('keeps category and product management as separate workspace actions', () => {
    const catalogCard = getMerchantWorkspaceCards().find((item) => item.id === 'catalog');

    expect(catalogCard?.actions).toEqual([
      expect.objectContaining({
        label: '品类管理',
        url: '/pages/categories/index'
      }),
      expect.objectContaining({
        label: '商品管理',
        url: '/pages/products/index'
      })
    ]);
  });

  it('returns cloned card data so callers cannot mutate the shared workspace model', () => {
    const first = getMerchantWorkspaceCards();
    first[0].title = '已篡改';

    expect(getMerchantWorkspaceCards()[0]?.title).toBe('订单管理');
  });
});
