# Catalog Scalable Loading Design

Date: 2026-06-02

## Goal

Make the customer and merchant catalog flows handle hundreds of products without returning every product and every image reference on each list request.

The current catalog path loads all products into frontend memory. That works for a small catalog, but it becomes expensive when the shop reaches 500+ products: list API responses become heavy, OSS image requests increase, and miniapp rendering must diff and measure too much data. The new design keeps the existing business behavior while changing catalog reads to category-aware, paginated, cacheable, detail-on-demand APIs.

## Locked Decisions

- Implement the complete scalable loading approach, not a partial "pagination only" version.
- Customer catalog browsing must preserve category-section behavior rather than becoming one flat product feed.
- Customer category sections use manual "load more" controls instead of automatic infinite loading.
- Sold-out products stay folded by default and have their own loading state.
- Merchant product management uses service-side pagination, search, filtering, sorting, and summary counts.
- List APIs return lightweight summaries only; detail and editor APIs return full product records.
- MySQL fulltext search is not part of the first implementation. It remains a future option.
- The first implementation does not split `fulfillmentModes` out of the current JSON field.

## Recommended Approach

Use separate list-summary and detail contracts for both miniapps.

For the customer miniapp, categories remain the primary browsing unit. The page first loads category navigation and per-category counts, then loads a short preview page for each visible or selected category. Large categories expose a manual "load more" action. This avoids trapping the user inside a single large category during normal scrolling and keeps the left-side category focus behavior stable.

For the merchant miniapp, product management behaves like an operations table: the backend owns filtering, searching, sorting, paging, and aggregate summary counts. The list page loads summary rows, and the editor fetches the complete product only when opened.

## Customer API Design

### Category Navigation

Endpoint:

```http
GET /api/v1/customer/catalog/categories?deliveryMode=delivery
```

Response:

```ts
interface CustomerCatalogCategoriesResponse {
  ok: true;
  categories: Array<{
    id: string;
    name: string;
    shortName: string;
    iconText: string;
    sectionTitle: string;
    availableCount: number;
    soldOutCount: number;
    previewCount: number;
    firstProductUpdatedAt: string | null;
  }>;
  snapshotKey: string;
}
```

The category endpoint returns navigation and count metadata only. It must not return product image arrays, detail content, specs, or price override data.

### Category Product Page

Endpoint:

```http
GET /api/v1/customer/catalog/categories/:categoryId/products?deliveryMode=delivery&availability=available&limit=12&cursor=...
```

`availability` is either `available` or `soldOut`.

Response:

```ts
interface CustomerCategoryProductsResponse {
  ok: true;
  categoryId: string;
  availability: 'available' | 'soldOut';
  items: CustomerProductListItem[];
  pageInfo: {
    hasMore: boolean;
    nextCursor: string | null;
  };
  snapshotKey: string;
}

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
```

The list item contains a single thumbnail URL and card-level facts only. It must not include `introductionImageAssets`, `detailImageAssets`, `detailImages`, `detailContent`, full specs, formulas, or price overrides.

### Product Detail

Endpoint:

```http
GET /api/v1/customer/catalog/products/:productId
```

The detail response returns the complete customer product record: description, specs, fulfillment modes, gallery images, detail images, detail content, stock state, and asset references needed by the detail page and quick-buy flow.

### Product Search

Endpoint:

```http
GET /api/v1/customer/catalog/products/search?keyword=&deliveryMode=&limit=20&cursor=...
```

The search response returns paginated `CustomerProductListItem` summaries plus `pageInfo` and `snapshotKey`. Search results may be shown as a flat list, because search is an intentional query flow rather than the ordinary category-section browsing flow.

## Customer Miniapp Data Flow

The customer catalog service should split the current full-product module cache into three stores:

- `catalogCategoryStore`: category navigation, counts, and snapshot keys by `deliveryMode`.
- `catalogSectionStore`: per-category product summaries keyed by `deliveryMode/categoryId/availability`.
- `productDetailStore`: complete products keyed by `productId`.

