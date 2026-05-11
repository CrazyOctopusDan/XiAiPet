import { describe, expect, it } from 'vitest';

import { VERIFICATION_CHECK_NAMES } from './verify-data';

describe('verify-data script contract', () => {
  it('keeps the required verification check names stable', () => {
    expect(VERIFICATION_CHECK_NAMES).toEqual([
      'required_runtime_config_sections',
      'order_snapshots_present',
      'balance_ledger_consistency',
      'orphan_orders',
      'orphan_payments',
      'orphan_ledgers',
      'duplicate_order_idempotency_keys'
    ]);
  });
});
