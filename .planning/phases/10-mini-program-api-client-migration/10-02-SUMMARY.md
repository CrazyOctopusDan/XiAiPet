---
phase: 10-mini-program-api-client-migration
plan: 10-02
subsystem: customer-orders
tags: [wechat-miniapp, customer-api, checkout, orders, payment]
requires:
  - phase: 10-mini-program-api-client-migration
    provides: 10-01 customer HTTP API client and session boundary.
provides:
  - Customer checkout create/pay/sync flow routed through /api/v1/customer/orders.
  - Customer order list/detail services routed through authenticated HTTP GET routes.
  - Customer checkout and order page regression tests updated from CloudBase envelopes to HTTP responses.
affects: [phase-10, customer-miniapp, payment, orders]
tech-stack:
  added: []
  patterns: [customerApiRequest injection, HTTP-shaped page test fixtures]
key-files:
  created: []
  modified:
    - apps/customer-miniapp/src/services/order-submit.ts
    - apps/customer-miniapp/src/services/orders.ts
    - apps/customer-miniapp/src/services/order-submit.test.ts
    - apps/customer-miniapp/src/services/orders.test.ts
    - apps/customer-miniapp/pages/cart-checkout.test.ts
    - apps/customer-miniapp/pages/orders-flow.test.ts
key-decisions:
  - "Customer order ownership now comes from the bearer session; create-order payload tests assert no openid is sent."
  - "Checkout page tests now mock wx.request API responses rather than CloudBase result envelopes."
patterns-established:
  - "Order service tests inject CustomerApiRequester to assert exact HTTP method/path/body contracts."
  - "Page tests use callback-style wx.request fixtures matching mini program runtime behavior."
requirements-completed: [MP-01, MP-04]
duration: 11 min
completed: 2026-05-11
---

# Phase 10 Plan 10-02: Customer Checkout Payment And Order Services Summary

**Customer checkout, payment, order list, and order detail flows now use authenticated HTTP order APIs**

## Performance

- **Duration:** 11 min
- **Started:** 2026-05-11T08:35:00Z
- **Completed:** 2026-05-11T08:45:59Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Replaced `createOrder`, `payOrder`, and `syncOrderPayment` CloudBase calls with `POST /api/v1/customer/orders`, `/payment`, and `/payment-sync`.
- Replaced customer order list/detail CloudBase calls with `GET /api/v1/customer/orders` and `GET /api/v1/customer/orders/:orderId`.
- Updated checkout/contact/order page tests so HTTP-backed services keep existing page behavior and submit-lock behavior.

## Task Commits

1. **10-02: Customer checkout/payment/orders migration** - `f4012be` (feat)

**Plan metadata:** pending in docs commit.

## Files Created/Modified

- `apps/customer-miniapp/src/services/order-submit.ts` - Authenticated HTTP create/pay/sync submit flow.
- `apps/customer-miniapp/src/services/orders.ts` - Authenticated HTTP order list/detail queries.
- `apps/customer-miniapp/src/services/order-submit.test.ts` - Create, balance-paid, WeChat sync, insufficient-balance coverage.
- `apps/customer-miniapp/src/services/orders.test.ts` - Exact HTTP GET route assertions plus existing view-model coverage.
- `apps/customer-miniapp/pages/cart-checkout.test.ts` - Page fixtures migrated to `wx.request`.
- `apps/customer-miniapp/pages/orders-flow.test.ts` - Order page fixtures migrated to `wx.request`.
- `apps/customer-miniapp/src/services/order-submit.js` and `orders.js` - Runtime JS regenerated.

## Decisions Made

- Service-level API errors from `CustomerApiError` are surfaced as stable code strings such as `INSUFFICIENT_BALANCE`, matching the existing page-level error handling style.
- WeChat payment sync triggers on both `pending_wechat` and legacy `processing` statuses to preserve current pending-payment behavior.

## Deviations from Plan

The page regression file `cart-checkout.test.ts` also contains the contact-bind phone flow. Because 10-01 already migrated `phone.ts`, this plan updated that fixture from CloudBase to HTTP so the planned cart-checkout regression command can pass.

## Issues Encountered

- The repeated-submit page test needed callback-style `wx.request` control so the payment request could remain in flight while asserting the second tap is ignored.
- Existing order page expected copy was aligned with the shared fulfillment-state label currently produced by the view model (`待处理` for paid orders entering fulfillment).

## Verification

- `pnpm --filter @xiaipet/customer-miniapp typecheck` passed.
- `pnpm --filter @xiaipet/customer-miniapp exec vitest run --config vitest.config.ts src/services/order-submit.test.ts src/services/orders.test.ts pages/cart-checkout.test.ts pages/orders-flow.test.ts` passed: 4 files, 42 tests.
- `rg "wx\\.cloud\\.callFunction" apps/customer-miniapp/src/services/order-submit.ts apps/customer-miniapp/src/services/orders.ts` returned no matches.
- `pnpm --filter @xiaipet/customer-miniapp build` passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for 10-03. Customer-side Phase 10 service calls covered so far now route through HTTP; merchant access/order migration is next.

## Self-Check: PASSED

10-02 order services and critical customer checkout/order page regressions pass against HTTP-backed request fixtures.

---
*Phase: 10-mini-program-api-client-migration*
*Completed: 2026-05-11*
