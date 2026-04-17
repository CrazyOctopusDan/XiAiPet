---
phase: 6
slug: merchant-operations-and-runtime-config
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-17
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.1.2 |
| **Config file** | `apps/customer-miniapp/vitest.config.ts`, `apps/cloud-functions/vitest.config.ts`, `packages/shared/vitest.config.ts`, `none — Wave 0 installs for merchant-miniapp` |
| **Quick run command** | `pnpm --filter @xiaipet/cloud-functions test` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @xiaipet/shared test` or `pnpm --filter @xiaipet/cloud-functions test`, whichever package changed
- **After every plan wave:** Run `pnpm test`
- **Before `$gsd-verify-work`:** Full suite must be green, plus manual merchant-miniapp verification in WeChat DevTools
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | MORD-01 | T-06-01 | Merchant order query stays behind Cloud Functions and returns grouped merchant-safe order view | integration | `pnpm --filter @xiaipet/cloud-functions test` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | MORD-02 | T-06-02 | Fulfillment transitions enforce terminal locks and append audit timeline entries | integration | `pnpm --filter @xiaipet/cloud-functions test` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 1 | MCAT-01 | T-06-03 | Category delete is blocked while products still reference the category | unit + integration | `pnpm --filter @xiaipet/cloud-functions test` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 1 | MPRD-01 | T-06-04 | Product base info validates fields, assets, and fulfillment modes before persistence | unit + integration | `pnpm --filter @xiaipet/shared test` | ❌ W0 | ⬜ pending |
| 06-02-03 | 02 | 1 | MPRD-02 | T-06-05 | Spec/formula pricing rules validate auto-sum and manual override paths | unit + integration | `pnpm --filter @xiaipet/shared test` | ❌ W0 | ⬜ pending |
| 06-03-01 | 03 | 1 | MUSR-01 | T-06-06 | Merchant user search remains backend-only and only returns whitelisted fields | integration | `pnpm --filter @xiaipet/cloud-functions test` | ❌ W0 | ⬜ pending |
| 06-03-02 | 03 | 1 | MUSR-02 | T-06-07 | Balance adjustment updates account and ledger atomically with operator metadata | integration | `pnpm --filter @xiaipet/cloud-functions test` | ❌ W0 | ⬜ pending |
| 06-03-03 | 03 | 1 | OPS-01 | T-06-08 | Runtime config section saves are isolated, auditable, and storefront-consumable | integration + view-model | `pnpm --filter @xiaipet/shared test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/merchant-miniapp/vitest.config.ts` — merchant view-model/page test harness
- [ ] `apps/cloud-functions/src/queryMerchantOrders/index.test.ts` — MORD-01 coverage
- [ ] `apps/cloud-functions/src/updateMerchantOrderStatus/index.test.ts` — MORD-02 coverage
- [ ] `apps/cloud-functions/src/queryCategories/index.test.ts` and `upsertCategory/index.test.ts` — MCAT-01 coverage
- [ ] `apps/cloud-functions/src/queryProducts/index.test.ts` and `upsertProduct/index.test.ts` — MPRD-01 / MPRD-02 coverage
- [ ] `apps/cloud-functions/src/searchMerchantUsers/index.test.ts` — MUSR-01 coverage
- [ ] `apps/cloud-functions/src/adjustUserBalance/index.test.ts` — MUSR-02 coverage
- [ ] `apps/cloud-functions/src/getRuntimeConfigSections/index.test.ts` and `upsertRuntimeConfigSection/index.test.ts` — OPS-01 coverage
- [ ] `packages/shared/src/schema/merchant-order.test.ts`, `product-admin.test.ts`, `runtime-config-section.test.ts` — new shared contract coverage
- [ ] `apps/customer-miniapp/src/services/orders.test.ts` extension — customer-facing labels reflect merchant fulfillment state

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Merchant workspace card navigation and permission gate | MORD-01 / OPS-01 | Requires real miniapp navigation and whitelist account in WeChat DevTools | Open merchant miniapp, pass access gate, confirm dashboard cards route to orders, catalog, users, runtime config |
| Store location picking and preview | OPS-01 | Depends on native `wx.chooseLocation` / `wx.openLocation` flows | In merchant runtime config, pick a store location, save, reopen config, and verify coordinates plus customer-side map preview |
| Product image/banner upload preview | MPRD-01 / OPS-01 | Cloud storage upload and temp URL preview are integration-heavy | Upload a product image and a homepage banner, save, reopen pages, and confirm preview still resolves from stored `fileID` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
