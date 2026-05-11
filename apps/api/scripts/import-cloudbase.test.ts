import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { CLOUD_BASE_COLLECTION_FILES, loadCloudBaseExportDirectory } from './import-cloudbase';

describe('CloudBase import CLI helpers', () => {
  it('documents every supported collection filename and loads optional files', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'xiaipet-cloudbase-'));
    await writeFile(path.join(dir, 'users.json'), JSON.stringify([{ openid: 'openid-1' }]), 'utf8');
    await writeFile(path.join(dir, 'categories.json'), JSON.stringify([{ id: 'cat-1' }]), 'utf8');

    const exportData = await loadCloudBaseExportDirectory(dir);

    expect(CLOUD_BASE_COLLECTION_FILES).toEqual([
      'users.json',
      'merchant_users.json',
      'categories.json',
      'products.json',
      'runtime_configs.json',
      'orders.json',
      'balance_accounts.json',
      'balance_ledgers.json',
      'receipt_print_audits.json'
    ]);
    expect(exportData.users).toHaveLength(1);
    expect(exportData.categories).toHaveLength(1);
    expect(exportData.products).toEqual([]);
  });
});
