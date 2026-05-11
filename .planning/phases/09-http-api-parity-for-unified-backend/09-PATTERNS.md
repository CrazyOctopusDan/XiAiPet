# Phase 09 Pattern Map

Date: 2026-05-11

## Existing Patterns to Reuse

### Fastify App Construction

Reference: `apps/api/src/app.ts`

- Use `buildApp` as the only Fastify app entry.
- Keep plugins small and route-focused.
- Register all new versioned API routes from the app builder so tests can use the same path as runtime.
- Keep error serialization centralized through `configureErrorHandler`.

### Error Handling

Reference: `apps/api/src/lib/errors.ts`

- Throw `ApiError` for HTTP failures.
- Preserve `{ ok: false, code, message }` for error responses.
- Do not return raw thrown error details to clients.
- For CloudBase-compatible business failures that previously returned `{ ok: false, ... }`, only keep that shape when it is part of the business contract, such as insufficient balance or unconfigured WeChat Pay.

### Repository and Service Split

References:

- `apps/api/src/modules/catalog/repository.ts`
- `apps/api/src/modules/orders/repository.ts`
- `apps/api/src/modules/orders/service.ts`
- `apps/api/src/modules/users/repository.ts`
- `apps/api/src/modules/users/balance-service.ts`
- `apps/api/src/modules/payments/repository.ts`
- `apps/api/src/modules/printing/repository.ts`

Pattern:

- Route handlers parse HTTP request details and call services.
- Services enforce business rules and transactions.
- Repositories isolate Prisma shape and persistence details.
- Shared schemas from `packages/shared` remain the validation source wherever possible.

### Tests

Reference: `apps/api/vitest.config.ts`

- Use Vitest.
- Use `buildApp` and Fastify `inject` for HTTP tests.
- Prefer fake repositories/providers for route-level tests.
- Keep Prisma-backed smoke tests separate from route behavior tests.

## New Patterns to Introduce

### API V1 Route Registry

Create a route registry under `apps/api/src/routes/api-v1.ts` that registers:

- customer auth/profile routes
- customer catalog/runtime/order routes
- merchant access/order/catalog/user/runtime/printing routes

The app builder should register `apiV1Routes` once.

### Request Auth Decoration

Create `apps/api/src/modules/auth/`:

- `session.ts` for signing/verifying session tokens.
- `wechat-login.ts` for provider interface and WeChat implementation.
- `guards.ts` for Fastify pre-handlers.

Route handlers should read `request.auth.openid` after the guard runs. Merchant routes should read `request.merchant` after the merchant guard runs.

### Dependency Injection for Tests

Extend `buildApp` to accept explicit service/provider overrides:

- auth provider
- payment provider
- repositories/services where route tests need fakes

Avoid global monkey-patching. If a default dependency is omitted, build the production Prisma-backed service.

### Route File Ownership

Use these route modules:

- `apps/api/src/routes/customer/auth.ts`
- `apps/api/src/routes/customer/catalog.ts`
- `apps/api/src/routes/customer/orders.ts`
- `apps/api/src/routes/merchant/access.ts`
- `apps/api/src/routes/merchant/orders.ts`
- `apps/api/src/routes/merchant/catalog.ts`
- `apps/api/src/routes/merchant/users.ts`
- `apps/api/src/routes/merchant/runtime-config.ts`
- `apps/api/src/routes/merchant/printing.ts`

### Parity Inventory

Add an executable or test-readable mapping file, for example:

- `apps/api/src/routes/api-parity.ts`

It should map CloudBase function names to HTTP methods and paths. The final plan should add a test that reads `apps/cloud-functions/cloudfunctions.json` and verifies no current CloudBase function is missing from the parity table.

## Anti-Patterns to Avoid

- Do not trust `openid` from request bodies or query strings.
- Do not fetch merchant order/user/balance data before merchant whitelist validation.
- Do not duplicate pricing, fulfillment, balance, or status transition rules inside route files.
- Do not make route tests depend on a live MySQL instance.
- Do not add real WeChat Pay callback assumptions before Phase 12.

