import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

describe('customer profile page', () => {
  it('uses the API-resolved member level instead of recalculating tier from spending', () => {
    const script = readFileSync('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/profile/index.ts', 'utf8');

    expect(script).toContain('findMembershipTierCardByRecharge(cards, summary.totalRecharge)');
    expect(script).not.toContain('findMembershipTierCardBySpent');
    expect(script).not.toContain('summary.totalSpent)');
  });

  it('shows cumulative recharge instead of cumulative spending on the membership card', () => {
    const template = readFileSync('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/profile/index.wxml', 'utf8');

    expect(template).toContain('累计充值 ￥{{summary.totalRecharge}}');
    expect(template).not.toContain('累计消费 ￥{{summary.totalSpent}}');
  });
});
