import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const pageDir = '/Users/zhangyi/zhangyi/homework/xiaipet/apps/merchant-miniapp/pages/products';

describe('product management page layout', () => {
  it('exposes product deletion through a left-swipe row action', async () => {
    const [template, styles, pageSource] = await Promise.all([
      readFile(`${pageDir}/index.wxml`, 'utf8'),
      readFile(`${pageDir}/index.wxss`, 'utf8'),
      readFile(`${pageDir}/index.ts`, 'utf8')
    ]);

    expect(template).toContain('class="product-swipe-row');
    expect(template).toContain('bindtouchstart="handleProductTouchStart"');
    expect(template).toContain('bindtouchend="handleProductTouchEnd"');
    expect(template).toContain('class="product-delete-action"');
    expect(template).toContain('catchtap="handleDeleteTap"');
    expect(template).toContain('class="product-load-more"');
    expect(template).toContain('bindtap="handleLoadMoreProducts"');
    expect(template).toContain('catchtap="handleMoveProductTap"');
    expect(template).toContain('data-direction="up"');
    expect(template).toContain('data-direction="down"');

    expect(styles).toContain('.product-swipe-row');
    expect(styles).toContain('.product-delete-action');
    expect(styles).toContain('.product-load-more');
    expect(styles).toContain('.product-move-actions');
    expect(styles).toContain('.product-move-button');
    expect(styles).toContain('transform: translateX(-');

    expect(pageSource).toContain('swipedProductId');
    expect(pageSource).toContain('handleProductTouchStart');
    expect(pageSource).toContain('handleProductTouchEnd');
    expect(pageSource).toContain('handleDeleteTap');
    expect(pageSource).toContain('handleLoadMoreProducts');
    expect(pageSource).toContain('handleMoveProductTap');
    expect(pageSource).toContain('isReordering: false');
  });
});
