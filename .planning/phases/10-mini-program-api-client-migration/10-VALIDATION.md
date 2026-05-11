---
phase: 10
slug: mini-program-api-client-migration
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-11
---

# Phase 10 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

## Test Infrastructure

| Property | Value |
|----------|-------|
| Framework | Vitest |
| Config files | `apps/customer-miniapp/vitest.config.ts`, `apps/merchant-miniapp/vitest.config.ts` |
| Quick run command | `pnpm --filter @xiaipet/customer-miniapp test -- src/services/api-client.test.ts && pnpm --filter @xiaipet/merchant-miniapp test -- src/services/api-client.test.ts` |
| Full suite command | `pnpm --filter @xiaipet/customer-miniapp test && pnpm --filter @xiaipet/merchant-miniapp test` |
| Estimated runtime | ~60 seconds |

## Sampling Rate

- After every task commit: run the focused test named in the task.
- After every plan wave: run the full test command for the affected miniapp.
- Before `$gsd-verify-work`: both miniapp full suites, typecheck, and build must be green.
- Max feedback latency: 60 seconds for focused service tests.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | MP-01, MP-03 | T10-01A | Customer token stored locally and sent as bearer token | unit | `pnpm --filter @xiaipet/customer-miniapp test -- src/services/api-client.test.ts` | yes | pending |
| 10-01-02 | 01 | 1 | MP-01, MP-04 | T10-01B | Customer auth/profile calls never send trusted openid | unit | `pnpm --filter @xiaipet/customer-miniapp test -- src/services/auth.test.ts` | yes | pending |
| 10-01-03 | 01 | 1 | MP-01, MP-04 | - | Catalog/runtime config use HTTP-backed hydration with fallback cache | unit | `pnpm --filter @xiaipet/customer-miniapp test -- src/services/catalog.test.ts src/services/runtime-config.test.ts` | yes | pending |
| 10-02-01 | 02 | 2 | MP-01, MP-04 | T10-02A | Order create/pay/list/detail use authenticated API requests | unit | `pnpm --filter @xiaipet/customer-miniapp test -- src/services/order-submit.test.ts src/services/orders.test.ts` | yes | pending |
| 10-02-02 | 02 | 2 | MP-04 | - | Checkout and order pages continue critical flows | page regression | `pnpm --filter @xiaipet/customer-miniapp test -- pages/cart-checkout.test.ts pages/orders-flow.test.ts` | yes | pending |
| 10-03-01 | 03 | 1 | MP-02, MP-03 | T10-03A | Merchant token flow sends bearer token and handles 403 | unit | `pnpm --filter @xiaipet/merchant-miniapp test -- src/services/api-client.test.ts src/services/access.test.ts` | yes | pending |
| 10-03-02 | 03 | 2 | MP-02, MP-05 | T10-03B | Merchant order routes require merchant session and map status payloads | unit | `pnpm --filter @xiaipet/merchant-miniapp test -- src/services/orders.test.ts` | yes | pending |
| 10-04-01 | 04 | 3 | MP-02, MP-05 | T10-04A | Merchant admin and balance calls use HTTP paths and bearer auth | unit | `pnpm --filter @xiaipet/merchant-miniapp test -- src/services/catalog-admin.test.ts src/services/user-admin.test.ts` | yes | passed |
| 10-04-02 | 04 | 3 | MP-02, MP-05 | T10-04B | Runtime config and receipt printing audit use HTTP routes | unit | `pnpm --filter @xiaipet/merchant-miniapp test -- src/services/runtime-config-admin.test.ts src/services/order-receipt-print.test.ts` | yes | passed |
| 10-05-01 | 05 | 4 | MP-03, MP-04, MP-05 | - | Base URL config and generated JS output are verified | full suite | `pnpm --filter @xiaipet/customer-miniapp typecheck && pnpm --filter @xiaipet/customer-miniapp test && pnpm --filter @xiaipet/customer-miniapp build && pnpm --filter @xiaipet/merchant-miniapp typecheck && pnpm --filter @xiaipet/merchant-miniapp test && pnpm --filter @xiaipet/merchant-miniapp build` | yes | passed |

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. Add `api-client.test.ts` files in Plan 10-01 and Plan 10-03 before migrating dependent services.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| WeChat legal request domain | MP-03 | ICP filing and production WeChat domain configuration are outside this phase | Confirm Phase 12 docs cover `https://api.xiaipet.vip` legal domain setup |
| Real OSS-backed image upload | MP-05 | OSS migration is Phase 11 | Confirm merchant product image upload remains isolated and marked Phase 11 if not functional |

## Validation Sign-Off

- [x] All tasks have automated verify commands.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all missing client test references.
- [x] No watch-mode flags.
- [x] Feedback latency target is under 60 seconds for focused tests.
- [x] `nyquist_compliant: true` set in frontmatter.

Approval: approved 2026-05-11
