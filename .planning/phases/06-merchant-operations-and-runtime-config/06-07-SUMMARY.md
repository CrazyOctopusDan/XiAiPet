---
phase: 06-merchant-operations-and-runtime-config
plan: 07
subsystem: merchant-orders-ui
tags: [merchant-miniapp, orders, ui, audit, fulfillment]
requires:
  - phase: 06-merchant-operations-and-runtime-config
    plan: 01
    provides: shared fulfillment labels and status helpers
  - phase: 06-merchant-operations-and-runtime-config
    plan: 04
    provides: merchant order query/detail/update handlers
provides:
  - merchant order service layer
  - merchant grouped order list page
  - merchant order detail page with status drawer
affects: [merchant-miniapp, cloud-functions]
tech-stack:
  added: []
  patterns: [service-owned status view models, grouped merchant order cards, drawer-scoped status mutation flow]
key-files:
  created:
    - apps/merchant-miniapp/src/services/orders.ts
    - apps/merchant-miniapp/src/services/orders.test.ts
    - apps/merchant-miniapp/pages/orders/index.ts
    - apps/merchant-miniapp/pages/orders/index.wxml
    - apps/merchant-miniapp/pages/orders/index.wxss
    - apps/merchant-miniapp/pages/orders/index.json
    - apps/merchant-miniapp/pages/order-detail/index.ts
    - apps/merchant-miniapp/pages/order-detail/index.wxml
    - apps/merchant-miniapp/pages/order-detail/index.wxss
    - apps/merchant-miniapp/pages/order-detail/index.json
  modified:
    - apps/cloud-functions/src/assertMerchantAccess/index.ts
    - apps/cloud-functions/src/assertMerchantAccess/index.test.ts
    - apps/cloud-functions/src/queryMerchantOrders/index.ts
    - apps/cloud-functions/src/queryMerchantOrders/index.test.ts
    - apps/cloud-functions/src/shared/merchant-user-store.ts
requirements-completed: [MORD-01, MORD-02]
duration: 29min
completed: 2026-04-18
---

# Phase 6 Plan 07: Merchant Orders UI Summary

**Grouped merchant order list, detail/status drawer UI, and the backend contract fixes needed to make the merchant flow real**

## Accomplishments

- Added a merchant order service that converts backend records into UI-safe view models with a clear split between fulfillment progress as the primary status and payment state as a secondary badge.
- Built the merchant order list page with search, fulfillment-mode pills, grouped order cards, and empty/loading states that follow the Phase 6 UI contract.
- Built the merchant order detail page with audit summary, timeline card, fixed bottom CTA, and a drawer-scoped status update flow.
- Fixed a real integration blocker in the backend: merchant auth can now resolve whitelist membership by `openid`, so merchant miniapp calls no longer depend on the client forging a `merchantUser` payload.
- Fixed merchant order grouping so unpaid orders stay in fulfillment-progress groups while retaining a `待支付`-style secondary badge.

## Task Commits

Pending commit for this plan.

## Decisions Made

- The merchant UI now treats fulfillment progress as the only primary status pill; payment state is rendered separately as `待支付` / `支付处理中` / `支付失败` badges.
- Status mutation payload construction lives in the service layer, not in page code, so the drawer only chooses an option and supplies manual-settlement metadata when required.
- The detail page only requests free-text reason input for unpaid manual settlement, matching the current backend audit contract instead of inventing a second note channel for normal fulfillment transitions.

## Deviations from Plan

- While implementing the UI, I found the existing backend auth handshake was not usable from the miniapp because it trusted a caller-supplied `merchantUser`. I fixed this in the same slice because the planned UI could not work against the old contract.
- I also corrected the unpaid-order grouping behavior in `queryMerchantOrders` to match the locked decision that order lists are grouped by fulfillment progress, not payment result.

## Verification

- `pnpm --filter @xiaipet/cloud-functions test -- assertMerchantAccess`
- `pnpm --filter @xiaipet/cloud-functions test -- queryMerchantOrders`
- `pnpm --filter @xiaipet/merchant-miniapp test -- merchant-orders`
- `pnpm --filter @xiaipet/merchant-miniapp build`
- `rg -n "更新订单状态|待支付|审计|时间线" apps/merchant-miniapp/pages/order-detail/index.wxml apps/merchant-miniapp/pages/order-detail/index.ts`

## Self-Check: PASSED

- Merchant order service tests cover grouped list mapping, unpaid badge behavior, detail audit mapping, and status update payload construction.
- Merchant miniapp TypeScript build passes with the new order pages and service files.
- Backend auth and grouping fixes are covered by dedicated cloud-function tests, so the Wave 3 UI now sits on a usable merchant contract.

---
*Phase: 06-merchant-operations-and-runtime-config*  
*Completed: 2026-04-18*
