---
phase: 06-merchant-operations-and-runtime-config
plan: 04
subsystem: merchant-order-cloud-functions
tags: [cloud-functions, orders, merchant, audit, fulfillment, indexes]
requires:
  - phase: 06-merchant-operations-and-runtime-config
    plan: 01
    provides: shared fulfillment helpers and manual settlement contract
provides:
  - merchant order grouped query handler
  - merchant order detail handler with audit timeline
  - merchant status mutation handler with terminal locks
affects: [merchant-miniapp, orders, cloud-functions, indexes]
tech-stack:
  added: []
  patterns: [merchant-safe order projection, persisted merchant timeline, shared fulfillment validation]
key-files:
  created:
    - apps/cloud-functions/src/queryMerchantOrders/index.ts
    - apps/cloud-functions/src/queryMerchantOrders/index.test.ts
    - apps/cloud-functions/src/getMerchantOrderDetail/index.ts
    - apps/cloud-functions/src/getMerchantOrderDetail/index.test.ts
    - apps/cloud-functions/src/updateMerchantOrderStatus/index.ts
    - apps/cloud-functions/src/updateMerchantOrderStatus/index.test.ts
  modified:
    - apps/cloud-functions/src/shared/order-store.ts
    - apps/cloud-functions/config/indexes/orders.index.json
    - .planning/phases/06-merchant-operations-and-runtime-config/06-04-SUMMARY.md
requirements-completed: [MORD-01, MORD-02]
duration: 18min
completed: 2026-04-17
---

# Phase 6 Plan 04: Merchant Order Backend Summary

**Merchant order list/detail/status Cloud Functions with fulfillment-progress grouping, manual settlement audit, and terminal-state locks**

## Accomplishments

- Extended `order-store` with merchant list/detail accessors and a cloud-function-local `merchantTimeline` persistence shape.
- Added `queryMerchantOrders` to group merchant-visible orders by fulfillment-progress labels rather than payment-result buckets.
- Added `getMerchantOrderDetail` to return a merchant-safe order projection plus audit timeline, including manual settlement details.
- Added `updateMerchantOrderStatus` to enforce terminal locks, allow valid paid-state fulfillment moves, and persist manual settlement audit records for unpaid fallback.
- Expanded `orders.index.json` with merchant-side query keys for status and fulfillment mode grouping.

## Task Commits

1. **Task 1: Implement merchant order list and detail handlers with grouped fulfillment reads**
   `993cb56` (feat)
2. **Task 2: Implement audited status mutation and merchant order indexing**
   `993cb56` (feat)

## Decisions Made

- Kept merchant audit timeline persistence local to cloud-function order documents instead of widening the shared public order contract again in Wave 2.
- Reused the existing `assertMerchantAccess` boundary by requiring the same `merchantUser + openid` handshake in merchant handlers.
- Preserved a safe merchant detail projection by stripping `openid` and `idempotencyKey` from detail responses.

## Deviations from Plan

None.

## Verification

- `pnpm --filter @xiaipet/cloud-functions test -- queryMerchantOrders getMerchantOrderDetail`
- `pnpm --filter @xiaipet/cloud-functions test -- updateMerchantOrderStatus`
- `rg -n "assertMerchantAccess" apps/cloud-functions/src/queryMerchantOrders/index.ts apps/cloud-functions/src/getMerchantOrderDetail/index.ts apps/cloud-functions/src/updateMerchantOrderStatus/index.ts`
- `rg -n "status|snapshot.fulfillment.mode|updatedAt" apps/cloud-functions/config/indexes/orders.index.json`

## Self-Check: PASSED

- Found commit: `993cb56`
- Merchant order query/detail/mutation tests passed with the final handler shape.
- Merchant order handlers all route through `assertMerchantAccess`, and the order index file now includes merchant grouping keys.

---
*Phase: 06-merchant-operations-and-runtime-config*  
*Completed: 2026-04-17*
