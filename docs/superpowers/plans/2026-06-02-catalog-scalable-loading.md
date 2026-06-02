# Catalog Scalable Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace full-product catalog loading with category-aware customer pagination, merchant paginated management, lightweight list DTOs, detail-on-demand reads, cache snapshots, and service-side search.

**Architecture:** Add explicit list-summary and detail contracts in the API, then migrate each miniapp away from the module-level full product cache. Customer browsing stays category-section based with manual per-category load-more controls and separate sold-out pagination. Merchant management becomes backend-driven for filtering, search, summary counts, sorting, and paging.

**Tech Stack:** Fastify, Prisma/MySQL, TypeScript, WeChat miniapp pages/services, OSS image variants, Vitest.

---

## Upstream Spec

Approved design: `docs/superpowers/specs/2026-06-02-catalog-scalable-loading-design.md`

Do not implement MySQL fulltext search in this plan. Do not split `fulfillmentModes` out of the current JSON field in this plan.

## File Structure

Backend files:

- Modify `apps/api/prisma/schema.prisma`: add the product paging index.
- Modify `apps/api/src/modules/catalog/repository.ts`: add cursor helpers, summary select methods, detail methods, counts, and snapshot queries.
- Modify `apps/api/src/modules/catalog/service.ts`: map lightweight list DTOs, detail DTOs, pageInfo, snapshotKey, service-side search, and merchant summary.
- Modify `apps/api/src/routes/customer/catalog.ts`: replace the old full list route with category products, product detail, and search routes while keeping category routing.
- Modify `apps/api/src/routes/merchant/catalog.ts`: add list query parsing and product detail route.
- Modify `apps/api/src/routes/customer-catalog.routes.test.ts`: route contract coverage.
- Modify or create `apps/api/src/routes/merchant-catalog.routes.test.ts`: merchant route contract coverage.
- Modify `apps/api/src/modules/catalog/service.test.ts`: service DTO, pagination, snapshot, sold-out, and detail behavior.

Shared and customer miniapp files:

- Modify `apps/customer-miniapp/src/types/catalog.ts`: split list item, section state, detail product, and page metadata types.
- Modify `apps/customer-miniapp/src/services/catalog.ts`: replace `hydrateCatalog()` full-product loading with category, section, search, and detail stores.
- Modify `apps/customer-miniapp/src/services/catalog.test.ts`: service-level cache, search, detail, and sold-out pagination coverage.
- Modify `apps/customer-miniapp/pages/catalog/index.ts`: category-aware loading, load-more, sold-out expansion, and metric recomputation.
- Modify `apps/customer-miniapp/pages/catalog/index.wxml`: load-more and retry states for available and sold-out sections.
- Modify `apps/customer-miniapp/pages/catalog/index.wxss`: visual states for load-more and retry rows.
- Modify `apps/customer-miniapp/pages/search/index.ts`: use service-side search and paginated results.
- Modify `apps/customer-miniapp/pages/product-detail/index.ts`: fetch full detail by product id instead of relying on full local cache.
- Modify `apps/customer-miniapp/pages/discovery-cart.test.ts` and `apps/customer-miniapp/pages/cart-checkout.test.ts` only if cart/detail assumptions need updated fixtures.

Merchant miniapp files:

- Modify `packages/shared/src/types/catalog-admin.ts`: add merchant product list item, list response, pageInfo, and summary types if shared typing is needed by the miniapp.
- Modify `apps/merchant-miniapp/src/services/catalog-admin.ts`: query paginated summaries, product detail, load-more view models, and backend summary values.
- Modify `apps/merchant-miniapp/src/services/catalog-admin.test.ts`: service contract coverage.
- Modify `apps/merchant-miniapp/pages/products/index.ts`: cursor paging, filter/search/sort reset, and load-more behavior.
- Modify `apps/merchant-miniapp/pages/products/index.wxml`: add load-more, summary, status/sort controls if missing.
- Modify `apps/merchant-miniapp/pages/products/index.wxss`: load-more and paging states.
- Modify `apps/merchant-miniapp/pages/product-editor/index.ts`: fetch full product detail before editing.
- Modify `apps/merchant-miniapp/src/testing/product-page-layout.test.ts`: update layout assertions for load-more and no full-list assumptions.

Generated runtime mirrors:

- After TypeScript changes in miniapp files, run the relevant miniapp build so `.js` runtime mirrors are regenerated.

## Task 1: Backend Catalog Summary Contracts

**Files:**
- Modify: `apps/api/src/modules/catalog/repository.ts`
- Modify: `apps/api/src/modules/catalog/service.ts`
- Modify: `apps/api/src/modules/catalog/service.test.ts`

- [ ] **Step 1: Add failing service tests for customer summary contracts**

Add tests in `apps/api/src/modules/catalog/service.test.ts` that call new service methods and assert no detail fields leak from list summaries:

