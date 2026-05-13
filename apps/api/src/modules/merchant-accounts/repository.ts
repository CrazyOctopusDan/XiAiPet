import { getPrismaClient } from '../../db/prisma';
import type { DbClient } from '../../db/types';
import type {
  MerchantAccountRecord,
  MerchantAccountRepository,
  MerchantAccountRole,
  MerchantAccountStatus
} from './service';

interface MerchantAccountRow {
  id: string;
  username: string;
  passwordHash: string;
  role: string;
  status: string;
  mustChangePassword: boolean;
  createdBy: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

type PrismaMerchantAccountRole = 'ADMIN' | 'STAFF';
type PrismaMerchantAccountStatus = 'ACTIVE' | 'DISABLED';

const prismaRoleByPublicRole: Record<MerchantAccountRole, PrismaMerchantAccountRole> = {
  admin: 'ADMIN',
  staff: 'STAFF'
};

const publicRoleByPrismaRole: Record<string, MerchantAccountRole> = {
  ADMIN: 'admin',
  STAFF: 'staff',
  admin: 'admin',
  staff: 'staff'
};

const prismaStatusByPublicStatus: Record<MerchantAccountStatus, PrismaMerchantAccountStatus> = {
  active: 'ACTIVE',
  disabled: 'DISABLED'
};

const publicStatusByPrismaStatus: Record<string, MerchantAccountStatus> = {
  ACTIVE: 'active',
  DISABLED: 'disabled',
  active: 'active',
  disabled: 'disabled'
};

function toPrismaRole(role: MerchantAccountRole): PrismaMerchantAccountRole {
  return prismaRoleByPublicRole[role];
}

function fromPrismaRole(role: string): MerchantAccountRole {
  const mapped = publicRoleByPrismaRole[role];
  if (!mapped) {
    throw new Error(`Unknown merchant account role: ${role}`);
  }
  return mapped;
}

function toPrismaStatus(status: MerchantAccountStatus): PrismaMerchantAccountStatus {
  return prismaStatusByPublicStatus[status];
}

function fromPrismaStatus(status: string): MerchantAccountStatus {
  const mapped = publicStatusByPrismaStatus[status];
  if (!mapped) {
    throw new Error(`Unknown merchant account status: ${status}`);
  }
  return mapped;
}

function mapMerchantAccountUpdateData(data: Partial<Pick<
  MerchantAccountRecord,
  'passwordHash' | 'status' | 'mustChangePassword' | 'lastLoginAt'
>>): Record<string, unknown> {
  const mapped: Record<string, unknown> = { ...data };
  if (data.status) {
    mapped.status = toPrismaStatus(data.status);
  }
  return mapped;
}

function mapMerchantAccount(row: MerchantAccountRow): MerchantAccountRecord {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.passwordHash,
    role: fromPrismaRole(row.role),
    status: fromPrismaStatus(row.status),
    mustChangePassword: row.mustChangePassword,
    createdBy: row.createdBy,
    lastLoginAt: row.lastLoginAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function merchantAccountClient(client: DbClient) {
  return (client as unknown as { merchantAccount: any }).merchantAccount;
}

export function createMerchantAccountRepository(client: DbClient = getPrismaClient()): MerchantAccountRepository {
  const merchantAccount = merchantAccountClient(client);

  return {
    async countAccounts() {
      return merchantAccount.count();
    },

    async createAccount(input) {
      const account = await merchantAccount.create({
        data: {
          username: input.username,
          passwordHash: input.passwordHash,
          role: toPrismaRole(input.role),
          status: toPrismaStatus(input.status),
          mustChangePassword: input.mustChangePassword,
          createdBy: input.createdBy ?? null
        }
      });
      return mapMerchantAccount(account);
    },

    async findByUsername(username) {
      const account = await merchantAccount.findUnique({ where: { username } });
      return account ? mapMerchantAccount(account) : null;
    },

    async findById(id) {
      const account = await merchantAccount.findUnique({ where: { id } });
      return account ? mapMerchantAccount(account) : null;
    },

    async listAccounts() {
      const accounts = await merchantAccount.findMany({
        orderBy: [{ role: 'asc' }, { username: 'asc' }]
      });
      return accounts.map(mapMerchantAccount);
    },

    async updateAccount(id, data) {
      const account = await merchantAccount.update({
        where: { id },
        data: mapMerchantAccountUpdateData(data)
      });
      return account ? mapMerchantAccount(account) : null;
    }
  };
}
