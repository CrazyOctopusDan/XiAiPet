import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const accessGateSource = readFileSync(resolve(__dirname, '../../pages/access-gate/index.ts'), 'utf8');

describe('merchant access gate copy', () => {
  it('uses the approved neutral and loading status copy', () => {
    expect(accessGateSource).toContain("statusText: '首次登录后需要修改密码'");
    expect(accessGateSource).toContain("statusText: '正在登录', submitting: true");
    expect(accessGateSource).not.toContain('请输入商户账号和密码');
    expect(accessGateSource).not.toContain('正在登录商户账号');
  });
});
