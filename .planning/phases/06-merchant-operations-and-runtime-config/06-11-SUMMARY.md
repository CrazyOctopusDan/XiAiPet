---
phase: 06-merchant-operations-and-runtime-config
plan: 11
subsystem: customer-runtime-config-and-balance
tags: [customer-miniapp, runtime-config, balance, checkout, home]
requires:
  - phase: 06-merchant-operations-and-runtime-config
    plan: 06
    provides: customer-safe readRuntimeConfig handler and D-25 balance fields
provides:
  - customer runtime-config reader service
  - runtime-config wiring for home and checkout
  - D-25 customer balance presentation
affects: [customer-miniapp]
tech-stack:
  added: []
  patterns: [customer-safe config cache, runtime-owned checkout copy, normalized ledger presentation]
key-files:
  created:
    - apps/customer-miniapp/src/services/runtime-config.ts
    - apps/customer-miniapp/src/services/runtime-config.test.ts
  modified:
    - apps/customer-miniapp/src/services/checkout.ts
    - apps/customer-miniapp/src/services/balance.ts
    - apps/customer-miniapp/src/services/balance.test.ts
    - apps/customer-miniapp/pages/home/index.ts
    - apps/customer-miniapp/pages/home/index.wxml
    - apps/customer-miniapp/pages/checkout/index.ts
    - apps/customer-miniapp/pages/checkout/index.wxml
    - apps/customer-miniapp/pages/balance/index.wxml
    - apps/customer-miniapp/pages/cart-checkout.test.ts
requirements-completed: [MUSR-02, OPS-01]
duration: 27min
completed: 2026-04-18
---

# Phase 6 Plan 11: Customer Runtime Config and Balance Summary

**Customer pages now consume runtime-owned storefront config and render merchant balance adjustments with customer-safe copy**

## Accomplishments

- Added a dedicated customer runtime-config service that reads only the customer-safe `readRuntimeConfig` Cloud Function, hydrates durable defaults, and keeps a small in-app cache for home and checkout consumption.
- Rewired the customer home hero banner and checkout store/notice/delivery-copy surfaces to consume saved runtime config instead of hardcoded placeholders or merchant-only handlers.
- Updated checkout so disabled custom notices stop blocking submission and delivery-rule explainer rows render directly from saved runtime-config data.
- Extended the balance service/page to map merchant adjustments to backend-provided `normalizedTitle + shortNote`, exposing customer-safe ledger copy without leaking the full internal operator remark.

## Task Commits

Pending commit for this plan.

## Decisions Made

- Customer runtime config stays behind a minimal cached reader service so checkout can remain mostly synchronous after the initial storefront read.
- Store name remains the fixed merchant brand while address/coordinates/contact phone come from runtime config, matching the current shared schema boundary.
- Merchant adjustment rendering trusts backend-normalized D-25 fields and does not try to reconstruct customer copy from raw reason types on the client.

## Deviations from Plan

- Home currently consumes only the banner fileId-backed asset path and not additional banner metadata beyond alt text storage. That keeps the storefront change scoped to the approved single-banner surface.

## Verification

- `pnpm --filter @xiaipet/customer-miniapp test -- runtime-config balance cart-checkout`
- `rg -n "readRuntimeConfig" apps/customer-miniapp/src/services/runtime-config.ts`
- Verified `apps/customer-miniapp/src/services/runtime-config.ts` does not reference `getRuntimeConfigSections`
- `rg -n "shortNote|normalizedTitle|ledger-note" apps/customer-miniapp/src/services/balance.ts apps/customer-miniapp/pages/balance/index.wxml`
- `pnpm --filter @xiaipet/customer-miniapp build`

## Self-Check: PASSED

- Customer runtime-config tests cover the dedicated `readRuntimeConfig` path, default hydration, and cached storefront state.
- Checkout tests cover runtime-config hydration plus disabled-notice behavior without regressing the submit flow.
- Customer miniapp TypeScript build passes with the new runtime-config service, updated checkout wiring, and D-25 balance rendering.

---
*Phase: 06-merchant-operations-and-runtime-config*  
*Completed: 2026-04-18*
