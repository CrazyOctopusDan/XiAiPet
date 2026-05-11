# Phase 09 Research: HTTP API Parity for Unified Backend

Date: 2026-05-11

## Scope

Phase 09 turns the Phase 08 Node/MySQL backend foundation into a real HTTP API surface for both mini programs. The implementation target is functional parity with the current CloudBase function catalog while keeping the new backend provider-neutral enough for ECS deployment.

The current CloudBase manifest lists 24 functions:

1. `bootstrapUser`
2. `bindPhone`
3. `assertMerchantAccess`
4. `createOrder`
5. `createPayment`
6. `confirmPayment`
7. `payOrder`
8. `queryMyOrders`
9. `getMyOrderDetail`
10. `syncOrderPayment`
11. `queryMerchantOrders`
12. `getMerchantOrderDetail`
13. `updateMerchantOrderStatus`
14. `prepareOrderReceiptPrint`
15. `recordOrderReceiptPrintResult`
16. `queryCategories`
17. `upsertCategory`
18. `queryProducts`
19. `upsertProduct`
20. `searchMerchantUsers`
21. `adjustUserBalance`
22. `getRuntimeConfigSections`
23. `readRuntimeConfig`
24. `upsertRuntimeConfigSection`

The roadmap says "23 CloudBase function capabilities"; the source of truth for execution should be the current `apps/cloud-functions/cloudfunctions.json` manifest, so this phase must account for all 24 entries.

## Existing Backend Foundation

Phase 08 created:

- `apps/api/src/app.ts` Fastify app builder, logger config, error handler, and health route registration.
- `apps/api/src/lib/errors.ts` with `ApiError` and canonical error response `{ ok: false, code, message }`.
- `apps/api/src/db/prisma.ts` Prisma singleton.
- Repository/service modules for catalog, users, balances, orders, payments, printing, and CloudBase import.
- Vitest coverage pattern for repository/service code and Prisma smoke tests.

The phase should extend this foundation instead of adding a separate API framework.

## API Shape Decision

Use versioned REST paths:

- Customer APIs under `/api/v1/customer/...`
- Merchant APIs under `/api/v1/merchant/...`
- Shared operational or provider callbacks under `/api/v1/...` only when they are not customer or merchant initiated.

Successful responses should stay close to CloudBase function output shapes to reduce Phase 10 mini program migration risk. Error responses should use the Phase 08 canonical shape:

```json
{ "ok": false, "code": "SOME_CODE", "message": "Human readable message" }
```

## Authentication Decision

The mini program will send a `wx.login` code to the backend. The backend exchanges it for WeChat `openid` and issues an API session token. No client should send raw `openid` as the trusted identity.

Recommended implementation:

- Add an auth module with a provider interface:
  - `exchangeLoginCode(code): Promise<{ openid: string; unionid?: string; sessionKey?: string }>`
  - production provider calls WeChat `jscode2session`.
  - test/dev provider is injectable and deterministic.
- Add a signed session module using Node `crypto` HMAC rather than introducing JWT dependency.
- Session payload should contain at least `openid`, optional `unionid`, `issuedAt`, and `expiresAt`.
- Customer route pre-handler validates session and exposes `request.auth.openid`.
- Merchant route pre-handler validates session, then checks `merchant_users` whitelist before sensitive access.

Environment variables:

- `API_SESSION_SECRET`
- `WECHAT_APP_ID`
- `WECHAT_APP_SECRET`
- Optional non-production mock login config for local development.

## Merchant Authorization

Every `/api/v1/merchant` route must perform:

1. Session token verification.
2. Lookup in `merchant_users`.
3. Status/role check.
4. Early reject before fetching sensitive order, user, balance, product admin, or runtime config data.

This preserves the CloudBase `assertMerchantAccess` behavior while making it an HTTP middleware/pre-handler concern.

## Payment Strategy

Phase 09 must not depend on real WeChat Pay production callback verification. Add a provider abstraction now:

- `PaymentProvider.startWechatPayment(order)` returns mini program payment params.
- Default production provider can fail fast with `WECHAT_PAY_NOT_CONFIGURED` until Phase 12 config is added.
- Dev/test provider returns deterministic mock payment params.
- Balance payment remains a server-side transaction using the existing balance/order service.
- `confirmPayment` and `syncOrderPayment` should exist as HTTP capabilities, but real callback signature verification belongs to Phase 12.

## Route Mapping

Suggested customer routes:

- `POST /api/v1/customer/auth/login` -> WeChat code exchange + session token
- `POST /api/v1/customer/bootstrap` -> `bootstrapUser`
- `POST /api/v1/customer/profile/phone` -> `bindPhone`
- `GET /api/v1/customer/catalog/categories` -> `queryCategories`
- `GET /api/v1/customer/catalog/products` -> public catalog product query
- `GET /api/v1/customer/runtime-config` -> `readRuntimeConfig`
- `POST /api/v1/customer/orders` -> `createOrder`
- `POST /api/v1/customer/orders/:orderId/payment` -> `createPayment` or `payOrder`, preserving old result semantics
- `POST /api/v1/customer/orders/:orderId/payment-sync` -> `syncOrderPayment`
- `POST /api/v1/customer/orders/:orderId/payment-confirmation` -> `confirmPayment` parity endpoint for mock/dev provider
- `GET /api/v1/customer/orders` -> `queryMyOrders`
- `GET /api/v1/customer/orders/:orderId` -> `getMyOrderDetail`

Suggested merchant routes:

- `GET /api/v1/merchant/access` -> `assertMerchantAccess`
- `GET /api/v1/merchant/orders` -> `queryMerchantOrders`
- `GET /api/v1/merchant/orders/:orderId` -> `getMerchantOrderDetail`
- `PATCH /api/v1/merchant/orders/:orderId/status` -> `updateMerchantOrderStatus`
- `POST /api/v1/merchant/orders/:orderId/receipt-print/prepare` -> `prepareOrderReceiptPrint`
- `POST /api/v1/merchant/orders/:orderId/receipt-print/result` -> `recordOrderReceiptPrintResult`
- `GET /api/v1/merchant/categories` and `PUT /api/v1/merchant/categories/:categoryId` -> category query/upsert
- `GET /api/v1/merchant/products` and `PUT /api/v1/merchant/products/:productId` -> product query/upsert
- `GET /api/v1/merchant/users` -> `searchMerchantUsers`
- `POST /api/v1/merchant/users/:openid/balance-adjustments` -> `adjustUserBalance`
- `GET /api/v1/merchant/runtime-config/sections` -> `getRuntimeConfigSections`
- `GET /api/v1/merchant/runtime-config` -> `readRuntimeConfig`
- `PUT /api/v1/merchant/runtime-config/sections/:sectionKey` -> `upsertRuntimeConfigSection`

## Testing Strategy

Use Fastify `inject` tests with fake providers/repositories for route behavior:

- Auth success/failure and session token rejection.
- Merchant whitelist denies before sensitive repository calls.
- Customer catalog/runtime read success.
- Order creation idempotency and payment failure/success branches.
- Merchant order status transition failure/success branches.
- Balance adjustment success/failure.
- Receipt print prepare/result.
- Parity inventory test proving every `cloudfunctions.json` entry maps to one HTTP route/test target.

Database smoke tests remain separate and should not be required for every route test.

## Implementation Risks

- **CloudBase shape drift**: old functions have mixed `{ ok: false }` business failures and thrown errors. Keep successful payloads close to old shapes, but normalize actual HTTP failures through `ApiError`.
- **Merchant data leakage**: a route that queries sensitive data before whitelist validation violates the main security requirement. Tests should use spies/fakes to prove early rejection.
- **Payment ambiguity**: WeChat Pay production callback verification is not in this phase. Mock and abstraction must be explicit so frontend can integrate now without confusing it for production-ready payment settlement.
- **Route sprawl**: group route files by user surface and domain, then register them from a single API v1 plugin.

