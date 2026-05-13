import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const accessGateSource = readFileSync(resolve(__dirname, '../../pages/access-gate/index.ts'), 'utf8');
const accessGateWxml = readFileSync(resolve(__dirname, '../../pages/access-gate/index.wxml'), 'utf8');

describe('merchant access gate copy', () => {
  it('uses the approved neutral and loading status copy', () => {
    expect(accessGateSource).toContain("statusText: '首次登录后需要修改密码'");
    expect(accessGateSource).toContain("statusText: '正在登录', submitting: true");
    expect(accessGateSource).not.toContain('请输入商户账号和密码');
    expect(accessGateSource).not.toContain('正在登录商户账号');
  });

  it('uses the approved C2 login WXML copy without visible default credentials', () => {
    expect(accessGateWxml).toContain('brand-mark-main">喜');
    expect(accessGateWxml).toContain('brand-mark-sub">PET');
    expect(accessGateWxml).toContain('XiAiPet 商户端');
    expect(accessGateWxml).toContain('把订单和店务整理好');
    expect(accessGateWxml).toContain('登录工作台');
    expect(accessGateWxml).toContain('账号密码登录');
    expect(accessGateWxml).toContain('店员 / 管理员');
    expect(accessGateWxml).toContain('请输入账号');
    expect(accessGateWxml).toContain('请输入密码');
    expect(accessGateWxml).toContain('status-strip {{accessResult}}');
    expect(accessGateWxml).toContain('primary-cta');
    expect(accessGateWxml).not.toMatch(/admin|初始管理员|初始密码/);
  });
});