Page behavior:

- On catalog page load, request categories for the active delivery mode.
- Load the first page of available products for the initial category.
- Render category section shells from category metadata, but do not request every category's first product page on mount.
- Load another category's first available page when the user taps that category, scrolls to an unloaded section and explicitly asks to view it, or when a narrowly scoped prefetch rule requests only the next near-visible category.
- Show a manual "load more" action at the bottom of a category's available list when `pageInfo.hasMore` is true.
- When the user taps "load more", append only that category's next available page.
- Keep sold-out products folded by default.
- Show a sold-out count in the folded header.
- When the user expands a sold-out section for the first time, request `availability=soldOut` for that category.
- If the sold-out section has more pages, show a separate "load more sold-out products" action inside the folded area.
- Recompute section metrics after category pages are appended or sold-out sections are expanded, so left-side category focus remains correct.
- Search no longer reads from a local all-products cache. It calls the service-side keyword search endpoint.

Quick-buy behavior:

- If a list item can be directly added and no spec selection is required, the frontend may add it with the list summary snapshot.
- If spec selection is required, fetch product detail before opening the quick-buy sheet.
- Checkout remains responsible for final price, stock, status, and membership validation on the backend.

## Merchant API Design

### Product List

Endpoint:

```http
GET /api/v1/merchant/products?categoryId=&status=&keyword=&sort=latest&limit=20&cursor=...
```

Response:

```ts
interface MerchantProductsResponse {
  ok: true;
  items: MerchantProductListItem[];
  summary: {
    totalProducts: number;
    publishedProducts: number;
    draftProducts: number;
    archivedProducts: number;
    stockWarnings: number;
  };
  pageInfo: {
    hasMore: boolean;
    nextCursor: string | null;
  };
  snapshotKey: string;
}

interface MerchantProductListItem {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  status: 'draft' | 'published' | 'archived';
  stock: number;
  trackInventory: boolean;
  minPrice: number;
  maxPrice: number;
  fulfillmentModes: Array<'delivery' | 'pickup' | 'express'>;
  thumbnail: string;
  updatedAt: string;
}
```

The merchant list response owns summary counts for the current filter set. The miniapp must not infer global totals from the current page of products.

### Product Detail

Endpoint:

```http
GET /api/v1/merchant/products/:productId
```

This response returns the full editor record, including all images, detail content, specs, formulas, price overrides, purchase limit, and publish settings.

## Merchant Miniapp Data Flow

- The products page requests the first list page using the active category, status, keyword, and sort.
- Category taps, status filter changes, search submit, clear search, and sort changes reset the list cursor and request the first page.
- The products page appends the next page only when the user taps a "load more" action.
- The editor page fetches full product detail by `productId` before rendering the edit form.
- After save or delete, the products page refreshes the current filter's first page and summary.

## Search Strategy

The first implementation uses ordinary service-side keyword conditions, not MySQL fulltext.

Customer search should match `name` and `description`.

Merchant search should match `name` and `description`; matching `detailContent` is allowed only if the query remains acceptably fast in local and production testing.

MySQL fulltext search is a future upgrade when one or more of these conditions is true:

- The catalog grows beyond roughly 2000 products.
- Keyword search becomes a high-frequency customer entry point.
- Production logs show slow keyword queries.
- Alibaba Cloud RDS MySQL support for Chinese-friendly `ngram` fulltext is confirmed.

The repository should expose a single search method so the service and frontend do not care whether the implementation later changes from ordinary conditions to fulltext.

## Repository And Query Design

Add dedicated repository methods instead of extending the existing full-product list method:

- `listCustomerCatalogCategories({ deliveryMode })`
- `listCustomerCategoryProductSummaries({ categoryId, deliveryMode, availability, keyword, sort, limit, cursor })`
- `searchCustomerProductSummaries({ deliveryMode, keyword, limit, cursor })`
- `getCustomerProductDetail(productId)`
- `listMerchantProductSummaries({ categoryId, status, keyword, sort, limit, cursor })`
- `getMerchantProductDetail(productId)`

