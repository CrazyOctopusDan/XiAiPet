import { ApiError } from '../../lib/errors';
import { hashMerchantPassword, verifyMerchantPassword } from './password';
import { createMerchantAccountRepository } from './repository';

export type MerchantAccountRole = 'admin' | 'staff';
export type MerchantAccountStatus = 'active' | 'disabled';

export interface MerchantAccountRecord {
  id: string;
  username: string;
  passwordHash: string;
  role: MerchantAccountRole;
  status: MerchantAccountStatus;
  mustChangePassword: boolean;
  createdBy: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MerchantAccountPublic {
  id: string;
  username: string;
  role: MerchantAccountRole;
  status: MerchantAccountStatus;
  mustChangePassword: boolean;
  createdBy: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MerchantAccountRepository {
  countAccounts(): Promise<number>;
  createAccount(input: {
    id?: string;
    username: string;
    passwordHash: string;
    role: MerchantAccountRole;
    status: MerchantAccountStatus;
    mustChangePassword: boolean;
    createdBy?: string | null;
  }): Promise<MerchantAccountRecord>;
  findByUsername(username: string): Promise<MerchantAccountRecord | null>;
  findById(id: string): Promise<MerchantAccountRecord | null>;
  listAccounts(): Promise<MerchantAccountRecord[]>;
  updateAccount(id: string, data: Partial<Pick<
    MerchantAccountRecord,
    'passwordHash' | 'status' | 'mustChangePassword' | 'lastLoginAt'
  >>): Promise<MerchantAccountRecord | null>;
}

interface LoginInput {
  username?: string;
  password?: string;
}

interface PasswordChangeInput {
  currentPassword?: string;
  newPassword?: string;
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function toMerchantAccountPublic(account: MerchantAccountRecord): MerchantAccountPublic {
  return {
    id: account.id,
    username: account.username,
    role: account.role,
    status: account.status,
    mustChangePassword: account.mustChangePassword,
    createdBy: account.createdBy,
    lastLoginAt: account.lastLoginAt?.toISOString() ?? null,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString()
  };
}

function assertAdmin(actor: MerchantAccountRecord) {
  if (actor.role !== 'admin' || actor.status !== 'active') {
    throw new ApiError('MERCHANT_ADMIN_REQUIRED', 'Admin merchant account required', 403);
  }
}

function assertPasswordInput(password: string | undefined, code: string, message: string) {
  if (!password || password.length < 4) {
    throw new ApiError(code, message, 400);
  }
}

export function createMerchantAccountService(repository: MerchantAccountRepository = createMerchantAccountRepository()) {
  return {
    async bootstrapInitialAdmin() {
      if (await repository.countAccounts()) {
        return {
          ok: true as const,
          operation: 'skipped' as const,
          account: null
        };
      }

      const account = await repository.createAccount({
        username: 'admin',
        passwordHash: await hashMerchantPassword('admin'),
        role: 'admin',
        status: 'active',
        mustChangePassword: true,
        createdBy: null
      });

      return {
        ok: true as const,
        operation: 'created' as const,
        account
      };
    },

    async login(input: LoginInput) {
      const username = normalizeUsername(input.username ?? '');
      if (!username || !input.password) {
        throw new ApiError('INVALID_MERCHANT_CREDENTIALS', '账号或密码错误', 401);
      }

      await this.bootstrapInitialAdmin();
      const account = await repository.findByUsername(username);
      if (!account || !(await verifyMerchantPassword(input.password, account.passwordHash))) {
        throw new ApiError('INVALID_MERCHANT_CREDENTIALS', '账号或密码错误', 401);
      }

      if (account.status !== 'active') {
        throw new ApiError('MERCHANT_ACCOUNT_DISABLED', '账号已停用，请联系管理员', 403);
      }

      const updated = await repository.updateAccount(account.id, { lastLoginAt: new Date() });
      return {
        ok: true as const,
        account: updated ?? account
      };
    },

    async getActiveAccount(accountId: string) {
      const account = await repository.findById(accountId);
      if (!account) {
        throw new ApiError('UNAUTHORIZED', 'Invalid merchant account session', 401);
      }
      if (account.status !== 'active') {
        throw new ApiError('MERCHANT_ACCOUNT_DISABLED', '账号已停用，请联系管理员', 403);
      }
      return account;
    },

    async changePassword(accountId: string, input: PasswordChangeInput) {
      assertPasswordInput(input.currentPassword, 'INVALID_CURRENT_PASSWORD', '请输入当前密码');
      assertPasswordInput(input.newPassword, 'INVALID_NEW_PASSWORD', '新密码至少 4 位');

      const account = await this.getActiveAccount(accountId);
      if (!(await verifyMerchantPassword(input.currentPassword ?? '', account.passwordHash))) {
        throw new ApiError('INVALID_CURRENT_PASSWORD', '当前密码错误', 400);
      }

      const updated = await repository.updateAccount(account.id, {
        passwordHash: await hashMerchantPassword(input.newPassword ?? ''),
        mustChangePassword: false
      });

      return {
        ok: true as const,
        account: updated ?? account
      };
    },

    async listAccounts(actor: MerchantAccountRecord) {
      assertAdmin(actor);
      return {
        ok: true as const,
        accounts: (await repository.listAccounts()).map(toMerchantAccountPublic)
      };
    },

    async createStaffAccount(actor: MerchantAccountRecord, input: { username?: string }) {
      assertAdmin(actor);
      const username = normalizeUsername(input.username ?? '');
      if (!username) {
        throw new ApiError('INVALID_MERCHANT_USERNAME', '请输入员工账号', 400);
      }
      if (await repository.findByUsername(username)) {
        throw new ApiError('MERCHANT_USERNAME_EXISTS', '员工账号已存在', 409);
      }

      const account = await repository.createAccount({
        username,
        passwordHash: await hashMerchantPassword('staff'),
        role: 'staff',
        status: 'active',
        mustChangePassword: true,
        createdBy: actor.id
      });

      return {
        ok: true as const,
        account: toMerchantAccountPublic(account),
        initialPassword: 'staff'
      };
    },

    async disableStaffAccount(actor: MerchantAccountRecord, accountId: string) {
      assertAdmin(actor);
      const account = await repository.findById(accountId);
      if (!account || account.role !== 'staff') {
        throw new ApiError('MERCHANT_STAFF_NOT_FOUND', '员工账号不存在', 404);
      }
      const updated = await repository.updateAccount(account.id, { status: 'disabled' });
      return {
        ok: true as const,
        account: toMerchantAccountPublic(updated ?? account)
      };
    },

    async resetStaffPassword(actor: MerchantAccountRecord, accountId: string) {
      assertAdmin(actor);
      const account = await repository.findById(accountId);
      if (!account || account.role !== 'staff') {
        throw new ApiError('MERCHANT_STAFF_NOT_FOUND', '员工账号不存在', 404);
      }
      const updated = await repository.updateAccount(account.id, {
        passwordHash: await hashMerchantPassword('staff'),
        status: 'active',
        mustChangePassword: true
      });
      return {
        ok: true as const,
        account: toMerchantAccountPublic(updated ?? account),
        resetPassword: 'staff'
      };
    }
  };
}
