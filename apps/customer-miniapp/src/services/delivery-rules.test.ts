import { describe, expect, it } from 'vitest';

import { resolveDeliveryFeePreview } from './delivery-rules';
import { getCachedCustomerRuntimeConfig, resetCustomerRuntimeConfigCache } from './runtime-config';

describe('delivery rule previews', () => {
  it('keeps checkout summary focused on distance without repeating delivery fee copy', () => {
    resetCustomerRuntimeConfigCache();
    const runtimeConfig = getCachedCustomerRuntimeConfig();

    const preview = resolveDeliveryFeePreview(runtimeConfig, {
      latitude: runtimeConfig.store.latitude,
      longitude: runtimeConfig.store.longitude
    });

    expect(preview.ruleLabel).toBe('0.0 公里，5.0 公里内');
    expect(preview.ruleLabel).not.toContain('配送费');
  });
});
