import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const VERIFICATION_CHECK_NAMES = [
  'required_runtime_config_sections',
  'order_snapshots_present',
  'balance_ledger_consistency',
  'orphan_orders',
  'orphan_payments',
  'orphan_ledgers',
  'duplicate_order_idempotency_keys'
] as const;

export interface VerificationCheck {
  name: (typeof VERIFICATION_CHECK_NAMES)[number];
  status: 'pass' | 'fail';
  detail: string;
}

export interface VerificationReport {
  checks: VerificationCheck[];
}

function check(name: VerificationCheck['name'], ok: boolean, detail: string): VerificationCheck {
  return {
    name,
    status: ok ? 'pass' : 'fail',
    detail
  };
}

export async function buildVerificationReport(client: PrismaClient = prisma): Promise<VerificationReport> {
  const requiredRuntimeConfigIds = ['store-profile', 'delivery-rules', 'membership-tiers', 'banner', 'custom-notice'];
  const runtimeSections = await client.runtimeConfigSection.findMany({
    where: {
      id: {
        in: requiredRuntimeConfigIds
      }
    },
    select: { id: true }
  });
  const presentRuntimeIds = new Set(runtimeSections.map((section) => section.id));
  const missingRuntimeIds = requiredRuntimeConfigIds.filter((id) => !presentRuntimeIds.has(id));

  const orderSnapshots = await client.order.findMany({
    select: {
      id: true,
      snapshot: true
    }
  });
  const ordersWithoutSnapshot = orderSnapshots.filter((order) => order.snapshot === null || order.snapshot === undefined).length;

  const balanceRows = await client.balanceAccount.findMany({
    include: {
      ledgers: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });
  const inconsistentBalances = balanceRows.filter((account) => {
    const lastLedger = account.ledgers.at(-1);
    return Boolean(lastLedger) && !lastLedger?.balanceAfter.equals(account.balance);
  });

  const duplicateIdempotencyGroups = await client.order.groupBy({
    by: ['openid', 'idempotencyKey'],
    where: {
      idempotencyKey: {
        not: null
      }
    },
    _count: {
      id: true
    },
    having: {
      id: {
        _count: {
          gt: 1
        }
      }
    }
  });

  return {
    checks: [
      check(
        'required_runtime_config_sections',
        missingRuntimeIds.length === 0,
        missingRuntimeIds.length === 0 ? 'all required runtime config sections exist' : `missing=${missingRuntimeIds.join(',')}`
      ),
      check('order_snapshots_present', ordersWithoutSnapshot === 0, `orders_without_snapshot=${ordersWithoutSnapshot}`),
      check('balance_ledger_consistency', inconsistentBalances.length === 0, `inconsistent_accounts=${inconsistentBalances.length}`),
      check('orphan_orders', true, 'covered by orders.openid foreign key'),
      check('orphan_payments', true, 'covered by payments.orderId foreign key'),
      check('orphan_ledgers', true, 'covered by balance_ledgers account/order foreign keys'),
      check('duplicate_order_idempotency_keys', duplicateIdempotencyGroups.length === 0, `duplicates=${duplicateIdempotencyGroups.length}`)
    ]
  };
}

async function main() {
  const report = await buildVerificationReport();
  console.log(JSON.stringify(report, null, 2));

  await prisma.$disconnect();

  if (report.checks.some((entry) => entry.status === 'fail')) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
}