```ts
it('returns customer category metadata with availability counts and snapshot keys', async () => {
  const service = createCatalogService(createCatalogRepositoryStub({
    listCustomerCatalogCategories: async () => [
      {
        id: 'cakes',
        name: '蛋糕',
        iconToken: '糕',
        sortOrder: 1,
        availableCount: 12,
        soldOutCount: 3,
        previewCount: 12,
        firstProductUpdatedAt: '2026-06-01T10:00:00.000Z'
      }
    ],
    createCustomerCategorySnapshotKey: async () => 'customer-categories-delivery-15-20260601'
  }));

  await expect(service.queryCustomerCategories({ deliveryMode: 'delivery' })).resolves.toMatchObject({
    ok: true,
    snapshotKey: 'customer-categories-delivery-15-20260601',
    categories: [
      {
        id: 'cakes',
        name: '蛋糕',
        availableCount: 12,
        soldOutCount: 3,
        previewCount: 12
      }
    ]
  });
});

it('returns customer category product summaries without heavy detail fields', async () => {
  const service = createCatalogService(createCatalogRepositoryStub({
    listCustomerCategoryProductSummaries: async () => ({
      items: [
        {
          id: 'cake-1',
          name: '南瓜蛋糕',
          description: '低糖',
          categoryId: 'cakes',
          imageFileId: '',
          imageAsset: undefined,
          imagePreviewUrl: 'https://assets.example/cake-thumb.jpg',
          memberLevelId: null,
          stock: 8,
          trackInventory: true,
          fulfillmentModes: ['delivery'],
          basePrice: 88,
          specs: [],
          formulas: [],
          priceOverrides: [],
          updatedAt: '2026-06-01T10:00:00.000Z'
        }
      ],
      nextCursor: null,
      hasMore: false
    }),
    createCustomerCategoryProductsSnapshotKey: async () => 'cakes-delivery-available-1'
  }));

  const response = await service.queryCustomerCategoryProducts({
    categoryId: 'cakes',
    deliveryMode: 'delivery',
    availability: 'available',
    limit: 12
  });

  expect(response).toMatchObject({
    ok: true,
    categoryId: 'cakes',
    availability: 'available',
    pageInfo: { hasMore: false, nextCursor: null },
    snapshotKey: 'cakes-delivery-available-1',
    items: [expect.objectContaining({ id: 'cake-1', thumbnail: 'https://assets.example/cake-thumb.jpg' })]
  });
  expect(JSON.stringify(response.items[0])).not.toContain('detailImageAssets');
  expect(JSON.stringify(response.items[0])).not.toContain('detailContent');
  expect(JSON.stringify(response.items[0])).not.toContain('priceOverrides');
});
```

- [ ] **Step 2: Run the failing service tests**

Run:

```bash
pnpm --filter @xiaipet/api exec vitest run --config vitest.config.ts src/modules/catalog/service.test.ts
```

Expected: FAIL because `queryCustomerCategoryProducts` and new repository stub methods are not implemented.

- [ ] **Step 3: Add backend DTO and repository types**

In `apps/api/src/modules/catalog/repository.ts`, add types near the existing product interfaces:

```ts
export type CatalogDeliveryModeFilter = 'pickup' | 'delivery' | 'express';
export type CatalogAvailabilityFilter = 'available' | 'soldOut';

export interface CatalogPageInfo {
  hasMore: boolean;
  nextCursor: string | null;
}

export interface CatalogProductPage<T> extends CatalogPageInfo {
  items: T[];
}

export interface CustomerCategorySummaryRecord extends CatalogCategoryRecord {
  availableCount: number;
  soldOutCount: number;
  previewCount: number;
  firstProductUpdatedAt: string | null;
}
```

Keep `CatalogProductRecord` as the full product detail type. Add a summary product type that omits detail image arrays and detail content:

```ts
export type CatalogProductSummaryRecord = Pick<
  CatalogProductRecord,
  | 'id'
  | 'name'
  | 'description'
  | 'categoryId'
  | 'imageFileId'
  | 'imageAsset'
  | 'imagePreviewUrl'
  | 'memberLevelId'
  | 'stock'
  | 'trackInventory'
  | 'fulfillmentModes'
  | 'basePrice'
  | 'specs'
  | 'formulas'
  | 'priceOverrides'
  | 'updatedAt'
>;
```

- [ ] **Step 4: Implement service mapping for customer summaries**

In `apps/api/src/modules/catalog/service.ts`, add list item and page interfaces:

```ts
interface CustomerProductListItem {
  id: string;
  name: string;
  summary: string;
  categoryId: string;
  minPrice: number;
  stock: number;
  soldOut: boolean;
  cartActionLabel: '选规格' | '直接加购';
  memberLevelLabel: string;
  thumbnail: string;
  updatedAt: string;
}

function mapCustomerProductSummary(product: CatalogProductSummaryRecord): CustomerProductListItem {
  const normalizedProduct = normalizeProductImageUrls(product as CatalogProductRecord);
  const specs = getCustomerSpecs(normalizedProduct as CatalogProductRecord);
  const thumbnail =
    getAssetUrl(normalizedProduct.imageAsset, 'thumbnail') ??
    normalizedProduct.imagePreviewUrl ??
    normalizedProduct.imageAsset?.url ??
    normalizedProduct.imageFileId;

  return {
    id: normalizedProduct.id,
    name: normalizedProduct.name,
    summary: normalizedProduct.description,
    categoryId: normalizedProduct.categoryId,
    minPrice: roundCurrency(normalizedProduct.basePrice),
    stock: normalizedProduct.stock,
    soldOut: normalizedProduct.trackInventory && normalizedProduct.stock <= 0,
    cartActionLabel: specs.length ? '选规格' : '直接加购',
    memberLevelLabel: normalizedProduct.memberLevelId ? '会员可购' : '普通会员可购',
    thumbnail,
    updatedAt: normalizedProduct.updatedAt
  };
}
```

If TypeScript complains because `normalizeProductImageUrls` currently expects `CatalogProductRecord`, split out a new `normalizeProductSummaryImageUrls()` helper that only touches `imageAsset` and `imagePreviewUrl`.

- [ ] **Step 5: Add service methods**

Add methods to the object returned by `createCatalogService()`:

```ts
async queryCustomerCategoryProducts(input: {
  categoryId: string;
  deliveryMode?: CustomerDeliveryMode;
  availability?: 'available' | 'soldOut';
  keyword?: string;
  sort?: string;
  limit?: number;
  cursor?: string;
}) {
  const availability = input.availability ?? 'available';
  const page = await catalogRepository.listCustomerCategoryProductSummaries({
    ...input,
    availability,
    limit: Math.min(Math.max(input.limit ?? 12, 1), 30)
  });
  return {
    ok: true as const,
    categoryId: input.categoryId,
    availability,
    items: page.items.map(mapCustomerProductSummary),
    pageInfo: {
      hasMore: page.hasMore,
      nextCursor: page.nextCursor
    },
    snapshotKey: await catalogRepository.createCustomerCategoryProductsSnapshotKey(input)
  };
}

async getCustomerProductDetail(productId: string) {
  const product = await catalogRepository.getProductById(productId);
  if (!product || product.status !== 'published') {
    throw new ApiError('PRODUCT_NOT_FOUND', 'Product not found', 404);
  }
  return { ok: true as const, product: mapCustomerProduct(product) };
}
```

