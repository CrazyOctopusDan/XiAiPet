---
phase: 10
status: complete
researched_at: 2026-05-11
---

# Phase 10 Research: Mini Program API Client Migration

## Research Goal

Plan a service-layer migration for both WeChat mini programs from CloudBase function calls to the Phase 9 `/api/v1` HTTP API, while keeping page behavior stable and treating the old CloudBase implementation as unvalidated scaffolding.

## Source Context

- Phase 10 scope is locked by `.planning/phases/10-mini-program-api-client-migration/10-CONTEXT.md`.
- Phase 9 HTTP route parity is documented in `apps/api/docs/api-parity.md` and `apps/api/src/routes/api-parity.ts`.
- Customer service integration points are under `apps/customer-miniapp/src/services`.
- Merchant service integration points are under `apps/merchant-miniapp/src/services`.
- The current worktree contains pre-existing dirty merchant miniapp and cloud-function changes. Executors must read target files before editing and must not revert unrelated user work.
- The user has clarified that CloudBase is temporary legacy code only. After HTTP migration is verified, old CloudBase backend code should be fully removed through an explicit cleanup step.

## Implementation Findings

### HTTP Client Shape

Use a small WeChat-native wrapper around `wx.request`, not a browser `fetch` abstraction. Mini program runtime support and tests are easier if the client owns:

- `baseUrl` resolution from a small config module.
- JSON request/response handling.
- `Authorization: Bearer <token>` injection.
- One automatic 401 recovery attempt by calling `wx.login` and `POST /api/v1/customer/auth/login`.
- Normalized `ApiClientError` objects with `statusCode`, `code`, and `message`.

Recommended customer files:

- `apps/customer-miniapp/src/services/api-config.ts`
- `apps/customer-miniapp/src/services/api-client.ts`
- `apps/customer-miniapp/src/services/api-client.test.ts`

Recommended merchant files:

- `apps/merchant-miniapp/src/services/api-config.ts`
- `apps/merchant-miniapp/src/services/api-client.ts`
- `apps/merchant-miniapp/src/services/api-client.test.ts`

The two clients can be duplicated initially rather than extracted to `packages/shared`, because mini program runtime typing and generated `.js` output are local to each app. A later cleanup can extract a shared package if duplication becomes meaningful.

### Session Model

Phase 9 issues the token from:

- `POST /api/v1/customer/auth/login` with body `{ code }`

Protected customer and merchant routes use the same signed token. Merchant access is an authorization check over the authenticated user:

- `GET /api/v1/merchant/access`

Recommended storage keys:

- Customer: `xiaipet.customer.apiSession`
- Merchant: `xiaipet.merchant.apiSession`

Both clients should store `{ token, expiresAt, openid }` and should clear this entry when re-login fails.

### Endpoint Mapping

Customer:

- `bootstrapUser` -> `POST /api/v1/customer/bootstrap`
- `bindPhone` -> `POST /api/v1/customer/profile/phone`
- `queryCategories` -> `GET /api/v1/customer/catalog/categories`
- `queryProducts` -> `GET /api/v1/customer/catalog/products`
- `readRuntimeConfig` -> `GET /api/v1/customer/runtime-config`
- `createOrder` -> `POST /api/v1/customer/orders`
- `payOrder` / `createPayment` -> `POST /api/v1/customer/orders/:orderId/payment`
- `syncOrderPayment` -> `POST /api/v1/customer/orders/:orderId/payment-sync`
- `getMyOrderDetail` -> `GET /api/v1/customer/orders/:orderId`
- `queryMyOrders` -> `GET /api/v1/customer/orders`

Merchant:

- `assertMerchantAccess` -> `GET /api/v1/merchant/access`
- `queryMerchantOrders` -> `GET /api/v1/merchant/orders`
- `getMerchantOrderDetail` -> `GET /api/v1/merchant/orders/:orderId`
- `updateMerchantOrderStatus` -> `PATCH /api/v1/merchant/orders/:orderId/status`
- `queryCategories` -> `GET /api/v1/merchant/categories`
- `upsertCategory` -> `PUT /api/v1/merchant/categories/:categoryId`
- `queryProducts` -> `GET /api/v1/merchant/products`
- `upsertProduct` -> `PUT /api/v1/merchant/products/:productId`
- `searchMerchantUsers` -> `GET /api/v1/merchant/users`
- `adjustUserBalance` -> `POST /api/v1/merchant/users/:openid/balance-adjustments`
- `getRuntimeConfigSections` -> `GET /api/v1/merchant/runtime-config/sections`
- `upsertRuntimeConfigSection` -> `PUT /api/v1/merchant/runtime-config/sections/:sectionKey`
- `prepareOrderReceiptPrint` -> `POST /api/v1/merchant/orders/:orderId/receipt-print/prepare`
- `recordOrderReceiptPrintResult` -> `POST /api/v1/merchant/orders/:orderId/receipt-print/result`

### Service Migration Pattern

Current services mostly use default dependency functions:

- Customer services call `wx.cloud.callFunction` directly or through local `getCloudCaller`.
- Merchant services use `callCloudFunction` from `apps/merchant-miniapp/src/services/cloud.ts`.

Migration should preserve exported service function names where practical and replace the default dependency implementation. Tests can pass fake API clients or fake request functions to keep assertions deterministic.

For functions that currently accept `callFunction`, introduce a narrower `ApiRequest` dependency where needed:

```ts
type ApiRequest = <T>(path: string, options?: ApiRequestOptions) => Promise<T>;
```

### Catalog and Runtime Config

Customer catalog currently uses local data from `apps/customer-miniapp/src/data/catalog.ts`. Phase 10 should add HTTP-backed hydration/cache for categories and products where backed by Phase 9, while keeping the existing synchronous getters backed by cache or fallback defaults so pages do not require a full rewrite.

Runtime config already has a good merge/fallback pattern. Keep this pattern and replace `readRuntimeConfig` CloudBase calls with `GET /api/v1/customer/runtime-config`.

### Storage Boundary

OSS replacement is Phase 11. Phase 10 should not implement product image upload to OSS. Merchant `uploadProductImage` can remain explicitly isolated as storage-pending behavior if needed, but no migrated business operation should depend on CloudBase functions.

### Error Handling

Backend failures use `{ ok: false, code, message }`. The client should normalize this to thrown typed errors, and service/page code should map known codes to stable user-facing behavior.

Recommended codes to handle in tests:

- `UNAUTHORIZED`
- `MERCHANT_FORBIDDEN`
- `INVALID_LOGIN_CODE`
- `INSUFFICIENT_BALANCE`
- `ORDER_NOT_FOUND`
- `REQUEST_FAILED`
- `REQUEST_TIMEOUT`

### CloudBase Removal Boundary

Phase 10 must remove CloudBase as the interface invocation mechanism for migrated mini program backend operations. It should not leave customer or merchant service calls using `wx.cloud.callFunction` / `wx.cloud.Cloud` for routes covered by Phase 9.

Full deletion of `apps/cloud-functions` and CloudBase release scripts should happen after mini program HTTP migration verification, or inside an explicit cleanup plan that has clear rollback boundaries. This avoids deleting the only old reference implementation before the new frontend calls have been proven through tests.

## Validation Architecture

Use existing Vitest infrastructure in both miniapps.

Primary commands:

- `pnpm --filter @xiaipet/customer-miniapp test`
- `pnpm --filter @xiaipet/customer-miniapp typecheck`
- `pnpm --filter @xiaipet/customer-miniapp build`
- `pnpm --filter @xiaipet/merchant-miniapp test`
- `pnpm --filter @xiaipet/merchant-miniapp typecheck`
- `pnpm --filter @xiaipet/merchant-miniapp build`

Focused checks:

- Customer client tests should stub `wx.request`, `wx.login`, `wx.getStorageSync`, `wx.setStorageSync`, and `wx.removeStorageSync`.
- Merchant client tests should assert merchant routes use the same token flow and send bearer tokens.
- Service tests should assert exact HTTP method/path mappings from `api-parity.ts`.
- Existing customer page tests around checkout/orders should continue to pass after service migration.

## Research Complete

The phase can be planned as five execution plans matching the roadmap. No extra UI-SPEC is required because the goal is service-layer migration and the roadmap says `UI hint: no`.