List summary queries must use lightweight Prisma `select` clauses. They should not fetch large JSON/image/detail fields that the list cards do not render.

Detail queries may fetch the complete product record.

Cursor pagination should use stable sort keys. The default sort is `updatedAt desc, id asc`. Price sorting can use `basePrice` plus `id` as a stable tie breaker. Cursor encoding should be opaque to the miniapp.

## Index And Performance Notes

The existing product indexes already help:

- `categoryId + status`
- `status + updatedAt`

Add an index for category-aware published catalog paging:

```prisma
@@index([status, categoryId, updatedAt, id])
```

The current `fulfillmentModes` field is JSON. The first implementation may filter against it directly because 500 products is still modest. If the catalog grows into the thousands or fulfillment-mode filtering becomes a slow query, add either a `ProductFulfillmentMode` relation table or redundant boolean columns.

## Cache Snapshot Design

List endpoints return `snapshotKey` values derived from the filter set's `count` and latest `updatedAt`.

Suggested keys:

- Customer categories: `deliveryMode + category count metadata + max(updatedAt)`
- Customer category products: `deliveryMode + categoryId + availability + keyword + sort + count + max(updatedAt)`
- Merchant products: `categoryId + status + keyword + sort + count + max(updatedAt)`

The miniapps may show cached list data immediately, then request the current snapshot. If the snapshot is unchanged, they avoid replacing data and recalculating sections.

## Image Loading Rules

- List APIs return only one thumbnail URL per product.
- Customer detail fetches display and detail images only after entering the product detail page or opening a spec-required quick-buy flow.
- Merchant list uses thumbnails only.
- Merchant editor fetches basic and detail image assets only when editing a product.
- The customer list may bind real image URLs only for rendered or near-visible product cards and use blank image tiles elsewhere.

## Error Handling

- If category metadata loads but a category's products fail, keep the category visible and show a retry action in that section.
- If a "load more" request fails, keep already loaded products and allow retry.
- If sold-out products fail to load after expansion, keep the folded/expanded state and show a section-level retry.
- If product detail fails, show a detail-page retry rather than falling back to stale list summaries for purchasing.
- If a cached snapshot is stale, replace the affected list while preserving the active delivery mode, active category, and scroll intent as much as possible.

## Testing

Backend tests should cover:

- Customer categories return counts and no product detail fields.
- Customer category products paginate available and sold-out products independently.
- Customer category products do not return detail images, introduction images, full specs, formulas, price overrides, or detail content.
- Customer product detail returns complete product data.
- Merchant product list supports category, status, keyword, sort, limit, and cursor.
- Merchant product list returns summary counts for the current filter set.
- Merchant product detail returns complete editor data.
- Cursor paging does not duplicate or skip products.
- `snapshotKey` changes when a matching product is updated.

Customer miniapp tests should cover:

- Catalog page initial load requests categories and only the initial category's first available page.
- Category tap requests that category's first page when not cached.
- Available "load more" appends only the current category.
- Sold-out products are not requested until the section expands.
- Sold-out "load more" appends only sold-out products for that category.
- Search uses service-side requests rather than local full-product cache search.
- Detail page can navigate from a list summary and fetch complete product detail.

Merchant miniapp tests should cover:

- Product page first load requests the first summary page.
- Filter, search, clear search, and sort reset paging and request service-side results.
- "Load more" appends the next summary page.
- Summary values come from the backend response.
- Product editor fetches full product detail before editing.

## Out Of Scope

- MySQL fulltext search.
- Splitting `fulfillmentModes` into a relation table.
- Automatic infinite loading inside customer category sections.
- Changing product save, delete, pricing, inventory, or checkout validation semantics.
- Changing the visual design of the catalog cards beyond adding load-more and retry states.
