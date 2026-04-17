---
phase: 06-merchant-operations-and-runtime-config
plan: 03
subsystem: shared-admin-contracts
tags: [merchant, runtime-config, balance, schema, vitest, shared]
requires:
  - phase: 05-checkout-payment-and-orders
    provides: payment-store transaction baseline and shared user models
provides:
  - merchant user search and balance-adjustment contracts
  - fixed-key runtime config section contracts and validators
  - locked delivery explainer rows and membership tier schema
affects: [phase-06-user-admin, phase-06-runtime-config, cloud-functions, merchant-miniapp, customer-miniapp]
tech-stack:
  added: []
  patterns: [audited admin payload schema, fixed-key section documents, locked explainer row validation]
key-files:
  created:
    - packages/shared/src/types/runtime-config.ts
    - packages/shared/src/schema/runtime-config.ts
    - packages/shared/src/schema/runtime-config.test.ts
  modified:
    - packages/shared/src/types/user-admin.ts
    - packages/shared/src/schema/user-admin.ts
    - packages/shared/src/schema/user-admin.test.ts
    - .planning/phases/06-merchant-operations-and-runtime-config/06-03-SUMMARY.md
key-decisions:
  - "Merchant balance adjustment contracts keep explicit action, reason, operator, and before/after balance fields, and reject negative outcomes at schema level."
  - "Runtime config is modeled as five independently saved fixed-key sections instead of one freeform blob."
  - "Delivery fee config is stored as visible locked explainer rows with the exact D-33 wording, not opaque algorithm-only fields."
patterns-established:
  - "Runtime config section documents should always carry `sectionId`, `updatedAt`, and `updatedBy` metadata together with the section payload."
  - "Membership tier definitions must carry threshold, name, and description together to prevent later field collapse in admin pages or handlers."
requirements-completed: [MUSR-01, MUSR-02, OPS-01]
duration: 14min
completed: 2026-04-17
---

# Phase 6 Plan 03: Merchant User and Runtime Config Contract Summary

**Shared merchant user admin schemas plus fixed-key runtime config section contracts for audited balance changes and section-scoped ops config saves**

## Performance

- **Duration:** 14 min
- **Started:** 2026-04-17T22:08:02+08:00
- **Completed:** 2026-04-17T22:22:00+08:00
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Added merchant user search and balance-adjustment payload contracts with explicit reason enums, operator metadata, and non-negative balance enforcement.
- Replaced the placeholder runtime-config schema with fixed-key section documents for `store-profile`, `delivery-rules`, `membership-tiers`, `banner`, and `custom-notice`.
- Locked the delivery fee explainer rows to the exact Phase 6 tier copy and added tests for membership tier completeness plus banner/custom notice constraints.

## Task Commits

Each task was completed with the following commits:

1. **Task 1: Define merchant user search and balance-adjustment schemas with full audit fields**
   `6828910` (test), `644a361` (feat), `310489c` (feat validation follow-up, mixed with `06-01` fulfillment files)
2. **Task 2: Define fixed-key runtime config section contracts for section-scoped saves**
   `b0b3544` (feat; commit message references `06-01` because two staged plan groups raced into one commit on `main`)

## Files Created/Modified

- `packages/shared/src/types/user-admin.ts` - merchant user search and balance-adjustment type contracts.
- `packages/shared/src/schema/user-admin.ts` - validation guards for lightweight user search results and audited balance-adjustment payloads.
- `packages/shared/src/schema/user-admin.test.ts` - TDD coverage for D-19 through D-26 contract rules.
- `packages/shared/src/types/runtime-config.ts` - fixed-key runtime config section types with section metadata and payload shapes.
- `packages/shared/src/schema/runtime-config.ts` - validators for store profile, delivery rules, membership tiers, banner, and custom notice sections.
- `packages/shared/src/schema/runtime-config.test.ts` - TDD coverage for fixed section IDs, locked delivery tiers, membership tier completeness, and banner/custom notice behavior.
- `.planning/phases/06-merchant-operations-and-runtime-config/06-03-SUMMARY.md` - execution summary for this plan.

## Decisions Made

- Store profile editing excludes shop name and only models editable address, coordinates, and contact phone.
- Membership tiers require `threshold + name + description` together as one contract shape.
- Banner remains a single-file section keyed by CloudBase `fileId`, while custom notice keeps its text even when the section is disabled.

## Deviations from Plan

**[Rule 1 - Concurrent Commit Contention] Task commits crossed plan boundaries on the shared branch**  
Found during: Task 1 and Task 2  
Issue: `310489c` included `06-01` fulfillment files alongside `06-03` user-admin validation, and `b0b3544` included `06-03` runtime-config files while carrying a `06-01` commit message because both staged sets raced into the same branch-level commit flow.  
Fix: Preserved the verified code, documented the exact ownership leak here, and avoided a destructive history rewrite during active phase execution.  
Files modified: `packages/shared/src/schema/user-admin.ts`, `packages/shared/src/types/order.ts`, `packages/shared/src/rules/order-fulfillment.ts`, `packages/shared/src/types/runtime-config.ts`, `packages/shared/src/schema/runtime-config.ts`, `packages/shared/src/schema/runtime-config.test.ts`  
Verification: `pnpm --filter @xiaipet/shared test -- user-admin` and `pnpm --filter @xiaipet/shared test -- runtime-config` both passed after the final code settled.  
Commit hash: `310489c`, `b0b3544`

**Total deviations:** 1 auto-resolved.  
**Impact:** Functional deliverables are complete, but commit labels do not map one-to-one to this plan.

## Issues Encountered

- Parallel Wave 1 execution on the main branch produced commit contention and mixed commit ownership. This was contained to history hygiene; the final shared contracts and tests are correct.

## User Setup Required

None.

## Next Phase Readiness

- Wave 2 cloud functions now have shared contract anchors for merchant user search, balance adjustment, and runtime-config section IO.
- Wave 3 merchant and customer pages can consume stable runtime-config section IDs and delivery explainer rows without inventing page-local payload shapes.

## Verification

- `pnpm --filter @xiaipet/shared test -- user-admin`
- `pnpm --filter @xiaipet/shared test -- runtime-config`

## Known Stubs

None.

## Self-Check: PASSED

- Found summary file: `.planning/phases/06-merchant-operations-and-runtime-config/06-03-SUMMARY.md`
- Verified `user-admin` and `runtime-config` shared test suites both pass.
- Verified runtime-config schema encodes the exact fixed section IDs and D-33 delivery explainer rows required by the phase context.

---
*Phase: 06-merchant-operations-and-runtime-config*  
*Completed: 2026-04-17*
