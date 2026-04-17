---
phase: 6
slug: merchant-operations-and-runtime-config
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-17
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.1.2 |
| **Config file** | `apps/customer-miniapp/vitest.config.ts`, `apps/cloud-functions/vitest.config.ts`, `packages/shared/vitest.config.ts`, `apps/merchant-miniapp/vitest.config.ts` |
| **Quick run command** | Use the narrowest plan-local command from the verification map below |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~20-25 seconds for a plan-local verify |

---

## Sampling Rate

- **After every task commit:** Run the exact plan-local command from the verification map, not the whole package suite.
- **After every plan wave:** Run `pnpm test`
- **Before `$gsd-verify-work`:** Full suite must be green, plus manual merchant-miniapp verification in WeChat DevTools
- **Max feedback latency:** 25 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | MORD-01 / MORD-02 | T-06-01-01 | Shared fulfillment contract preserves payment semantics while adding audited manual settlement | unit | `pnpm --filter @xiaipet/shared test -- order-fulfillment` | ✅ | ⬜ pending |
| 06-01-02 | 01 | 1 | MORD-01 | T-06-01-02 | Merchant harness and customer order labels share one status helper | unit | `pnpm --filter @xiaipet/merchant-miniapp test -- harness-smoke && pnpm --filter @xiaipet/customer-miniapp test -- orders` | ✅ | ⬜ pending |
| 06-02-01 | 02 | 1 | MCAT-01 | T-06-02-01 | Category schema requires name + icon token and delete-preflight metadata | unit | `pnpm --filter @xiaipet/shared test -- catalog-admin` | ✅ | ⬜ pending |
| 06-02-02 | 02 | 1 | MPRD-01 / MPRD-02 | T-06-02-02 | Product pricing helper enforces auto-sum and override rules | unit | `pnpm --filter @xiaipet/shared test -- product-pricing` | ✅ | ⬜ pending |
| 06-03-01 | 03 | 1 | MUSR-01 / MUSR-02 | T-06-03-01 | User-admin schema enforces audited balance payloads and non-negative outcomes | unit | `pnpm --filter @xiaipet/shared test -- user-admin` | ✅ | ⬜ pending |
| 06-03-02 | 03 | 1 | OPS-01 | T-06-03-02 | Runtime config schema locks fixed-key sections and delivery tiers | unit | `pnpm --filter @xiaipet/shared test -- runtime-config` | ✅ | ⬜ pending |
| 06-04-01 | 04 | 2 | MORD-01 | T-06-04-01 | Merchant order list/detail remain backend-only and grouped by fulfillment progress | integration | `pnpm --filter @xiaipet/cloud-functions test -- queryMerchantOrders getMerchantOrderDetail` | ✅ | ⬜ pending |
| 06-04-02 | 04 | 2 | MORD-02 | T-06-04-02 | Status mutation enforces transition rules and terminal locks | integration | `pnpm --filter @xiaipet/cloud-functions test -- updateMerchantOrderStatus` | ✅ | ⬜ pending |
| 06-05-01 | 05 | 2 | MCAT-01 | T-06-05-01 | Category CRUD persists icon token and blocks delete with linked products | integration | `pnpm --filter @xiaipet/cloud-functions test -- queryCategories upsertCategory` | ✅ | ⬜ pending |
| 06-05-02 | 05 | 2 | MPRD-01 / MPRD-02 | T-06-05-02 | Product CRUD validates base info, pricing, and publish settings | integration | `pnpm --filter @xiaipet/cloud-functions test -- queryProducts upsertProduct` | ✅ | ⬜ pending |
| 06-06-01 | 06 | 2 | MUSR-01 / MUSR-02 | T-06-06-01 | User search and balance adjustment stay backend-only and ledger-safe | integration | `pnpm --filter @xiaipet/cloud-functions test -- searchMerchantUsers adjustUserBalance` | ✅ | ⬜ pending |
| 06-06-02 | 06 | 2 | OPS-01 | T-06-06-03 | Runtime config reads and section saves remain fixed-key and fileID-safe | integration | `pnpm --filter @xiaipet/cloud-functions test -- getRuntimeConfigSections upsertRuntimeConfigSection` | ✅ | ⬜ pending |
| 06-07-01 | 07 | 3 | MORD-01 / MORD-02 | T-06-07-01 | Merchant order pages consume Cloud Function data and shared status labels | view-model + page | `pnpm --filter @xiaipet/merchant-miniapp test -- merchant-orders` | ✅ | ⬜ pending |
| 06-08-01 | 08 | 3 | MCAT-01 / MPRD-01 / MPRD-02 | T-06-08-01 | Category/product merchant UI keeps icon token and three-step editor rules visible | view-model + page | `pnpm --filter @xiaipet/merchant-miniapp test -- catalog-admin` | ✅ | ⬜ pending |
| 06-09-01 | 09 | 3 | MUSR-01 / MUSR-02 | T-06-09-01 | Merchant user pages keep search lightweight and adjustment flow confirmed | view-model + page | `pnpm --filter @xiaipet/merchant-miniapp test -- user-admin` | ✅ | ⬜ pending |
| 06-10-01 | 10 | 3 | OPS-01 | T-06-10-01 | Merchant runtime-config page keeps section saves isolated | view-model + page | `pnpm --filter @xiaipet/merchant-miniapp test -- runtime-config-admin` | ✅ | ⬜ pending |
| 06-10-02 | 10 | 3 | OPS-01 | T-06-10-02 | Customer home/checkout consume saved runtime config | integration + view-model | `pnpm --filter @xiaipet/customer-miniapp test -- runtime-config cart-checkout` | ✅ | ⬜ pending |
| 06-11-01 | 11 | 4 | MORD-01 / MCAT-01 / MUSR-01 / OPS-01 | T-06-11-01 | Merchant workspace and registration shell expose all Phase 06 modules | page + config | `pnpm --filter @xiaipet/merchant-miniapp test -- workspace` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `apps/merchant-miniapp/vitest.config.ts` planned in 06-01 so later merchant UI plans have a real targeted runner
- [x] Shared contract coverage is split into focused suites: `order-fulfillment`, `catalog-admin`, `product-pricing`, `user-admin`, `runtime-config`
- [x] Cloud-function coverage is created in the same plans that modify those handlers, so no plan relies on a later green-status task
- [x] Customer parity/runtime wiring tests are attached to the plans that change those surfaces

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Merchant workspace card navigation and permission gate | MORD-01 / OPS-01 | Requires real miniapp navigation and whitelist account in WeChat DevTools | Open merchant miniapp, pass access gate, confirm dashboard cards route to orders, catalog, users, runtime config |
| Store location picking and preview | OPS-01 | Depends on native `wx.chooseLocation` / `wx.openLocation` flows | In merchant runtime config, pick a store location, save, reopen config, and verify coordinates plus customer-side map preview |
| Product image/banner upload preview | MPRD-01 / OPS-01 | Cloud storage upload and temp URL preview are integration-heavy | Upload a product image and a homepage banner, save, reopen pages, and confirm preview still resolves from stored `fileID` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all required test harness/setup work
- [x] No watch-mode flags
- [x] Feedback latency <= 25 seconds for task-level verifies
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