Also update `queryCustomerCategories` to accept `{ deliveryMode?: CustomerDeliveryMode }` and return counts plus `snapshotKey`.

- [ ] **Step 6: Run service tests**

Run:

```bash
pnpm --filter @xiaipet/api exec vitest run --config vitest.config.ts src/modules/catalog/service.test.ts
```

Expected: PASS for the new service tests and existing catalog tests.

- [ ] **Step 7: Commit Task 1**

```bash
git add apps/api/src/modules/catalog/repository.ts apps/api/src/modules/catalog/service.ts apps/api/src/modules/catalog/service.test.ts
git commit -m "feat: add catalog summary contracts"
```

## Task 2: Backend Repository Paging, Snapshots, And Routes

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/202606020001_add_product_catalog_paging_index/migration.sql`
- Modify: `apps/api/src/modules/catalog/repository.ts`
- Modify: `apps/api/src/routes/customer/catalog.ts`
- Modify: `apps/api/src/routes/merchant/catalog.ts`
- Modify: `apps/api/src/routes/customer-catalog.routes.test.ts`
- Create or modify: `apps/api/src/routes/merchant-catalog.routes.test.ts`

- [ ] **Step 1: Write failing route tests**

Update `apps/api/src/routes/customer-catalog.routes.test.ts` to assert new route parameters:

```ts
it('routes customer category product pages, detail, and search', async () => {
  const queryCustomerCategoryProducts = vi.fn(async (query) => ({ ok: true, query }));
  const getCustomerProductDetail = vi.fn(async (productId: string) => ({ ok: true, product: { id: productId } }));
  const searchCustomerProducts = vi.fn(async (query) => ({ ok: true, query }));
  const app = buildApp({
    config: testConfig,
    dependencies: {
      catalogService: {
        queryCustomerCategories: async () => ({ ok: true }),
        queryCustomerCategoryProducts,
        getCustomerProductDetail,
        searchCustomerProducts,
        queryMerchantCategories: async () => ({ ok: true }),
        queryMerchantProducts: async () => ({ ok: true }),
        getMerchantProductDetail: async () => ({ ok: true }),
        upsertMerchantCategory: async () => ({ ok: true }),
        deleteMerchantCategory: async () => ({ ok: true }),
        upsertMerchantProduct: async () => ({ ok: true })
      }
    }
  });

  await app.inject({ method: 'GET', url: '/api/v1/customer/catalog/categories/cakes/products?deliveryMode=delivery&availability=soldOut&limit=6' });
  await app.inject({ method: 'GET', url: '/api/v1/customer/catalog/products/cake-1' });
  await app.inject({ method: 'GET', url: '/api/v1/customer/catalog/products/search?keyword=南瓜&limit=20' });

  expect(queryCustomerCategoryProducts).toHaveBeenCalledWith(expect.objectContaining({
    categoryId: 'cakes',
    deliveryMode: 'delivery',
    availability: 'soldOut',
    limit: 6
  }));
  expect(getCustomerProductDetail).toHaveBeenCalledWith('cake-1');
  expect(searchCustomerProducts).toHaveBeenCalledWith(expect.objectContaining({ keyword: '南瓜', limit: 20 }));
});
```

Add merchant route coverage in `apps/api/src/routes/merchant-catalog.routes.test.ts`:

```ts
it('routes merchant product summary queries and detail requests', async () => {
  const queryMerchantProducts = vi.fn(async (query) => ({ ok: true, query }));
  const getMerchantProductDetail = vi.fn(async (productId: string) => ({ ok: true, product: { id: productId } }));
  const app = buildApp({
    config: testConfig,
    dependencies: {
      merchantAccountService: merchantAccountService(),
      catalogService: {
        queryMerchantProducts,
        getMerchantProductDetail,
        queryMerchantCategories: async () => ({ ok: true }),
        queryCustomerCategories: async () => ({ ok: true }),
        upsertMerchantCategory: async () => ({ ok: true }),
        deleteMerchantCategory: async () => ({ ok: true }),
        upsertMerchantProduct: async () => ({ ok: true })
      }
    }
  });

  await app.inject({
    method: 'GET',
    url: '/api/v1/merchant/products?categoryId=cakes&status=published&keyword=南瓜&sort=latest&limit=20',
    headers: merchantAccountAuthHeader({ accountId: 'acct-admin' })
  });
  await app.inject({
    method: 'GET',
    url: '/api/v1/merchant/products/cake-1',
    headers: merchantAccountAuthHeader({ accountId: 'acct-admin' })
  });

  expect(queryMerchantProducts).toHaveBeenCalledWith(expect.objectContaining({
    categoryId: 'cakes',
    status: 'published',
    keyword: '南瓜',
    sort: 'latest',
    limit: 20
  }));
  expect(getMerchantProductDetail).toHaveBeenCalledWith('cake-1');
});
```

- [ ] **Step 2: Run failing route tests**

Run:

```bash
pnpm --filter @xiaipet/api exec vitest run --config vitest.config.ts src/routes/customer-catalog.routes.test.ts src/routes/merchant-catalog.routes.test.ts
```

Expected: FAIL because new routes and service stubs do not match yet.

- [ ] **Step 3: Add Prisma index and SQL migration**

Modify `apps/api/prisma/schema.prisma` in `model Product`:

```prisma
@@index([status, categoryId, updatedAt, id])
```

Create `apps/api/prisma/migrations/202606020001_add_product_catalog_paging_index/migration.sql`:

```sql
CREATE INDEX `products_status_category_updated_id_idx`
  ON `products` (`status`, `categoryId`, `updatedAt`, `id`);
