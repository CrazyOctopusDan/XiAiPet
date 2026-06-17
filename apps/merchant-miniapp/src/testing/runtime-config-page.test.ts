import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

describe('merchant runtime config page', () => {
  it('does not let the purchase notice textarea fall back to the WeChat 140 character limit', async () => {
    const template = await readFile('/Users/zhangyi/zhangyi/homework/xiaipet/apps/merchant-miniapp/pages/runtime-config/index.wxml', 'utf8');

    expect(template).toContain('wx:if="{{item.sectionId === \'custom-notice\'}}"');
    expect(template).toContain('placeholder="购前须知内容"');
    expect(template).toContain('maxlength="-1"');
  });
});
