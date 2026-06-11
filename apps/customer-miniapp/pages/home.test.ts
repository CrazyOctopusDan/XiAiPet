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
    expect(styles).toContain('.home-modal-close');
    expect(styles).toContain('justify-content: center');
    expect(styles).not.toContain('.module-card-action');
    expect(styles).not.toContain('align-items: flex-end');
  });

  it('matches the banner palette with a yellow page wash, blue small cards, and yellow browse card', async () => {
    const template = await readFile('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/home/index.wxml', 'utf8');
    const styles = await readFile('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/home/index.wxss', 'utf8');
    const script = await readFile('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/home/index.ts', 'utf8');

    expect(script).toContain('primaryModule');
    expect(script).toContain('secondaryModules');
    expect(template).toContain('class="secondary-module-grid"');
    expect(template).toContain('wx:for="{{secondaryModules}}"');
    expect(template).toContain('class="primary-module-card"');
    expect(template).toContain('primaryModule.title');
    expect(styles).toContain('linear-gradient(180deg, #FBF1B6 0%, #FFFFFF 72%)');
    expect(styles).toContain('background: linear-gradient(180deg, #FBF1B6 0%, #FFFFFF 78%);');
    expect(styles).toContain('background: #C0E8F0;');
    expect(styles).toContain('border-color: #B8E0F0;');
    expect(styles).toContain('.secondary-module-card--notice,');
    expect(styles).toContain('background: #FBF1B6;');
    expect(styles).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))');
    expect(styles).toContain('min-height: 300rpx');
  });

  it('starts on the home page without the legacy launch identity gate and only displays consultation fields', async () => {
    const appConfig = await readFile('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/app.json', 'utf8');
    const template = await readFile('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/home/index.wxml', 'utf8');
    const script = await readFile('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/home/index.ts', 'utf8');
    const pages = JSON.parse(appConfig).pages;

    expect(pages[0]).toBe('pages/home/index');
    expect(pages).not.toContain('pages/launch/index');
    expect(template).toContain('{{storeContact.wechatId || \'暂未配置\'}}');
    expect(template).toContain('{{storeContact.ownerPhone || \'暂未配置\'}}');
    expect(template).not.toContain('copy-button');
    expect(template).not.toContain('handleCopyContact');
    expect(script).not.toContain('wx.setClipboardData');
    expect(script).not.toContain('ensurePrivacyAuthorized');
    expect(script).not.toContain('handleCopyContact');
    expect(script).not.toContain('复制权限未开通');
    expect(script).not.toContain('复制失败，请长按号码');
    expect(script).not.toContain('xiaipet-bakery');
    expect(script).not.toContain('定制蛋糕请先联系店主沟通细节');
  });

  it('uses non-native modal actions to avoid mini program button wrapper errors', async () => {
    const template = await readFile('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/home/index.wxml', 'utf8');
    const styles = await readFile('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/home/index.wxss', 'utf8');

    expect(template).toContain('<view class="notice-modal-button" bindtap="handleCloseNoticeModal">我知道了</view>');
    expect(template).not.toContain('<button');
    expect(styles).not.toContain('.copy-button');
    expect(styles).not.toContain('::after');
  });
});