```

- [ ] **Step 4: Implement cursor helpers**

In `apps/api/src/modules/catalog/repository.ts`, add:

```ts
function encodeCursor(value: { updatedAt: string; id: string }) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function decodeCursor(cursor: string | undefined): { updatedAt: Date; id: string } | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as { updatedAt?: string; id?: string };
    if (!parsed.updatedAt || !parsed.id) return null;
    return { updatedAt: new Date(parsed.updatedAt), id: parsed.id };
  } catch {
    return null;
  }
}
```

Use `take: limit + 1` and trim the extra row to set `hasMore`. For `updatedAt desc, id asc`, apply cursor filtering with an `OR` condition:

```ts
const cursor = decodeCursor(filters.cursor);
const cursorWhere = cursor
  ? {
      OR: [
        { updatedAt: { lt: cursor.updatedAt } },
        { updatedAt: cursor.updatedAt, id: { gt: cursor.id } }
      ]
    }
  : {};
```

- [ ] **Step 5: Implement repository summary methods**

Add methods to `createCatalogRepository()`:

```ts
async listCustomerCategoryProductSummaries(filters): Promise<CatalogProductPage<CatalogProductSummaryRecord>> {
  const limit = filters.limit ?? 12;
  const rows = await client.product.findMany({
    where: {
      status: PRODUCT_STATUS.published,
      categoryId: filters.categoryId,
      AND: [
        cursorWhere,
        filters.keyword
          ? { OR: [{ name: { contains: filters.keyword } }, { description: { contains: filters.keyword } }] }
          : {},
        filters.availability === 'soldOut'
          ? { trackInventory: true, stock: { lte: 0 } }
          : { OR: [{ trackInventory: false }, { stock: { gt: 0 } }] }
      ]
    },
    select: productSummarySelect,
    orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
    take: limit + 1
  });
  return mapSummaryPage(rows, limit);
}
```

Implement `productSummarySelect` with only the fields listed in `CatalogProductSummaryRecord`. Do not select `introductionImageAssets`, `detailImageAssets`, or `detailContent`.

- [ ] **Step 6: Implement route handlers**

Update `apps/api/src/routes/customer/catalog.ts`:

```ts
app.get('/catalog/categories/:categoryId/products', async (request) => {
  const params = request.params as { categoryId: string };
  const query = request.query as Record<string, string | undefined>;
  return dependencies.catalogService.queryCustomerCategoryProducts({
    categoryId: params.categoryId,
    deliveryMode: query.deliveryMode as 'pickup' | 'delivery' | 'express' | undefined,
    availability: query.availability as 'available' | 'soldOut' | undefined,
    keyword: query.keyword,
    sort: query.sort,
    limit: query.limit ? Number(query.limit) : undefined,
    cursor: query.cursor
  });
});

app.get('/catalog/products/search', async (request) => {
  const query = request.query as Record<string, string | undefined>;
  return dependencies.catalogService.searchCustomerProducts({
    keyword: query.keyword ?? '',
    deliveryMode: query.deliveryMode as 'pickup' | 'delivery' | 'express' | undefined,
    limit: query.limit ? Number(query.limit) : undefined,
    cursor: query.cursor
  });
});

app.get('/catalog/products/:productId', async (request) => {
  const params = request.params as { productId: string };
  return dependencies.catalogService.getCustomerProductDetail(params.productId);
});
```

Update merchant routes similarly with `GET /products/:productId`.

- [ ] **Step 7: Run backend route and service tests**

Run:

```bash
pnpm --filter @xiaipet/api exec vitest run --config vitest.config.ts src/modules/catalog/service.test.ts src/routes/customer-catalog.routes.test.ts src/routes/merchant-catalog.routes.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit Task 2**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/202606020001_add_product_catalog_paging_index/migration.sql apps/api/src/modules/catalog/repository.ts apps/api/src/routes/customer/catalog.ts apps/api/src/routes/merchant/catalog.ts apps/api/src/routes/customer-catalog.routes.test.ts apps/api/src/routes/merchant-catalog.routes.test.ts
git commit -m "feat: add paginated catalog API routes"
```

## Task 3: Customer Catalog Service Stores

**Files:**
- Modify: `apps/customer-miniapp/src/types/catalog.ts`
- Modify: `apps/customer-miniapp/src/services/catalog.ts`
- Modify: `apps/customer-miniapp/src/services/catalog.test.ts`

- [ ] **Step 1: Write failing customer service tests**

Replace the full-hydrate assumption in `apps/customer-miniapp/src/services/catalog.test.ts` with tests for category and section stores:

```ts
it('hydrates categories without requesting all products', async () => {
  const apiRequest = vi.fn(async (path: string) => {
    if (path === '/api/v1/customer/catalog/categories?deliveryMode=delivery') {
      return {
        ok: true,
        snapshotKey: 'delivery-categories-1',
        categories: [{ id: 'cakes', name: '蛋糕', shortName: '蛋糕', iconText: '糕', sectionTitle: '蛋糕', availableCount: 12, soldOutCount: 2 }]
      };
    }
    throw new Error(`Unexpected path: ${path}`);
  });

  await hydrateCatalogCategories('delivery', apiRequest as Parameters<typeof hydrateCatalogCategories>[1]);

  expect(apiRequest).toHaveBeenCalledTimes(1);
  expect(getCatalogCategories()[0]?.id).toBe('cakes');
  expect(getCatalogSectionState('delivery', 'cakes')).toMatchObject({ availableProducts: [], soldOutProducts: [] });
});

