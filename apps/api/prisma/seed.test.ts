import { describe, expect, it } from 'vitest';

import { buildSeedCatalog, buildSeedRuntimeConfigSections, RUNTIME_CONFIG_SECTION_IDS } from './seed';

describe('seed fixtures', () => {
  it('defines the required runtime config sections', () => {
    const sections = buildSeedRuntimeConfigSections();

    expect(RUNTIME_CONFIG_SECTION_IDS).toHaveLength(5);
    expect(sections.map((section) => section.id)).toEqual([...RUNTIME_CONFIG_SECTION_IDS]);
  });

  it('defines deterministic catalog seed records', () => {
    const catalog = buildSeedCatalog();

    expect(catalog.products.map((product) => product.id)).toContain('prod-birthday-cake');
    expect(catalog.products.every((product) => product.stock > 0)).toBe(true);
    expect(catalog.products.every((product) => Number(product.basePrice) >= 0)).toBe(true);
  });
});
