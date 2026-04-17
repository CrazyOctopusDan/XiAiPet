---
phase: 06-merchant-operations-and-runtime-config
plan: 02
subsystem: shared-contracts
tags: [catalog, merchant, pricing, schema, vitest, cloudbase]
requires:
  - phase: 05-checkout-payment-and-orders
    provides: shared order fulfillment modes and payment-facing order contracts
provides:
  - merchant catalog category and product admin types
  - category and product validation guards with CloudBase image fileID enforcement
  - reusable product combination pricing and save-contract readiness rules
affects: [phase-06-merchant-cloud-functions, phase-06-merchant-miniapp, catalog-admin]
tech-stack:
  added: []
  patterns: [contract-first shared admin models, pure pricing rule helpers, manual runtime type guards]
key-files:
  created:
    - packages/shared/src/types/catalog-admin.ts
    - packages/shared/src/schema/catalog-admin.ts
    - packages/shared/src/schema/catalog-admin.test.ts
    - packages/shared/src/rules/product-pricing.ts
    - packages/shared/src/rules/product-pricing.test.ts
  modified:
    - .planning/phases/06-merchant-operations-and-runtime-config/06-02-SUMMARY.md
key-decisions:
  - "Category icons stay as short text or emoji tokens in Phase 6 contracts instead of introducing asset-backed icon records."
  - "Product image persistence is anchored on CloudBase storage fileIDs, with preview URLs kept display-only and non-canonical."
  - "Combination pricing defaults to base plus spec plus formula math, with sparse override rows applied only to exact spec/formula pairs."
patterns-established:
  - "Merchant catalog save paths should validate required image and publish metadata before pricing logic is consumed downstream."
  - "Admin-facing shared contracts can use focused type guards and Vitest coverage without introducing a runtime schema library."
requirements-completed: [MCAT-01, MPRD-01, MPRD-02]
duration: 3min
completed: 2026-04-17
---

# Phase 6 Plan 02: Merchant Catalog Contract Summary

**Merchant catalog admin contracts with explicit icon tokens, CloudBase image fileIDs, three-step product editor payloads, and reusable pricing override rules**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-17T22:08:02+08:00
- **Completed:** 2026-04-17T22:11:19+08:00
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added shared category and product admin record types covering icon tokens, single-category products, image fileIDs, purchase limits, and long-form detail content.
- Added schema guards for category delete preflight metadata and the fixed three-step merchant product editor payload.
- Added pure product pricing helpers for default combination math, sparse overrides, and save-contract readiness checks.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define category and product admin schemas with explicit icon-token support** - `ccc6d6b` (test), `f892dd9` (feat)
2. **Task 2: Codify product pricing and override rules outside the merchant editor UI** - `bb63d1e` (test), `135b201` (feat)

## Files Created/Modified

- `packages/shared/src/types/catalog-admin.ts` - Merchant category, product, and three-step editor type contracts.
- `packages/shared/src/schema/catalog-admin.ts` - Runtime guards for icon tokens, single-category product payloads, CloudBase image fileIDs, purchase limits, detail content, and delete preflight shapes.
- `packages/shared/src/schema/catalog-admin.test.ts` - TDD coverage for category/product admin contract requirements.
- `packages/shared/src/rules/product-pricing.ts` - Pure product combination pricing and save-contract validation helpers.
- `packages/shared/src/rules/product-pricing.test.ts` - TDD coverage for default math, sparse overrides, and contract readiness.
- `.planning/phases/06-merchant-operations-and-runtime-config/06-02-SUMMARY.md` - Execution summary for this plan.

## Decisions Made

- Used short text or emoji `iconToken` values as the only Phase 6 category icon contract to match `MCAT-01` without introducing an asset migration.
- Required persisted product images to use `imageFileId` values that look like CloudBase `cloud://` identifiers, leaving preview URLs optional and display-only.
- Kept override pricing sparse and exact-match only so backend handlers and merchant pages can share one predictable default calculation path.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Merchant cloud functions and merchant miniapp pages can now consume stable direct module paths for catalog admin contracts and pricing helpers.
- Barrel exports in `packages/shared/src/index.ts` remain outside this task’s ownership boundary; add them in a later permitted change if downstream consumers need package-root imports.

## Verification

- `pnpm --filter @xiaipet/shared test -- catalog-admin`
- `rg -n "imageFileId|purchaseLimit|detailContent" packages/shared/src/types/catalog-admin.ts packages/shared/src/schema/catalog-admin.ts`
- `pnpm --filter @xiaipet/shared test -- product-pricing`
- `rg -n "imageFileId|fulfillmentModes|trackInventory|status|override|basePrice" packages/shared/src/rules/product-pricing.ts packages/shared/src/rules/product-pricing.test.ts`

## Known Stubs

None.

## Self-Check: PASSED

- Found summary file: `.planning/phases/06-merchant-operations-and-runtime-config/06-02-SUMMARY.md`
- Found commits: `ccc6d6b`, `f892dd9`, `bb63d1e`, `135b201`

---
*Phase: 06-merchant-operations-and-runtime-config*
*Completed: 2026-04-17*