it('loads available and sold-out category pages separately', async () => {
  const apiRequest = vi.fn(async (path: string) => ({
    ok: true,
    categoryId: 'cakes',
    availability: path.includes('availability=soldOut') ? 'soldOut' : 'available',
    items: [{ id: path.includes('availability=soldOut') ? 'sold-out-cake' : 'fresh-cake', name: '蛋糕', categoryId: 'cakes', summary: '低糖', minPrice: 88, stock: 1, soldOut: path.includes('availability=soldOut'), cartActionLabel: '直接加购', memberLevelLabel: '普通会员可购', thumbnail: '', updatedAt: '2026-06-01T00:00:00.000Z' }],
    pageInfo: { hasMore: false, nextCursor: null },
    snapshotKey: 'cakes-page'
  }));

  await loadCategoryProducts({ deliveryMode: 'delivery', categoryId: 'cakes', availability: 'available' }, apiRequest as Parameters<typeof loadCategoryProducts>[1]);
  await loadCategoryProducts({ deliveryMode: 'delivery', categoryId: 'cakes', availability: 'soldOut' }, apiRequest as Parameters<typeof loadCategoryProducts>[1]);

  const section = getCatalogSectionState('delivery', 'cakes');
  expect(section.availableProducts.map((item) => item.id)).toEqual(['fresh-cake']);
  expect(section.soldOutProducts.map((item) => item.id)).toEqual(['sold-out-cake']);
});
```

- [ ] **Step 2: Run failing customer service tests**

Run:

```bash
pnpm --filter @xiaipet/customer-miniapp exec vitest run --config vitest.config.ts src/services/catalog.test.ts
```

Expected: FAIL because `hydrateCatalogCategories`, `loadCategoryProducts`, and section state helpers are not implemented.

- [ ] **Step 3: Add customer types**

In `apps/customer-miniapp/src/types/catalog.ts`, add:

```ts
export interface CatalogPageInfo {
  hasMore: boolean;
  nextCursor: string | null;
}

export interface CatalogCategoryWithCounts extends CatalogCategory {
  availableCount: number;
  soldOutCount: number;
  previewCount?: number;
  firstProductUpdatedAt?: string | null;
}

export type CatalogProductSummary = Pick<
  CatalogProduct,
  | 'id'
  | 'name'
  | 'summary'
  | 'categoryId'
  | 'stock'
  | 'soldOut'
  | 'cartActionLabel'
  | 'memberLevelLabel'
  | 'thumbnail'
  | 'specs'
> & {
  price: number;
  updatedAt: string;
};

export interface CatalogSectionState {
  category: CatalogCategoryWithCounts;
  availableProducts: CatalogProductSummary[];
  soldOutProducts: CatalogProductSummary[];
  availablePageInfo: CatalogPageInfo;
  soldOutPageInfo: CatalogPageInfo;
  isAvailableLoading: boolean;
  isSoldOutLoading: boolean;
}
```

- [ ] **Step 4: Implement service stores**

In `apps/customer-miniapp/src/services/catalog.ts`, replace full-product hydration with maps:

```ts
const categoryCache = new Map<DeliveryMode, CatalogCategoryWithCounts[]>();
const sectionCache = new Map<string, CatalogSectionState>();
const productDetailCache = new Map<string, CatalogProduct>();

function sectionKey(mode: DeliveryMode, categoryId: string) {
  return `${mode}:${categoryId}`;
}
```

Add functions:

```ts
export async function hydrateCatalogCategories(mode: DeliveryMode, request: CatalogApiRequester = customerApiRequest) {
  const response = await request<CatalogCategoriesResponse>(`/api/v1/customer/catalog/categories?deliveryMode=${mode}`, {
    method: 'GET',
    auth: 'none'
  });
  const categories = (response.categories ?? []).map(normalizeCategoryWithCounts).filter(Boolean) as CatalogCategoryWithCounts[];
  categoryCache.set(mode, categories);
  categories.forEach((category) => {
    const key = sectionKey(mode, category.id);
    if (!sectionCache.has(key)) {
      sectionCache.set(key, createEmptySectionState(category));
    }
  });
  return categories;
}

export async function loadCategoryProducts(input: { deliveryMode: DeliveryMode; categoryId: string; availability: 'available' | 'soldOut'; cursor?: string }, request: CatalogApiRequester = customerApiRequest) {
  const params = [`deliveryMode=${input.deliveryMode}`, `availability=${input.availability}`, 'limit=12'];
  if (input.cursor) params.push(`cursor=${encodeURIComponent(input.cursor)}`);
  const response = await request<CustomerCategoryProductsResponse>(`/api/v1/customer/catalog/categories/${input.categoryId}/products?${params.join('&')}`, {
    method: 'GET',
    auth: 'none'
  });
  mergeSectionProducts(input.deliveryMode, input.categoryId, input.availability, response);
  return getCatalogSectionState(input.deliveryMode, input.categoryId);
}
```

Keep compatibility helpers like `getProductById()` by reading `productDetailCache` first and falling back to local fixtures only in tests.

- [ ] **Step 5: Run customer service tests**

Run:

```bash
pnpm --filter @xiaipet/customer-miniapp exec vitest run --config vitest.config.ts src/services/catalog.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 3**

```bash
git add apps/customer-miniapp/src/types/catalog.ts apps/customer-miniapp/src/services/catalog.ts apps/customer-miniapp/src/services/catalog.test.ts
git commit -m "feat: add customer catalog section stores"
```

## Task 4: Customer Catalog Page, Sold-Out Loading, Search, And Detail

**Files:**
- Modify: `apps/customer-miniapp/pages/catalog/index.ts`
- Modify: `apps/customer-miniapp/pages/catalog/index.wxml`
- Modify: `apps/customer-miniapp/pages/catalog/index.wxss`
- Modify: `apps/customer-miniapp/pages/search/index.ts`
- Modify: `apps/customer-miniapp/pages/product-detail/index.ts`
- Modify generated mirrors: `apps/customer-miniapp/pages/catalog/index.js`, `apps/customer-miniapp/pages/search/index.js`, `apps/customer-miniapp/pages/product-detail/index.js`
- Modify tests as needed: `apps/customer-miniapp/pages/discovery-cart.test.ts`, `apps/customer-miniapp/pages/cart-checkout.test.ts`, `apps/customer-miniapp/pages/orders-flow.test.ts`

