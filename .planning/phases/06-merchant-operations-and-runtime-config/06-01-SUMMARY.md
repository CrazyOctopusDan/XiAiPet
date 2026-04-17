---
phase: 06-merchant-operations-and-runtime-config
plan: 01
subsystem: shared-order-contracts
tags: [orders, merchant, customer, fulfillment, vitest, shared]
requires:
  - phase: 05-checkout-payment-and-orders
    provides: order persistence, customer order service baseline, payment fields
provides:
  - fulfillment-mode-specific merchant and customer order status helpers
  - manual settlement audit contract on order records
  - merchant miniapp vitest harness for later Phase 06 UI slices
affects: [phase-06-merchant-orders, phase-06-customer-orders, shared-order-contract]
tech-stack:
  added: []
  patterns: [shared status helper, audited override record, focused miniapp vitest harness]
key-files:
  created: []
  modified:
    - packages/shared/src/types/order.ts
    - packages/shared/src/rules/order-fulfillment.ts
    - packages/shared/src/rules/order-fulfillment.test.ts
    - apps/customer-miniapp/src/services/orders.ts
    - apps/customer-miniapp/src/services/orders.test.ts
    - apps/merchant-miniapp/package.json
    - apps/merchant-miniapp/vitest.config.ts
    - apps/merchant-miniapp/src/testing/harness-smoke.test.ts
    - .planning/phases/06-merchant-operations-and-runtime-config/06-01-SUMMARY.md
key-decisions:
  - "Paid orders now separate payment status from fulfillment status and use mode-specific state chains for delivery, pickup, and express."
  - "Merchant manual payment fallback remains a dedicated audit record and does not overwrite the original checkout payment method."
  - "Customer order cards and details consume the same shared status labels as merchant surfaces."
patterns-established:
  - "Shared order status selectors should preserve a stable fallback label for legacy paid orders without fulfillmentState."
  - "Merchant miniapp Phase 06 pages can rely on a focused Vitest smoke harness instead of ad hoc test bootstrapping."
requirements-completed: [MORD-01, MORD-02]
duration: 12min
completed: 2026-04-17
---

# Phase 6 Plan 01: Merchant Order Contract Summary

**Shared merchant/customer order status contract with fulfillment-mode chains, audited manual settlement records, and a merchant miniapp test harness**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-17T22:08:02+08:00
- **Completed:** 2026-04-17T22:20:00+08:00
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Expanded the shared order contract with `fulfillmentState` and `merchantOverride.manualSettlement` so payment selection and fulfillment progress stay separate.
- Added shared fulfillment helpers for mode-specific paid-state chains and aligned customer order rendering to the shared label helper.
- Confirmed the merchant miniapp has a runnable targeted Vitest harness for later Wave 3 UI slices.

## Task Commits

Each task was completed with the following commits:

1. **Task 1: Define fulfillment state and manual settlement audit without mutating checkout payment choice**
   `ce659f3` (test), `310489c` (feat, mixed with `06-03` user-admin schema work), `b0b3544` (feat follow-up for shared helper fallback/export)
2. **Task 2: Bootstrap merchant miniapp tests and align customer order labels to the shared helper**
   `dd46a3c` (test); implementation lived in the owned working-tree files and was verified in place

## Files Created/Modified

- `packages/shared/src/types/order.ts` - fulfillment state, manual settlement audit data, and shared status helper exports.
- `packages/shared/src/rules/order-fulfillment.ts` - mode-specific paid-state chains, labels, grouping, terminal guards, and paid fallback handling.
- `packages/shared/src/rules/order-fulfillment.test.ts` - TDD coverage for chains, manual fallback audit data, and terminal-state locks.
- `apps/customer-miniapp/src/services/orders.ts` - customer order rendering now consumes the shared status helper.
- `apps/customer-miniapp/src/services/orders.test.ts` - verifies customer-facing label parity with merchant fulfillment states.
- `apps/merchant-miniapp/package.json` - focused merchant miniapp Vitest command.
- `apps/merchant-miniapp/vitest.config.ts` - merchant miniapp test runner configuration with shared package aliases.
- `apps/merchant-miniapp/src/testing/harness-smoke.test.ts` - smoke test to prove the merchant test harness is runnable.
- `.planning/phases/06-merchant-operations-and-runtime-config/06-01-SUMMARY.md` - execution summary for this plan.

## Decisions Made

- Used a dedicated `fulfillmentState` object instead of overloading top-level payment status for merchant fulfillment progress.
- Kept unpaid-to-paid merchant fallback in `merchantOverride.manualSettlement` with explicit operator, before/after snapshot, and reason fields.
- Returned `已支付` as the safe fallback label for paid legacy orders that do not yet carry `fulfillmentState`.

## Deviations from Plan

**[Rule 1 - Concurrent Commit Contention] Shared fulfillment implementation landed in a mixed commit**  
Found during: Task 1  
Issue: Parallel Wave 1 executors committed against the same branch, and `310489c` included both `06-01` fulfillment files and `06-03` user-admin schema changes.  
Fix: Kept the functional code, added a follow-up `b0b3544` to finalize the shared helper export/fallback, and documented the cross-plan ownership leak here instead of rewriting history mid-wave.  
Files modified: `packages/shared/src/types/order.ts`, `packages/shared/src/rules/order-fulfillment.ts`, `packages/shared/src/schema/user-admin.ts`  
Verification: `pnpm --filter @xiaipet/shared test -- order-fulfillment` and customer/merchant plan checks passed.  
Commit hash: `310489c`, `b0b3544`

**Total deviations:** 1 auto-resolved.  
**Impact:** No functional gap remains, but commit history for this wave is not cleanly isolated by plan.

## Issues Encountered

- Parallel executor commits on the main branch caused one mixed plan commit. The code was retained because it was correct and fully verified, and the deviation was captured in the plan summary.

## User Setup Required

None.

## Next Phase Readiness

- Merchant order Cloud Functions and Wave 3 merchant pages can consume the shared fulfillment helper and audited settlement contract directly.
- Customer order pages are already aligned with the detailed merchant fulfillment labels, so later merchant order UI work will not need a second status taxonomy.

## Verification

- `pnpm --filter @xiaipet/shared test -- order-fulfillment`
- `pnpm --filter @xiaipet/merchant-miniapp test -- harness-smoke`
- `pnpm --filter @xiaipet/customer-miniapp test -- orders`

## Known Stubs

None.

## Self-Check: PASSED

- Found summary file: `.planning/phases/06-merchant-operations-and-runtime-config/06-01-SUMMARY.md`
- Verified shared fulfillment tests, merchant harness tests, and customer order tests all pass.
- Verified the owned files now expose shared order status selectors and the merchant harness entrypoint required by later waves.

---
*Phase: 06-merchant-operations-and-runtime-config*  
*Completed: 2026-04-17*
