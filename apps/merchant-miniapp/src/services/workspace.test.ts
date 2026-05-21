import { describe, expect, it } from 'vitest';

import { getMerchantWorkspaceCards } from './workspace';

describe('merchant workspace service', () => {
  it('returns compact admin cards with primary destinations for the merchant workspace', () => {
    const cards = getMerchantWorkspaceCards();

    expect(cards.map((item) => [item.id, item.title, item.badge, item.primaryUrl])).toEqual([
      ['orders', '订单', '履约', '/pages/orders/index'],
      ['order-history', '历史', '归档', '/pages/orders/index?scope=history'],
      ['staff-accounts', '员工', '管理员', '/pages/staff-accounts/index'],
      ['catalog', '商品', '双入口', '/pages/categories/index'],
      ['users', '用户', '审计', '/pages/users/index'],
      ['runtime-config', '配置', '店务', '/pages/runtime-config/index']
    ]);
  });

  it('limits staff workspace cards to order and catalog work', () => {
    const cards = getMerchantWorkspaceCards('staff');

    expect(cards.map((item) => item.title)).toEqual([
      '订单',
      '历史',
      '商品'
    ]);
  });

  it('keeps category and product management as separate workspace actions', () => {
    const catalogCard = getMerchantWorkspaceCards().find((item) => item.id === 'catalog');

    expect(catalogCard?.primaryUrl).toBe('/pages/categories/index');
    expect(catalogCard?.actions).toEqual([
      expect.objectContaining({
        label: '品类管理',
        url: '/pages/categories/index'
      }),
      expect.objectContaining({
        label: '商品',
        url: '/pages/products/index'
      })
    ]);
  });

  it('keeps workspace card copy short for the warm operations dashboard', () => {
    const cards = getMerchantWorkspaceCards();

    for (const card of cards) {
      expect(card.title.length).toBeLessThanOrEqual(4);
      expect(card.subtitle.length).toBeLessThanOrEqual(10);
      expect(card.description.length).toBeLessThanOrEqual(18);
    }
  });

  it('returns cloned card data so callers cannot mutate the shared workspace model', () => {
    const first = getMerchantWorkspaceCards();
    first[0].title = '已篡改';

    expect(getMerchantWorkspaceCards()[0]?.title).toBe('订单');
  });
});