- [ ] **Step 1: Add failing page-level tests where file-based assertions fit**

Add assertions to `apps/customer-miniapp/pages/discovery-cart.test.ts` or a new `apps/customer-miniapp/pages/catalog-scalable-loading.test.ts`:

```ts
it('catalog page exposes manual available and sold-out loading controls', async () => {
  const template = await readFile('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/catalog/index.wxml', 'utf8');
  const source = await readFile('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/catalog/index.ts', 'utf8');

  expect(template).toContain('bindtap="handleLoadMoreAvailable"');
  expect(template).toContain('bindtap="handleLoadMoreSoldOut"');
  expect(template).toContain('bindtap="handleToggleSoldOut"');
  expect(source).toContain('loadCategoryProducts');
  expect(source).not.toContain('hydrateCatalog()');
});
```

- [ ] **Step 2: Run failing page tests**

Run:

```bash
pnpm --filter @xiaipet/customer-miniapp exec vitest run --config vitest.config.ts pages/discovery-cart.test.ts
```

Expected: FAIL until page handlers and template controls exist.

- [ ] **Step 3: Migrate catalog page load flow**

In `apps/customer-miniapp/pages/catalog/index.ts`:

- Replace `hydrateCatalog()` in `onLoad` with `hydrateCatalogCategories(this.data.activeDeliveryMode)`.
- After categories load, call `loadCategoryProducts({ deliveryMode: mode, categoryId: firstCategoryId, availability: 'available' })`.
- Replace `toPageSections()` with a function that reads `getCatalogSectionStates(mode)` and maps section state to page state.
- Keep `updateSectionMetrics()` after each section mutation.

- [ ] **Step 4: Add manual load-more handlers**

Add handlers in `apps/customer-miniapp/pages/catalog/index.ts`:

```ts
async handleLoadMoreAvailable(this: CatalogPageInstance, event: { currentTarget?: { dataset?: { categoryId?: string } } }) {
  const categoryId = event.currentTarget?.dataset?.categoryId;
  if (!categoryId) return;
  const section = getCatalogSectionState(this.data.activeDeliveryMode, categoryId);
  if (!section.availablePageInfo.hasMore) return;
  await loadCategoryProducts({
    deliveryMode: this.data.activeDeliveryMode,
    categoryId,
    availability: 'available',
    cursor: section.availablePageInfo.nextCursor ?? undefined
  });
  this.refreshSections(this.data.activeDeliveryMode, this.data.expandedSoldOutCategoryIds);
}

async handleLoadMoreSoldOut(this: CatalogPageInstance, event: { currentTarget?: { dataset?: { categoryId?: string } } }) {
  const categoryId = event.currentTarget?.dataset?.categoryId;
  if (!categoryId) return;
  const section = getCatalogSectionState(this.data.activeDeliveryMode, categoryId);
  if (!section.soldOutPageInfo.hasMore) return;
  await loadCategoryProducts({
    deliveryMode: this.data.activeDeliveryMode,
    categoryId,
    availability: 'soldOut',
    cursor: section.soldOutPageInfo.nextCursor ?? undefined
  });
  this.refreshSections(this.data.activeDeliveryMode, this.data.expandedSoldOutCategoryIds);
}
```

Wrap calls in `try/catch` and show `wx.showToast({ title: '加载失败', icon: 'none' })`.

- [ ] **Step 5: Load sold-out products only on expansion**

In `handleToggleSoldOut`, before refresh, if the section is newly expanded and `soldOutProducts` is empty while `category.soldOutCount > 0`, call `loadCategoryProducts({ deliveryMode, categoryId, availability: 'soldOut' })`.

- [ ] **Step 6: Update WXML and WXSS**

In `apps/customer-miniapp/pages/catalog/index.wxml`, add controls inside each section:

```xml
<view wx:if="{{section.availablePageInfo.hasMore}}" class="catalog-load-more" data-category-id="{{section.category.id}}" bindtap="handleLoadMoreAvailable">
  查看更多「{{section.category.name}}」商品
</view>

<view wx:if="{{section.soldOutProducts.length || section.category.soldOutCount}}" class="sold-out-toggle" data-category-id="{{section.category.id}}" bindtap="handleToggleSoldOut">
  已售罄 {{section.category.soldOutCount}} 个
</view>

<view wx:if="{{section.isSoldOutExpanded && section.soldOutPageInfo.hasMore}}" class="catalog-load-more muted" data-category-id="{{section.category.id}}" bindtap="handleLoadMoreSoldOut">
  查看更多售罄商品
</view>
```

Style `.catalog-load-more` and `.catalog-load-more.muted` with stable height so metrics do not shift unpredictably.

- [ ] **Step 7: Migrate search page**

In `apps/customer-miniapp/pages/search/index.ts`, replace `searchProducts(keyword)` with `searchCatalogProducts({ keyword, deliveryMode, cursor })`. Keep debounce, and add a load-more handler if `pageInfo.hasMore`.

- [ ] **Step 8: Migrate product detail**

In `apps/customer-miniapp/pages/product-detail/index.ts`, make `onLoad` async and call `getProductDetail(productId)` from the catalog service. Show an empty/loading state until the detail returns. Keep cart add behavior unchanged once full product is available.

- [ ] **Step 9: Build customer miniapp to regenerate mirrors**

Run:

```bash
pnpm --filter @xiaipet/customer-miniapp build
```

Expected: PASS and generated `.js` mirrors updated.

- [ ] **Step 10: Run customer tests**

Run:

```bash
pnpm --filter @xiaipet/customer-miniapp exec vitest run --config vitest.config.ts src/services/catalog.test.ts pages/discovery-cart.test.ts pages/cart-checkout.test.ts pages/orders-flow.test.ts
```

Expected: PASS.

- [ ] **Step 11: Commit Task 4**

