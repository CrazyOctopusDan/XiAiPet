import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

describe('membership page', () => {
  it('is reachable from the home vip card and registered in the miniapp', async () => {
    const appConfig = await readFile('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/app.json', 'utf8');
    const homeScript = await readFile('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/home/index.ts', 'utf8');

    expect(appConfig).toContain('pages/membership/index');
    expect(homeScript).toContain("moduleId === 'vip'");
    expect(homeScript).toContain('/pages/membership/index');
  });

  it('renders merchant configured membership tiers as swipeable cards', async () => {
    const template = await readFile('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/membership/index.wxml', 'utf8');
    const styles = await readFile('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/membership/index.wxss', 'utf8');
    const script = await readFile('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/membership/index.ts', 'utf8');

    expect(script).toContain('getCachedCustomerRuntimeConfig().membershipTiers');
    expect(template).toContain('<swiper');
    expect(template).toContain('wx:for="{{tiers}}"');
    expect(template).toContain('{{item.name}}');
    expect(template).toContain('{{item.thresholdLabel}}');
    expect(template).toContain('{{item.description}}');
    expect(template).toContain('style="{{item.cardStyle}}"');
    expect(template).toContain('class="tier-card-glow"');
    expect(styles).toContain('background: var(--member-card-bg)');
    expect(styles).toContain('color: var(--member-card-text)');
    expect(styles).toContain('.tier-swiper');
    expect(styles).toContain('border: 1rpx solid var(--member-card-border)');
    expect(styles).toContain('box-shadow: var(--member-card-shadow)');
    expect(styles).not.toContain('border: 4rpx solid #1D1A17');
    expect(styles).not.toContain('box-shadow: 0 8rpx 0 #1D1A17');
  });
});
