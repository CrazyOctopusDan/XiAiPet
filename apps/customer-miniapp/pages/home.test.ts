import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

describe('home page', () => {
  it('uses full-card actions without inner buttons and centers modal dialogs', async () => {
    const template = await readFile('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/home/index.wxml', 'utf8');
    const styles = await readFile('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/home/index.wxss', 'utf8');

    expect(template).toContain('class="secondary-module-title"');
    expect(template).toContain('class="primary-module-title"');
    expect(template).toContain('{{item.title}}');
    expect(template).toContain('src="{{heroBannerSrc}}"');
    expect(template).not.toContain('module-card-action');
    expect(template).not.toContain("item.id !== 'consulting'");
    expect(styles).toContain('align-items: center');
    expect(styles).not.toContain('.module-card-action');
    expect(styles).not.toContain('align-items: flex-end');
  });

  it('lays out a white home page with a banner, three small cards, and a large browse card', async () => {
    const template = await readFile('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/home/index.wxml', 'utf8');
    const styles = await readFile('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/home/index.wxss', 'utf8');
    const script = await readFile('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/home/index.ts', 'utf8');

    expect(script).toContain('primaryModule');
    expect(script).toContain('secondaryModules');
    expect(template).toContain('class="secondary-module-grid"');
    expect(template).toContain('wx:for="{{secondaryModules}}"');
    expect(template).toContain('class="primary-module-card"');
    expect(template).toContain('primaryModule.title');
    expect(styles).toContain('background: #FFFFFF;');
    expect(styles).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))');
    expect(styles).toContain('min-height: 300rpx');
  });
});
