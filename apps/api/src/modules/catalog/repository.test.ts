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
    const count = vi.fn(async ({ where }: { where: Record<string, unknown> }) => (
      where.trackInventory === true ? 2 : 8
    ));
    const aggregate = vi.fn(async () => ({ _max: { updatedAt: new Date('2026-06-01T12:00:00.000Z') } }));
    const repository = createCatalogRepository({
      category: { findMany: categoryFindMany },
      product: { findMany: productFindMany, count, aggregate }
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
    expect(count).toHaveBeenCalledTimes(2);
    expect(aggregate).toHaveBeenCalledTimes(1);
    expect(count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        categoryId: 'cakes',
        status: 'PUBLISHED',
        OR: [{ trackInventory: false }, { stock: { gt: 0 } }]
      })
    });
    expect(count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        categoryId: 'cakes',
        status: 'PUBLISHED',
        trackInventory: true,
        stock: { lte: 0 }
      })
    });
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
});
