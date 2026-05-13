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

function mapMerchantAccount(row: MerchantAccountRow): MerchantAccountRecord {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.passwordHash,
    role: row.role as MerchantAccountRole,
    status: row.status as MerchantAccountStatus,
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
          role: input.role,
          status: input.status,
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
        data
      });
      return account ? mapMerchantAccount(account) : null;
    }
  };
}