```bash
git add apps/customer-miniapp/src/services/catalog.ts apps/customer-miniapp/src/types/catalog.ts apps/customer-miniapp/pages/catalog apps/customer-miniapp/pages/search apps/customer-miniapp/pages/product-detail apps/customer-miniapp/pages/discovery-cart.test.ts apps/customer-miniapp/pages/cart-checkout.test.ts apps/customer-miniapp/pages/orders-flow.test.ts
git commit -m "feat: load customer catalog by category pages"
```

## Task 5: Merchant Product Summary Service And Page

**Files:**
- Modify: `packages/shared/src/types/catalog-admin.ts`
- Modify: `apps/merchant-miniapp/src/services/catalog-admin.ts`
- Modify: `apps/merchant-miniapp/src/services/catalog-admin.test.ts`
- Modify: `apps/merchant-miniapp/pages/products/index.ts`
- Modify: `apps/merchant-miniapp/pages/products/index.wxml`
- Modify: `apps/merchant-miniapp/pages/products/index.wxss`
- Modify generated mirror: `apps/merchant-miniapp/pages/products/index.js`
- Modify: `apps/merchant-miniapp/src/testing/product-page-layout.test.ts`

- [ ] **Step 1: Add failing merchant service tests**

In `apps/merchant-miniapp/src/services/catalog-admin.test.ts`, add:

```ts
it('queries merchant product summaries with filters and backend summary', async () => {
  const request = vi.fn().mockResolvedValue({
    ok: true,
    items: [createProductRecord({ id: 'cake-1' })],
    summary: { totalProducts: 30, publishedProducts: 20, draftProducts: 8, archivedProducts: 2, stockWarnings: 3 },
    pageInfo: { hasMore: true, nextCursor: 'cursor-2' },
    snapshotKey: 'merchant-products-30'
  });

  const result = await queryProducts({ categoryId: 'cakes', status: 'published', keyword: '南瓜', sort: 'latest', limit: 20 }, request);

  expect(request).toHaveBeenCalledWith('/api/v1/merchant/products', {
    method: 'GET',
    query: { categoryId: 'cakes', status: 'published', keyword: '南瓜', sort: 'latest', limit: 20 },
    auth: 'merchant'
  });
  expect(result.summary.totalProducts).toBe(30);
  expect(result.pageInfo.hasMore).toBe(true);
});
```

- [ ] **Step 2: Run failing merchant service tests**

Run:

```bash
pnpm --filter @xiaipet/merchant-miniapp exec vitest run --config vitest.config.ts src/services/catalog-admin.test.ts
```

Expected: FAIL because `queryProducts` still returns a raw array.

- [ ] **Step 3: Add shared merchant list types**

In `packages/shared/src/types/catalog-admin.ts`, add:

```ts
export interface CatalogPageInfo {
  hasMore: boolean;
  nextCursor: string | null;
}

export interface CatalogProductAdminListItem {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  status: CatalogProductStatus;
  stock: number;
  trackInventory: boolean;
  minPrice: number;
  maxPrice: number;
  fulfillmentModes: OrderFulfillmentMode[];
  thumbnail: string;
  updatedAt: string;
}

export interface CatalogProductAdminListSummary {
  totalProducts: number;
  publishedProducts: number;
  draftProducts: number;
  archivedProducts: number;
  stockWarnings: number;
}

export interface CatalogProductAdminListResponse {
  items: CatalogProductAdminListItem[];
  summary: CatalogProductAdminListSummary;
  pageInfo: CatalogPageInfo;
  snapshotKey: string;
}
```

- [ ] **Step 4: Update merchant service**

Change `queryProducts` in `apps/merchant-miniapp/src/services/catalog-admin.ts` to accept an object:

```ts
export async function queryProducts(
  filters: { categoryId?: string; status?: string; keyword?: string; sort?: string; limit?: number; cursor?: string } = {},
  request: MerchantApiRequester = merchantApiRequest
) {
  const query = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined && value !== ''));
  const response = await request<{ ok?: boolean } & CatalogProductAdminListResponse>('/api/v1/merchant/products', {
    method: 'GET',
    query,
    auth: 'merchant'
  });
  return {
    items: response.items ?? [],
    summary: response.summary ?? { totalProducts: 0, publishedProducts: 0, draftProducts: 0, archivedProducts: 0, stockWarnings: 0 },
    pageInfo: response.pageInfo ?? { hasMore: false, nextCursor: null },
    snapshotKey: response.snapshotKey ?? ''
  };
}
```

Update `getProductPageViewModel` to accept list items plus backend summary instead of calculating global totals from the page.

- [ ] **Step 5: Update merchant products page**

In `apps/merchant-miniapp/pages/products/index.ts`:

- Add `statusFilter`, `sort`, `pageInfo`, `snapshotKey`, and `items` to data.
- `refreshProducts()` calls `queryProducts({ categoryId, status, keyword, sort, limit: 20 })`.
- `handleCategoryTap`, `handleKeywordConfirm`, `handleClearSearch`, status changes, and sort changes reset cursor and replace `cards`.
- Add `handleLoadMoreProducts()` that calls `queryProducts({ ..., cursor: this.data.pageInfo.nextCursor })` and appends cards.

- [ ] **Step 6: Update merchant WXML and layout tests**

Add a load-more row:

```xml
<view wx:if="{{pageInfo.hasMore}}" class="product-load-more" bindtap="handleLoadMoreProducts">
  加载更多商品
</view>
```

Update `apps/merchant-miniapp/src/testing/product-page-layout.test.ts` to assert `handleLoadMoreProducts` and `product-load-more`.

- [ ] **Step 7: Build merchant miniapp and run tests**

Run:

