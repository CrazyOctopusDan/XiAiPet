---
phase: 06-merchant-operations-and-runtime-config
plan: 06
subsystem: merchant-user-runtime-config-cloud-functions
tags: [cloud-functions, balance, users, runtime-config, audit, ledger]
requires:
  - phase: 06-merchant-operations-and-runtime-config
    plan: 03
    provides: user-admin and runtime-config shared contracts
provides:
  - merchant user search handler
  - audited balance adjustment handler
  - merchant admin runtime config handlers and customer-safe read path
affects: [merchant-miniapp, customer-miniapp, balance-ledgers, runtime-configs, cloud-functions]
tech-stack:
  added: []
  patterns: [customer-safe ledger projection, section-scoped runtime config docs, transaction-backed admin balance adjustment]
key-files:
  created:
    - apps/cloud-functions/src/searchMerchantUsers/index.ts
    - apps/cloud-functions/src/searchMerchantUsers/index.test.ts
    - apps/cloud-functions/src/adjustUserBalance/index.ts
    - apps/cloud-functions/src/adjustUserBalance/index.test.ts
    - apps/cloud-functions/src/getRuntimeConfigSections/index.ts
    - apps/cloud-functions/src/getRuntimeConfigSections/index.test.ts
    - apps/cloud-functions/src/readRuntimeConfig/index.ts
    - apps/cloud-functions/src/readRuntimeConfig/index.test.ts
    - apps/cloud-functions/src/upsertRuntimeConfigSection/index.ts
    - apps/cloud-functions/src/upsertRuntimeConfigSection/index.test.ts
    - apps/cloud-functions/config/collections/runtime_configs.json
    - apps/cloud-functions/config/indexes/runtime_configs.index.json
  modified:
    - apps/cloud-functions/src/shared/payment-store.ts
    - .planning/phases/06-merchant-operations-and-runtime-config/06-06-SUMMARY.md
requirements-completed: [MUSR-01, MUSR-02, OPS-01]
duration: 18min
completed: 2026-04-17
---

# Phase 6 Plan 06: Merchant User and Runtime Config Backend Summary

**Merchant user search, audited balance adjustment, section-scoped runtime config admin handlers, and customer-safe runtime config reads**

## Accomplishments

- Added merchant-only user search that returns the D-19 lightweight projection and keeps phone output masked.
- Extended `payment-store` with a transaction-backed merchant balance adjustment path that writes ledger rows with `normalizedTitle` and `shortNote` for customer-safe rendering.
- Added merchant-only runtime config section query/save handlers plus a separate `readRuntimeConfig` storefront read path that only exposes banner, store, custom notice, and delivery rule data.
- Added collection and index config for `runtime_configs`.

## Task Commits

1. **Task 1: Implement merchant user search and audited balance adjustment handlers**
   `2f1ffcb` (feat)
2. **Task 2: Implement merchant-only runtime config admin handlers plus customer-safe storefront reads**
   `2f1ffcb` (feat)

## Decisions Made

- Customer-facing ledger text is derived from adjustment reason/action in the backend (`normalizedTitle` + `shortNote`) instead of leaking the full internal note.
- Runtime config admin handlers stay merchant-auth only, while storefront reads intentionally bypass merchant auth and return a fixed safe projection.
- Runtime config persistence remains one section document per key, keyed by `sectionId`.

## Deviations from Plan

None.

## Verification

- `pnpm --filter @xiaipet/cloud-functions test -- searchMerchantUsers adjustUserBalance`
- `pnpm --filter @xiaipet/cloud-functions test -- getRuntimeConfigSections readRuntimeConfig upsertRuntimeConfigSection`
- `rg -n "assertMerchantAccess" apps/cloud-functions/src/searchMerchantUsers/index.ts apps/cloud-functions/src/adjustUserBalance/index.ts apps/cloud-functions/src/getRuntimeConfigSections/index.ts apps/cloud-functions/src/upsertRuntimeConfigSection/index.ts`
- `rg -n "readRuntimeConfig|banner|customNotice|deliveryRules|store" apps/cloud-functions/src/readRuntimeConfig/index.ts`
- `rg -n "normalizedTitle|shortNote|reasonType|targetBalance" apps/cloud-functions/src/shared/payment-store.ts apps/cloud-functions/src/adjustUserBalance/index.ts`

## Self-Check: PASSED

- Found commit: `2f1ffcb`
- Merchant user, balance adjustment, and runtime config tests all passed with the final handler set.
- `payment-store` now persists customer-safe ledger presentation fields, and runtime config IO clearly separates merchant admin writes from storefront reads.

---
*Phase: 06-merchant-operations-and-runtime-config*  
*Completed: 2026-04-17*
