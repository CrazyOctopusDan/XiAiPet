import { describe, expect, it, vi } from 'vitest';

import { importCloudBaseExport } from './cloudbase-importer';

describe('importCloudBaseExport', () => {
  it('imports supported CloudBase mock records idempotently through upserts', async () => {
    const client = {
      user: { findUnique: vi.fn(async () => null), upsert: vi.fn(async () => ({})) },
      merchantUser: { findUnique: vi.fn(async () => null), upsert: vi.fn(async () => ({})) },
      category: { findUnique: vi.fn(async () => null), upsert: vi.fn(async () => ({})) },
      product: { findUnique: vi.fn(async () => null), upsert: vi.fn(async () => ({})) },
      runtimeConfigSection: { findUnique: vi.fn(async () => null), upsert: vi.fn(async () => ({})) }
    };

    const result = await importCloudBaseExport(
      {
        users: [{ _id: 'legacy-user-1', openid: 'openid-1' }],
        categories: [{ _id: 'legacy-category-1', id: 'cakes', name: 'Cakes' }],
        products: [{ _id: 'legacy-product-1', id: 'cake-1', categoryId: 'cakes', basePrice: 68 }]
      },
      client as never
    );

    expect(result).toMatchObject({ users: 1, categories: 1, products: 1, inserted: 3, updated: 0, skipped: 0, invalid: 0 });
    expect(client.user.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { openid: 'openid-1' } }));
    expect(client.product.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'cake-1' } }));
  });
});
