import { describe, expect, it, vi } from 'vitest';

import { createCatalogRepository } from './repository';

function createProductRow(id: string, fulfillmentModes: string[], updatedAt: string) {
  return {
    id,
    name: `${id} 商品`,
    description: `${id} 简介`,
    categoryId: 'cakes',
    imageFileId: '',
    imageAsset: null,
    imagePreviewUrl: null,
    memberLevelId: null,
    status: 'PUBLISHED',
    stock: 5,
    trackInventory: true,
    fulfillmentModes,
    basePrice: { toNumber: () => 88 },
    specs: [],
    formulas: [],
    priceOverrides: [],
    updatedAt: new Date(updatedAt)
  };
}

function createProductRows(prefix: string, count: number, fulfillmentModes: string[], startHour: number) {
  return Array.from({ length: count }, (_, index) =>
    createProductRow(
      `${prefix}-${index + 1}`,
      fulfillmentModes,
      `2026-06-01T${String(startHour - index).padStart(2, '0')}:00:00.000Z`
    )
  );
}

function queryText(query: unknown) {
  const candidate = query as { strings?: string[] };
  return Array.isArray(candidate.strings) ? candidate.strings.join(' ') : String(query);
}

describe('catalog repository', () => {
  it('uses aggregate count metadata for customer category navigation', async () => {
    const categoryFindMany = vi.fn(async () => [
      {
        id: 'cakes',
        name: '蛋糕',
        iconToken: '糕',
        sortOrder: 1,
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
        updatedAt: new Date('2026-06-01T00:00:00.000Z')
      }
    ]);
    const productFindMany = vi.fn(async () => {
      throw new Error('category navigation must not fetch product rows');
    });
    const queryRaw = vi
      .fn()
      .mockResolvedValueOnce([{ count: 8n }])
      .mockResolvedValueOnce([{ count: 2n }])
      .mockResolvedValueOnce([{ maxUpdatedAt: new Date('2026-06-01T12:00:00.000Z') }]);
    const repository = createCatalogRepository({
      category: { findMany: categoryFindMany },
      product: { findMany: productFindMany },
      $queryRaw: queryRaw
    } as never);

    const categories = await repository.listCustomerCatalogCategories({ deliveryMode: 'delivery' });

    expect(categories).toEqual([
      expect.objectContaining({
        id: 'cakes',
        availableCount: 8,
        soldOutCount: 2,
        previewCount: 8,
        firstProductUpdatedAt: '2026-06-01T12:00:00.000Z'
      })
    ]);
    expect(productFindMany).not.toHaveBeenCalled();
    expect(queryRaw).toHaveBeenCalledTimes(3);
    expect(queryRaw.mock.calls.map((call) => queryText(call[0])).join('\n')).toContain('JSON_CONTAINS');
  });

  it('fetches bounded chunks while paging customer summaries with delivery-mode filtering', async () => {
    const findMany = vi
      .fn()
      .mockResolvedValueOnce([
        createProductRow('pickup-1', ['pickup'], '2026-06-01T12:00:00.000Z'),
        createProductRow('pickup-2', ['pickup'], '2026-06-01T11:00:00.000Z'),
        createProductRow('pickup-3', ['pickup'], '2026-06-01T10:00:00.000Z'),
        createProductRow('delivery-1', ['delivery'], '2026-06-01T09:00:00.000Z'),
        createProductRow('pickup-4', ['pickup'], '2026-06-01T08:00:00.000Z'),
        createProductRow('pickup-5', ['pickup'], '2026-06-01T07:00:00.000Z')
      ])
      .mockResolvedValueOnce([
        createProductRow('delivery-2', ['delivery'], '2026-06-01T06:00:00.000Z'),
        createProductRow('delivery-3', ['delivery'], '2026-06-01T05:00:00.000Z')
      ]);
    const repository = createCatalogRepository({
      product: { findMany }
    } as never);

    const page = await repository.listCustomerCategoryProductSummaries({
      categoryId: 'cakes',
      deliveryMode: 'delivery',
      availability: 'available',
      limit: 2
    });

    expect(page.items.map((item) => item.id)).toEqual(['delivery-1', 'delivery-2']);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toEqual(expect.any(String));
    expect(findMany).toHaveBeenCalledTimes(2);
    expect(findMany.mock.calls.map((call) => call[0].take)).toEqual([6, 6]);
    expect(findMany.mock.calls[1][0].where.AND).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          OR: expect.any(Array)
        })
      ])
    );
  });

  it('stops sparse delivery-mode scans at a bounded cap', async () => {
    const findMany = vi.fn(async () => createProductRows(`pickup-page-${findMany.mock.calls.length}`, 6, ['pickup'], 23));
    const repository = createCatalogRepository({
      product: { findMany }
    } as never);

    const page = await repository.listCustomerCategoryProductSummaries({
      categoryId: 'cakes',
      deliveryMode: 'delivery',
      availability: 'available',
      limit: 2
    });

    expect(page.items).toEqual([]);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toEqual(expect.any(String));
    expect(findMany).toHaveBeenCalledTimes(30);
    expect(findMany.mock.calls.map((call) => call[0].take)).toEqual(Array.from({ length: 30 }, () => 6));
  });

  it('uses aggregate count metadata for customer category product snapshots', async () => {
    const findMany = vi.fn(async () => {
      throw new Error('snapshot must not fetch product rows');
    });
    const count = vi.fn(async () => 12);
    const aggregate = vi.fn(async () => ({ _max: { updatedAt: new Date('2026-06-01T12:00:00.000Z') } }));
    const repository = createCatalogRepository({
      product: { findMany, count, aggregate }
    } as never);

    const snapshotKey = await repository.createCustomerCategoryProductsSnapshotKey({
      categoryId: 'cakes',
      deliveryMode: 'delivery',
      availability: 'soldOut',
      keyword: '南瓜',
      sort: 'latest'
    });

    expect(snapshotKey).toEqual(expect.any(String));
    expect(findMany).not.toHaveBeenCalled();
    expect(count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        categoryId: 'cakes',
        status: 'PUBLISHED',
        trackInventory: true,
        stock: { lte: 0 }
      })
    });
    expect(aggregate).toHaveBeenCalledWith({
      where: expect.objectContaining({
        categoryId: 'cakes',
        status: 'PUBLISHED',
        trackInventory: true,
        stock: { lte: 0 }
      }),
      _max: { updatedAt: true }
    });
  });

  it('uses aggregate metadata for merchant product summary counts and snapshots', async () => {
    const findMany = vi.fn(async () => [
      createProductRow('delivery-1', ['delivery'], '2026-06-01T10:00:00.000Z')
    ]);
    const count = vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
      if (where.trackInventory === true) {
        return (where.status as { not?: string } | undefined)?.not === 'ARCHIVED' ? 1 : 3;
      }
      if (where.status === 'PUBLISHED') {
        return 8;
      }
      if (where.status === 'DRAFT') {
        return 4;
      }
      if (where.status === 'ARCHIVED') {
        return 2;
      }
      if ((where.status as { not?: string } | undefined)?.not === 'ARCHIVED') {
        return 12;
      }
      return 14;
    });
    const aggregate = vi.fn(async () => ({ _max: { updatedAt: new Date('2026-06-01T12:00:00.000Z') } }));
    const repository = createCatalogRepository({
      product: { findMany, count, aggregate }
    } as never);

    const page = await repository.listMerchantProductSummaries({
      categoryId: 'cakes',
      keyword: '南瓜',
      limit: 2
    });

    expect(page.summary).toEqual({
      totalProducts: 12,
      publishedProducts: 8,
      draftProducts: 4,
      archivedProducts: 2,
      stockWarnings: 1
    });
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 3 }));
    expect(count).toHaveBeenCalledTimes(5);
    expect(aggregate).toHaveBeenCalledTimes(1);
  });

  it('counts only non-archived products as category-linked products', async () => {
    const count = vi.fn(async () => 0);
    const repository = createCatalogRepository({
      product: { count }
    } as never);

    await repository.countProductsByCategory('cakes');

    expect(count).toHaveBeenCalledWith({
      where: {
        categoryId: 'cakes',
        status: { not: 'ARCHIVED' }
      }
    });
  });

  it('excludes archived merchant products from the default list', async () => {
    const findMany = vi.fn(async () => [
      createProductRow('delivery-1', ['delivery'], '2026-06-01T10:00:00.000Z')
    ]);
    const count = vi.fn(async () => 0);
    const aggregate = vi.fn(async () => ({ _max: { updatedAt: new Date('2026-06-01T12:00:00.000Z') } }));
    const repository = createCatalogRepository({
      product: { findMany, count, aggregate }
    } as never);

    await repository.listMerchantProductSummaries({ limit: 2 });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { not: 'ARCHIVED' }
        })
      })
    );
  });

  it('archives products when physical delete is blocked by order history', async () => {
    const deleteError = Object.assign(new Error('Foreign key constraint failed'), { code: 'P2003' });
    const deleteProduct = vi.fn(async () => {
      throw deleteError;
    });
    const updateProduct = vi.fn(async () => undefined);
    const repository = createCatalogRepository({
      product: {
        delete: deleteProduct,
        update: updateProduct
      }
    } as never);

    await expect(repository.deleteProduct('product-001')).resolves.toBeUndefined();

    expect(deleteProduct).toHaveBeenCalledWith({
      where: { id: 'product-001' }
    });
    expect(updateProduct).toHaveBeenCalledWith({
      where: { id: 'product-001' },
      data: { status: 'ARCHIVED' }
    });
  });

  it('uses aggregate metadata for customer search snapshots with delivery-mode filtering', async () => {
    const queryRaw = vi
      .fn()
      .mockResolvedValueOnce([{ count: 5n }])
      .mockResolvedValueOnce([{ maxUpdatedAt: new Date('2026-06-01T12:00:00.000Z') }]);
    const repository = createCatalogRepository({
      $queryRaw: queryRaw
    } as never);

    const snapshotKey = await (repository as never as {
      createCustomerSearchSnapshotKey(input: { deliveryMode?: 'delivery'; keyword?: string }): Promise<string>;
    }).createCustomerSearchSnapshotKey({
      deliveryMode: 'delivery',
      keyword: '南瓜'
    });

    expect(snapshotKey).toEqual(expect.any(String));
    expect(queryRaw).toHaveBeenCalledTimes(2);
    expect(queryRaw.mock.calls.map((call) => queryText(call[0])).join('\n')).toContain('JSON_CONTAINS');
  });
});