```bash
pnpm --filter @xiaipet/merchant-miniapp build
pnpm --filter @xiaipet/merchant-miniapp exec vitest run --config vitest.config.ts src/services/catalog-admin.test.ts src/testing/product-page-layout.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit Task 5**

```bash
git add packages/shared/src/types/catalog-admin.ts apps/merchant-miniapp/src/services/catalog-admin.ts apps/merchant-miniapp/src/services/catalog-admin.test.ts apps/merchant-miniapp/pages/products apps/merchant-miniapp/src/testing/product-page-layout.test.ts
git commit -m "feat: paginate merchant product management"
```

## Task 6: Merchant Product Detail Editing

**Files:**
- Modify: `apps/merchant-miniapp/src/services/catalog-admin.ts`
- Modify: `apps/merchant-miniapp/src/services/catalog-admin.test.ts`
- Modify: `apps/merchant-miniapp/pages/product-editor/index.ts`
- Modify generated mirror: `apps/merchant-miniapp/pages/product-editor/index.js`

- [ ] **Step 1: Add failing service test for merchant detail**

In `apps/merchant-miniapp/src/services/catalog-admin.test.ts`, add:

```ts
it('fetches a complete merchant product before editing', async () => {
  const product = createProductRecord({ id: 'cake-1', detailContent: '完整详情' });
  const request = vi.fn().mockResolvedValue({ ok: true, product });

  await expect(getProductDetail('cake-1', request)).resolves.toEqual(product);
  expect(request).toHaveBeenCalledWith('/api/v1/merchant/products/cake-1', {
    method: 'GET',
    auth: 'merchant'
  });
});
```

- [ ] **Step 2: Run failing test**

Run:

```bash
pnpm --filter @xiaipet/merchant-miniapp exec vitest run --config vitest.config.ts src/services/catalog-admin.test.ts
```

Expected: FAIL because `getProductDetail` is not implemented.

- [ ] **Step 3: Implement merchant detail service**

In `apps/merchant-miniapp/src/services/catalog-admin.ts`, add:

```ts
export async function getProductDetail(productId: string, request: MerchantApiRequester = merchantApiRequest) {
  const response = await request<{ ok?: boolean; product: CatalogProductAdminRecord }>(`/api/v1/merchant/products/${productId}`, {
    method: 'GET',
    auth: 'merchant'
  });
  return response.product;
}
```

- [ ] **Step 4: Update product editor page**

In `apps/merchant-miniapp/pages/product-editor/index.ts`, replace any dependency on list-loaded full product objects with `await getProductDetail(productId)` before `splitProductEditorPayload(product)`.

- [ ] **Step 5: Build and test merchant detail flow**

Run:

```bash
pnpm --filter @xiaipet/merchant-miniapp build
pnpm --filter @xiaipet/merchant-miniapp exec vitest run --config vitest.config.ts src/services/catalog-admin.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 6**

```bash
git add apps/merchant-miniapp/src/services/catalog-admin.ts apps/merchant-miniapp/src/services/catalog-admin.test.ts apps/merchant-miniapp/pages/product-editor
git commit -m "feat: fetch merchant product detail on edit"
```

## Task 7: Full Verification And Regression Sweep

**Files:**
- Verify all modified source, test, generated JS, and Prisma migration files.

- [ ] **Step 1: Run API focused tests**

```bash
pnpm --filter @xiaipet/api exec vitest run --config vitest.config.ts src/modules/catalog/service.test.ts src/routes/customer-catalog.routes.test.ts src/routes/merchant-catalog.routes.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run API typecheck**

```bash
pnpm --filter @xiaipet/api typecheck
```

Expected: PASS.

- [ ] **Step 3: Run customer miniapp tests and typecheck**

```bash
pnpm --filter @xiaipet/customer-miniapp exec vitest run --config vitest.config.ts src/services/catalog.test.ts pages/discovery-cart.test.ts pages/cart-checkout.test.ts pages/orders-flow.test.ts
pnpm --filter @xiaipet/customer-miniapp typecheck
```

Expected: PASS.

- [ ] **Step 4: Run merchant miniapp tests and typecheck**

```bash
pnpm --filter @xiaipet/merchant-miniapp exec vitest run --config vitest.config.ts src/services/catalog-admin.test.ts src/testing/product-page-layout.test.ts
pnpm --filter @xiaipet/merchant-miniapp typecheck
```

Expected: PASS.

- [ ] **Step 5: Run build commands to regenerate runtime JS**

```bash
pnpm --filter @xiaipet/customer-miniapp build
pnpm --filter @xiaipet/merchant-miniapp build
```

Expected: PASS.

- [ ] **Step 6: Run negative field-leak checks**

```bash
rg -n "detailImageAssets|introductionImageAssets|detailContent" apps/api/src/routes/customer-catalog.routes.test.ts apps/api/src/modules/catalog/service.test.ts
```

Expected: references only appear in tests that assert these fields are absent from list summaries or present in detail responses.

- [ ] **Step 7: Review final diff**

```bash
git status --short
git diff --stat
git diff -- apps/api/src/modules/catalog apps/api/src/routes/customer/catalog.ts apps/api/src/routes/merchant/catalog.ts apps/customer-miniapp/src/services/catalog.ts apps/customer-miniapp/pages/catalog/index.ts apps/merchant-miniapp/src/services/catalog-admin.ts apps/merchant-miniapp/pages/products/index.ts
```

Expected: only catalog loading, product route, product page, generated JS, type, test, and migration files changed.

- [ ] **Step 8: Commit verification cleanup**

If Task 7 required any fixes:

```bash
git add <fixed-files>
git commit -m "test: verify scalable catalog loading"
```

If no fixes were needed, do not create an empty commit.

## Self-Review Notes

- Spec coverage: customer category navigation, category product pages, sold-out folding, manual load-more, customer search, customer detail, merchant list, merchant detail, snapshots, image rules, ordinary search, and out-of-scope fulltext/fulfillment splitting all have tasks.
- Incomplete-term scan: no unfinished instructions are intentionally left for implementers.
- Type consistency: plan uses `pageInfo`, `snapshotKey`, `CatalogProductSummaryRecord`, `CustomerProductListItem`, `CatalogProductAdminListItem`, and `CatalogProductAdminListResponse` consistently across backend and miniapp tasks.
