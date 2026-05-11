---
phase: 10-mini-program-api-client-migration
plan: 10-04
subsystem: merchant-admin-runtime-users-printing
tags: [wechat-miniapp, merchant-api, admin-services, printing]
requires:
  - phase: 10-mini-program-api-client-migration
    provides: 10-03 merchantApiRequest pattern.
provides:
  - Merchant catalog admin service calls through /api/v1/merchant/categories and /api/v1/merchant/products.
  - Merchant user search and balance adjustments through /api/v1/merchant/users.
  - Runtime config admin and receipt print audit through merchant HTTP API routes.
  - Explicit Phase 11 OSS boundary for product image upload.
affects: [phase-10, merchant-miniapp, api]
tech-stack:
  added: []
  patterns: [merchantApiRequest, HTTP requester injection, OSS-pending upload boundary]
key-files:
  modified:
    - apps/merchant-miniapp/src/services/catalog-admin.ts
    - apps/merchant-miniapp/src/services/user-admin.ts
    - apps/merchant-miniapp/src/services/runtime-config-admin.ts
    - apps/merchant-miniapp/src/services/order-receipt-print.ts
    - apps/merchant-miniapp/pages/product-editor/index.ts
    - apps/api/src/routes/merchant/catalog.ts
    - apps/api/src/modules/catalog/service.ts
key-decisions:
  - "Product image upload now throws ASSET_UPLOAD_PENDING_OSS instead of silently retaining CloudBase storage behavior."
  - "Merchant category delete needed a real HTTP backend route, so DELETE /api/v1/merchant/categories/:categoryId was added with linked-product protection."
patterns-established:
  - "Merchant admin service tests assert exact HTTP path/method/body while preserving page view-model helpers."
requirements-completed: [MP-02, MP-05]
duration: 13 min
completed: 2026-05-11
---

# Phase 10 Plan 10-04: Merchant Admin Runtime Config Users And Printing Summary

**Merchant admin services migrated from CloudBase call payloads to bearer-authenticated HTTP API routes**

## Performance

- **Duration:** 13 min
- **Started:** 2026-05-11T08:51:40Z
- **Completed:** 2026-05-11T09:04:20Z
- **Tasks:** 3
- **Files modified:** 20

## Accomplishments

- Replaced merchant catalog admin category/product query and save operations with `/api/v1/merchant/categories` and `/api/v1/merchant/products`.
- Replaced merchant user search and balance adjustment calls with `/api/v1/merchant/users` HTTP routes while preserving local operator metadata and cache behavior.
- Replaced runtime config admin reads/saves and receipt print prepare/result audit calls with merchant HTTP routes.
- Added a real `DELETE /api/v1/merchant/categories/:categoryId` backend route because the miniapp already exposes category deletion and the Phase 9 route surface only had category upsert.
- Made product image upload fail explicitly with `ASSET_UPLOAD_PENDING_OSS`; the product editor shows a clear toast instead of producing an invalid save payload.

## Task Commits

1. **10-04: Merchant admin services migration** - `78f9269` (feat)

**Plan metadata:** pending in docs commit.

## Files Created/Modified

- `apps/merchant-miniapp/src/services/catalog-admin.ts` - Category/product admin operations now use `merchantApiRequest`.
- `apps/merchant-miniapp/src/services/user-admin.ts` - User search and balance adjustment now use HTTP API routes.
- `apps/merchant-miniapp/src/services/runtime-config-admin.ts` - Runtime config section reads/saves now use HTTP API routes.
- `apps/merchant-miniapp/src/services/order-receipt-print.ts` - Print prepare/result audit now use HTTP API routes.
- `apps/merchant-miniapp/pages/product-editor/index.ts` - Handles OSS-pending image upload boundary without corrupting product payloads.
- `apps/api/src/routes/merchant/catalog.ts` and catalog service/repository files - Added protected category deletion support.
- `apps/merchant-miniapp/src/services/*.js` and `apps/merchant-miniapp/pages/product-editor/index.js` - Runtime JS regenerated for changed TypeScript files.

## Decisions Made

- Did not implement OSS upload in Phase 10. That remains Phase 11, as planned.
- Kept `verifyMerchantAccess` before balance adjustment and receipt printing because existing UI code uses it to compose operator metadata, while the backend merchant guard remains authoritative.
- Accepted both `job` and `print` response shapes for receipt print prepare so the miniapp can work with the current backend service response during route migration.

## Deviations from Plan

- Added backend category deletion route and tests. This was necessary because the miniapp had a delete category call path, but Phase 9 only exposed save/upsert for categories.

## Issues Encountered

- Typecheck caught product editor assuming image upload still returned an ID. The page now catches the Phase 11 boundary error and leaves the draft image fields unchanged.

## Verification

- `pnpm --filter @xiaipet/merchant-miniapp typecheck` passed.
- `pnpm --filter @xiaipet/merchant-miniapp exec vitest run --config vitest.config.ts src/services/catalog-admin.test.ts src/services/user-admin.test.ts src/services/runtime-config-admin.test.ts src/services/order-receipt-print.test.ts` passed: 4 files, 19 tests.
- `pnpm --filter @xiaipet/api typecheck` passed.
- `pnpm --filter @xiaipet/api exec vitest run --config vitest.config.ts src/routes/merchant-admin.routes.test.ts src/routes/customer-catalog.routes.test.ts` passed: 2 files, 3 tests.
- `rg "callCloudFunction|wx\\.cloud\\.callFunction|wx\\.cloud\\.Cloud" apps/merchant-miniapp/src/services/catalog-admin.ts apps/merchant-miniapp/src/services/user-admin.ts apps/merchant-miniapp/src/services/runtime-config-admin.ts apps/merchant-miniapp/src/services/order-receipt-print.ts` returned no matches.
- `pnpm --filter @xiaipet/merchant-miniapp build` passed.

## User Setup Required

None for this plan. OSS upload remains intentionally unavailable until Phase 11.

## Next Phase Readiness

Ready for 10-05. Remaining work is final miniapp configuration, CloudBase startup/call-surface audit, full customer and merchant regression checks, and release documentation updates.

## Self-Check: PASSED

10-04 merchant admin services now use HTTP API routes and pass focused verification.

---
*Phase: 10-mini-program-api-client-migration*
*Completed: 2026-05-11*
