import { describe, expect, it } from 'vitest';

import { formatMerchantAccountWorkspace } from './merchant-accounts';
import type { MerchantSessionAccount } from './api-client';

const baseAccount: MerchantSessionAccount = {
  id: 'account-1',
  username: 'admin',
  role: 'admin',
  status: 'active',
  mustChangePassword: false
};

function account(overrides: Partial<MerchantSessionAccount>): MerchantSessionAccount {
  return {
    ...baseAccount,
    ...overrides
  };
}

describe('merchant account workspace formatter', () => {
  it('builds summary counts for the staff account page', () => {
    const view = formatMerchantAccountWorkspace([
      account({ id: 'admin-1', username: 'admin', role: 'admin', mustChangePassword: false }),
      account({ id: 'staff-1', username: 'amy', role: 'staff', mustChangePassword: true }),
      account({ id: 'staff-2', username: 'disabled', role: 'staff', status: 'disabled', mustChangePassword: false })
    ]);

    expect(view.summary).toEqual({
      total: 3,
      staff: 2,
      needsPasswordChange: 1
    });
  });

  it('formats account rows with concise labels and initials', () => {
    const view = formatMerchantAccountWorkspace([
      account({ id: 'staff-1', username: 'amy', role: 'staff', status: 'active', mustChangePassword: true }),
      account({ id: 'admin-1', username: 'admin', role: 'admin', status: 'active', mustChangePassword: false })
    ]);

    expect(view.items).toEqual([
      expect.objectContaining({
        id: 'staff-1',
        username: 'amy',
        initial: 'A',
        roleLabel: '员工',
        statusLabel: '启用',
        passwordLabel: '需改密',
        statusTone: 'active',
        canManage: true
      }),
      expect.objectContaining({
        id: 'admin-1',
        username: 'admin',
        initial: 'A',
        roleLabel: '管理员',
        statusLabel: '启用',
        passwordLabel: '已改密',
        statusTone: 'active',
        canManage: false
      })
    ]);
  });

  it('marks disabled staff accounts as not manageable', () => {
    const view = formatMerchantAccountWorkspace([
      account({ id: 'staff-2', username: 'mia', role: 'staff', status: 'disabled', mustChangePassword: false })
    ]);

    expect(view.items[0]).toEqual(
      expect.objectContaining({
        statusLabel: '停用',
        statusTone: 'disabled',
        canManage: false
      })
    );
  });
});
