import { describe, expect, it } from 'vitest';

import { createMerchantAccountRepository } from './repository';
import type { MerchantAccountRecord } from './service';

function merchantAccountRow(overrides: Partial<MerchantAccountRecord> & { role?: string; status?: string }) {
  const now = new Date('2026-05-13T00:00:00.000Z');

  return {
    id: 'acct-admin',
    username: 'admin',
    passwordHash: 'hashed-password',
    role: 'ADMIN',
    status: 'ACTIVE',
    mustChangePassword: true,
    createdBy: null,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

describe('merchant account repository', () => {
  it('maps public role and status values to Prisma enum values on create', async () => {
    let createdData: Record<string, unknown> | null = null;
    const repository = createMerchantAccountRepository({
      merchantAccount: {
        async create({ data }: { data: Record<string, unknown> }) {
          createdData = data;
          return merchantAccountRow({
            username: data.username as string,
            passwordHash: data.passwordHash as string,
            role: 'ADMIN',
            status: 'ACTIVE',
            mustChangePassword: data.mustChangePassword as boolean,
            createdBy: data.createdBy as string | null
          });
        }
      }
    } as never);

    const account = await repository.createAccount({
      username: 'admin',
      passwordHash: 'hashed-password',
      role: 'admin',
      status: 'active',
      mustChangePassword: true,
      createdBy: null
    });

    expect(createdData).toMatchObject({
      role: 'ADMIN',
      status: 'ACTIVE'
    });
    expect(account).toMatchObject({
      role: 'admin',
      status: 'active'
    });
  });

  it('maps public status values to Prisma enum values on update', async () => {
    let updatedData: Record<string, unknown> | null = null;
    const repository = createMerchantAccountRepository({
      merchantAccount: {
        async update({ data }: { data: Record<string, unknown> }) {
          updatedData = data;
          return merchantAccountRow({
            status: 'DISABLED',
            mustChangePassword: false
          });
        }
      }
    } as never);

    const account = await repository.updateAccount('acct-admin', { status: 'disabled' });

    expect(updatedData).toMatchObject({
      status: 'DISABLED'
    });
    expect(account).toMatchObject({
      role: 'admin',
      status: 'disabled'
    });
  });
});
