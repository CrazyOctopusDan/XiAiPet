import { describe, expect, it } from 'vitest';

import {
  createMerchantAccountService,
  type MerchantAccountRecord,
  type MerchantAccountRepository
} from './service';

function createMemoryRepository(initial: MerchantAccountRecord[] = []): MerchantAccountRepository {
  const accounts = new Map<string, MerchantAccountRecord>();
  initial.forEach((account) => accounts.set(account.id, account));

  return {
    async countAccounts() {
      return accounts.size;
    },
    async createAccount(input) {
      const account: MerchantAccountRecord = {
        id: input.id ?? `acct-${accounts.size + 1}`,
        username: input.username,
        passwordHash: input.passwordHash,
        role: input.role,
        status: input.status,
        mustChangePassword: input.mustChangePassword,
        createdBy: input.createdBy ?? null,
        lastLoginAt: null,
        createdAt: new Date('2026-05-13T00:00:00.000Z'),
        updatedAt: new Date('2026-05-13T00:00:00.000Z')
      };
      accounts.set(account.id, account);
      return account;
    },
    async findByUsername(username) {
      return Array.from(accounts.values()).find((account) => account.username === username) ?? null;
    },
    async findById(id) {
      return accounts.get(id) ?? null;
    },
    async listAccounts() {
      return Array.from(accounts.values()).sort((left, right) => left.username.localeCompare(right.username));
    },
    async updateAccount(id, data) {
      const current = accounts.get(id);
      if (!current) {
        return null;
      }
      const next = {
        ...current,
        ...data,
        updatedAt: new Date('2026-05-13T01:00:00.000Z')
      };
      accounts.set(id, next);
      return next;
    }
  };
}

describe('merchant account service', () => {
  it('bootstraps the initial admin account only when no merchant accounts exist', async () => {
    const repository = createMemoryRepository();
    const service = createMerchantAccountService(repository);

    const first = await service.bootstrapInitialAdmin();
    const second = await service.bootstrapInitialAdmin();

    expect(first.operation).toBe('created');
    expect(first.account).toMatchObject({
      username: 'admin',
      role: 'admin',
      status: 'active',
      mustChangePassword: true
    });
    expect(second.operation).toBe('skipped');
    expect(await repository.countAccounts()).toBe(1);
  });

  it('logs in with admin/admin and requires a password change', async () => {
    const service = createMerchantAccountService(createMemoryRepository());
    await service.bootstrapInitialAdmin();

    const result = await service.login({ username: 'admin', password: 'admin' });

    expect(result.account).toMatchObject({
      username: 'admin',
      role: 'admin',
      mustChangePassword: true
    });
  });

  it('rejects wrong passwords and disabled accounts', async () => {
    const repository = createMemoryRepository();
    const service = createMerchantAccountService(repository);
    const bootstrap = await service.bootstrapInitialAdmin();

    await expect(service.login({ username: 'admin', password: 'wrong' })).rejects.toMatchObject({
      code: 'INVALID_MERCHANT_CREDENTIALS'
    });

    await repository.updateAccount(bootstrap.account.id, { status: 'disabled' });
    await expect(service.login({ username: 'admin', password: 'admin' })).rejects.toMatchObject({
      code: 'MERCHANT_ACCOUNT_DISABLED'
    });
  });

  it('changes the initial admin password and clears mustChangePassword', async () => {
    const service = createMerchantAccountService(createMemoryRepository());
    const bootstrap = await service.bootstrapInitialAdmin();

    const result = await service.changePassword(bootstrap.account.id, {
      currentPassword: 'admin',
      newPassword: 'new-admin-password'
    });

    expect(result.account.mustChangePassword).toBe(false);
    await expect(service.login({ username: 'admin', password: 'admin' })).rejects.toMatchObject({
      code: 'INVALID_MERCHANT_CREDENTIALS'
    });
    await expect(service.login({ username: 'admin', password: 'new-admin-password' })).resolves.toMatchObject({
      account: expect.objectContaining({ username: 'admin', mustChangePassword: false })
    });
  });

  it('lets admin create staff with default staff password, then disable and reset it', async () => {
    const service = createMerchantAccountService(createMemoryRepository());
    const bootstrap = await service.bootstrapInitialAdmin();

    const created = await service.createStaffAccount(bootstrap.account, { username: 'staff01' });
    expect(created.account).toMatchObject({
      username: 'staff01',
      role: 'staff',
      status: 'active',
      mustChangePassword: true,
      createdBy: bootstrap.account.id
    });
    await expect(service.login({ username: 'staff01', password: 'staff' })).resolves.toMatchObject({
      account: expect.objectContaining({ role: 'staff', mustChangePassword: true })
    });

    await service.disableStaffAccount(bootstrap.account, created.account.id);
    await expect(service.login({ username: 'staff01', password: 'staff' })).rejects.toMatchObject({
      code: 'MERCHANT_ACCOUNT_DISABLED'
    });

    await service.resetStaffPassword(bootstrap.account, created.account.id);
    await expect(service.login({ username: 'staff01', password: 'staff' })).resolves.toMatchObject({
      account: expect.objectContaining({ mustChangePassword: true })
    });
  });

  it('rejects staff attempts to manage other merchant accounts', async () => {
    const repository = createMemoryRepository();
    const service = createMerchantAccountService(repository);
    const bootstrap = await service.bootstrapInitialAdmin();
    const staff = await service.createStaffAccount(bootstrap.account, { username: 'staff01' });
    const staffRecord = await repository.findById(staff.account.id);

    await expect(service.createStaffAccount(staffRecord!, { username: 'staff02' })).rejects.toMatchObject({
      code: 'MERCHANT_ADMIN_REQUIRED'
    });
    await expect(service.disableStaffAccount(staffRecord!, bootstrap.account.id)).rejects.toMatchObject({
      code: 'MERCHANT_ADMIN_REQUIRED'
    });
  });
});
