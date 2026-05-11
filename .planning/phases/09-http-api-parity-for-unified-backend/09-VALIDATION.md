# Phase 09 Validation Architecture

Date: 2026-05-11

## Validation Goal

Prove that the new HTTP backend exposes the same business capabilities as the existing CloudBase functions, while enforcing the new authentication and merchant authorization boundaries.

## Coverage Dimensions

| Dimension | Required Evidence |
| --- | --- |
| API parity | Every current entry in `apps/cloud-functions/cloudfunctions.json` appears in the API parity table and has at least one route-level test target. |
| Customer auth | Login exchanges a code through an injectable provider, returns a session token, rejects invalid provider responses, and rejects missing/invalid tokens on protected customer routes. |
| Merchant auth | Merchant routes reject non-whitelisted users before calling sensitive repositories/services. |
| Response compatibility | Successful route responses preserve old CloudBase payload shapes where the mini programs will depend on them in Phase 10. |
| Error contract | HTTP failures serialize as `{ ok: false, code, message }`. |
| Transaction-sensitive behavior | Order creation, payment start/sync/confirm, status updates, and balance adjustments have success and failure tests. |
| Provider isolation | WeChat login and WeChat Pay are abstracted and replaceable in tests/dev mode. |

## Test Architecture

Route tests should use Fastify `inject`:

1. Build the app with fake auth/payment providers and fake repositories/services.
2. Exercise HTTP method/path/body/header behavior.
3. Assert response status and JSON body.
4. Assert sensitive fake services were not called when authorization fails.

Prisma smoke tests should remain separate. Route-level tests must not require local MySQL to be running.

## Required Test Groups

- `auth.routes.test.ts`
- `customer-catalog.routes.test.ts`
- `customer-orders.routes.test.ts`
- `merchant-access.routes.test.ts`
- `merchant-orders.routes.test.ts`
- `merchant-catalog.routes.test.ts`
- `merchant-users.routes.test.ts`
- `merchant-runtime-config.routes.test.ts`
- `merchant-printing.routes.test.ts`
- `api-parity.test.ts`

## Manual Verification

After implementation, run:

```bash
cd apps/api
pnpm run typecheck
pnpm run test
```

If MySQL is configured locally, additionally run:

```bash
cd apps/api
pnpm run db:smoke
```

## Release Gate

Phase 09 is not complete until:

- all planned HTTP routes are registered below `/api/v1`;
- route tests pass without live MySQL;
- API parity test covers every CloudBase function manifest entry;
- merchant-only route tests prove early rejection before sensitive data access;
- payment provider abstraction exists with deterministic dev/test behavior.

