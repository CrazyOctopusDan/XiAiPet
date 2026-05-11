import { PrismaClient } from '@prisma/client';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

import { importCloudBaseExport } from '../src/modules/migration/cloudbase-importer';

export const CLOUD_BASE_COLLECTION_FILES = [
  'users.json',
  'merchant_users.json',
  'categories.json',
  'products.json',
  'runtime_configs.json',
  'orders.json',
  'balance_accounts.json',
  'balance_ledgers.json',
  'receipt_print_audits.json'
] as const;

function printHelp() {
  console.log('Usage: pnpm --filter @xiaipet/api db:import:cloudbase -- --input <dir>');
}

function parseInputDir(argv: string[]): string | undefined {
  if (argv.includes('--help') || argv.includes('-h')) {
    printHelp();
    return undefined;
  }

  const inputIndex = argv.indexOf('--input');
  return inputIndex >= 0 ? argv[inputIndex + 1] : undefined;
}

async function readOptionalJsonArray(inputDir: string, filename: string): Promise<Record<string, unknown>[]> {
  const filePath = path.join(inputDir, filename);
  try {
    await access(filePath);
  } catch (error) {
    return [];
  }

  const parsed = JSON.parse(await readFile(filePath, 'utf8'));
  return Array.isArray(parsed) ? (parsed as Record<string, unknown>[]) : [];
}

export async function loadCloudBaseExportDirectory(inputDir: string) {
  return {
    users: await readOptionalJsonArray(inputDir, 'users.json'),
    merchantUsers: await readOptionalJsonArray(inputDir, 'merchant_users.json'),
    categories: await readOptionalJsonArray(inputDir, 'categories.json'),
    products: await readOptionalJsonArray(inputDir, 'products.json'),
    runtimeConfigs: await readOptionalJsonArray(inputDir, 'runtime_configs.json'),
    orders: await readOptionalJsonArray(inputDir, 'orders.json'),
    balanceAccounts: await readOptionalJsonArray(inputDir, 'balance_accounts.json'),
    balanceLedgers: await readOptionalJsonArray(inputDir, 'balance_ledgers.json'),
    receiptPrintAudits: await readOptionalJsonArray(inputDir, 'receipt_print_audits.json')
  };
}

async function main() {
  const inputDir = parseInputDir(process.argv.slice(2));
  if (!inputDir) {
    if (!process.argv.includes('--help') && !process.argv.includes('-h')) {
      throw new Error('Usage: pnpm --filter @xiaipet/api db:import:cloudbase -- --input <dir>');
    }
    return;
  }

  const prisma = new PrismaClient();
  try {
    const exportData = await loadCloudBaseExportDirectory(inputDir);
    const result = await importCloudBaseExport(exportData, prisma);
    console.log(
      JSON.stringify(
        {
          collections: CLOUD_BASE_COLLECTION_FILES,
          inserted: result.inserted,
          updated: result.updated,
          skipped: result.skipped,
          invalid: result.invalid
        },
        null,
        2
      )
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
