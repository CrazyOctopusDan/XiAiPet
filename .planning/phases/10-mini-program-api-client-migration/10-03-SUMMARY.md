---
phase: 10-mini-program-api-client-migration
plan: 10-03
subsystem: merchant-access-orders
tags: [wechat-miniapp, merchant-api, bearer-auth, orders]
requires:
  - phase: 10-mini-program-api-client-migration
    provides: 10-01 customer token pattern reused for merchant miniapp.
provides:
  - Merchant miniapp HTTP API client with namespaced session storage and 401 retry.
  - Merchant access verification via /api/v1/merchant/access.
  - Merchant order list/detail/status services via /api/v1/merchant/orders.
affects: [phase-10, merchant-miniapp, merchant-orders]
tech-stack:
  added: []
  patterns: [merchantApiRequest, merchant bearer session, HTTP service requester injection]
key-files:
  created:
    - apps/merchant-miniapp/src/services/api-config.ts
    - apps/merchant-miniapp/src/services/api-client.ts
    - apps/merchant-miniapp/src/services/api-client.test.ts
  modified:
    - apps/merchant-miniapp/src/services/access.ts
    - apps/merchant-miniapp/src/services/access.test.ts
    - apps/merchant-miniapp/src/services/orders.ts
    - apps/merchant-miniapp/src/services/orders.test.ts
key-decisions:
  - "Merchant miniapp uses the same backend login route but stores tokens under xiaipet.merchant.apiSession."
  - "Merchant access uses auth customer because the access route performs whitelist lookup; merchant order routes use auth merchant."
patterns-established:
  - "Merchant service tests assert exact HTTP path/method/body while preserving existing view-model behavior."
requirements-completed: [MP-02, MP-03, MP-05]
duration: 5 min
completed: 2026-05-11
---

# Phase 10 Plan 10-03: Merchant API Client Access And Order Services Summary

**Merchant miniapp HTTP client plus access and order services migrated to bearer-authenticated API routes**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-11T08:46:00Z
- **Completed:** 2026-05-11T08:51:08Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- Added merchant `wx.request` API client with `xiaipet.merchant.apiSession`, bearer authorization, login through `/api/v1/customer/auth/login`, one 401 retry, and storage cleanup after failed re-login.
- Replaced merchant access verification with `GET /api/v1/merchant/access`.
- Replaced merchant order list/detail/status operations with `GET /api/v1/merchant/orders`, `GET /api/v1/merchant/orders/:orderId`, and `PATCH /api/v1/merchant/orders/:orderId/status`.

## Task Commits

1. **10-03: Merchant API client/access/orders migration** - `5757726` (feat)

**Plan metadata:** pending in docs commit.

## Files Created/Modified

- `apps/merchant-miniapp/src/services/api-config.ts` - Merchant API base URL defaults.
- `apps/merchant-miniapp/src/services/api-client.ts` - Merchant request/session/retry/error boundary.
- `apps/merchant-miniapp/src/services/api-client.test.ts` - Success, API error, 401 retry, failed re-login cleanup, release URL tests.
- `apps/merchant-miniapp/src/services/access.ts` - Merchant access now uses HTTP.
- `apps/merchant-miniapp/src/services/orders.ts` - Merchant order operations now use HTTP.
- `apps/merchant-miniapp/src/services/*.js` - Runtime JS regenerated for changed services.

## Decisions Made

- Left `cloud.ts` in place for storage/upload paths that Phase 11 will handle; 10-03 removed it only from migrated access/order operations.
- Sent status update payload fields as backend route fields (`status`, `paymentStatus`, `fulfillmentStatus`, `operator`) rather than the old CloudBase `nextOrderStatus` naming.

## Deviations from Plan

None - plan executed within the intended access/order service boundary.

## Issues Encountered

The merchant service files were already dirty. Only the 10-03 access/order/API-client files were staged and committed; unrelated dirty admin/runtime/print files were left untouched.

## Verification

- `pnpm --filter @xiaipet/merchant-miniapp typecheck` passed.
- `pnpm --filter @xiaipet/merchant-miniapp exec vitest run --config vitest.config.ts src/services/api-client.test.ts src/services/access.test.ts src/services/orders.test.ts` passed: 3 files, 14 tests.
- `rg "callCloudFunction|wx\\.cloud\\.Cloud|wx\\.cloud\\.callFunction" apps/merchant-miniapp/src/services/access.ts apps/merchant-miniapp/src/services/orders.ts` returned no matches.
- `pnpm --filter @xiaipet/merchant-miniapp build` passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for 10-04. Merchant admin catalog, user/balance, runtime config, and receipt printing services remain to be migrated.

## Self-Check: PASSED

10-03 merchant access and order operations use HTTP API routes and pass focused verification.

---
*Phase: 10-mini-program-api-client-migration*
*Completed: 2026-05-11*
