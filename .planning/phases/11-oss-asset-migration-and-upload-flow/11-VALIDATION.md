---
phase: 11
slug: oss-asset-migration-and-upload-flow
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-11
---

# Phase 11 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + TypeScript compiler |
| **Config file** | `apps/api/vitest.config.ts`, miniapp package vitest configs, package tsconfigs |
| **Quick run command** | `pnpm --filter @xiaipet/api test -- src/modules/assets src/routes/merchant-assets.routes.test.ts` |
| **Full suite command** | `pnpm --filter @xiaipet/api test && pnpm --filter @xiaipet/shared test && pnpm --filter @xiaipet/merchant-miniapp test && pnpm --filter @xiaipet/customer-miniapp test` |
| **Estimated runtime** | ~90 seconds |

---

## Sampling Rate

- **After every task commit:** Run the task-specific command in the plan `<verify>` block.
- **After every plan wave:** Run the full suite command for packages touched in that wave.
- **Before `$gsd-verify-work`:** Full API, shared, merchant miniapp, and customer miniapp suites must be green.
- **Max feedback latency:** 120 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | OSS-01 | T11-01A | OSS secret never appears in upload responses | unit | `pnpm --filter @xiaipet/api test -- src/config/env.test.ts src/modules/assets/policy.test.ts` | W0 | pending |
| 11-01-02 | 01 | 1 | OSS-01/OSS-02 | T11-01B | Asset refs validate URLs and role variants | unit | `pnpm --filter @xiaipet/shared test` | W0 | pending |
| 11-01-03 | 01 | 1 | OSS-02 | T11-01C | Product metadata persists role URLs | unit | `pnpm --filter @xiaipet/api test -- src/modules/assets/service.test.ts` | W0 | pending |
| 11-01-04 | 01 | 1 | OSS-01/OSS-02 | T11-01D | Schema client regenerated after asset columns | cli | `pnpm --filter @xiaipet/api db:generate && pnpm --filter @xiaipet/api typecheck` | W0 | pending |
| 11-02-01 | 02 | 2 | OSS-01 | T11-02A | Denied merchants cannot get upload policy | route | `pnpm --filter @xiaipet/api test -- src/routes/merchant-assets.routes.test.ts` | W0 | pending |
| 11-02-02 | 02 | 2 | OSS-01/OSS-02 | T11-02B | Miniapp uploads with policy then confirms | unit | `pnpm --filter @xiaipet/merchant-miniapp test -- src/services/assets.test.ts src/services/catalog-admin.test.ts` | W0 | pending |
| 11-02-03 | 02 | 2 | OSS-02 | T11-02C | Role crop/compress applies concrete limits | unit | `pnpm --filter @xiaipet/merchant-miniapp test -- src/services/assets.test.ts` | W0 | pending |
| 11-03-01 | 03 | 2 | OSS-03 | T11-03A | Migration is report-first and idempotent | unit | `pnpm --filter @xiaipet/api test -- src/modules/migration/asset-reference-migration.test.ts` | W0 | pending |
| 11-04-01 | 04 | 3 | OSS-02 | T11-04A | Customer list/banner reads lightweight OSS URLs | unit | `pnpm --filter @xiaipet/customer-miniapp test -- src/services/catalog.test.ts src/services/runtime-config.test.ts` | W0 | pending |
| 11-04-02 | 04 | 3 | OSS-01/OSS-02 | T11-04B | Runtime banner upload uses asset flow | unit | `pnpm --filter @xiaipet/merchant-miniapp test -- src/services/runtime-config-admin.test.ts src/services/assets.test.ts` | W0 | pending |
| 11-04-03 | 04 | 3 | OSS-01/OSS-02/OSS-03 | T11-04C | Docs cover bucket/CORS/domain/cost behavior | grep | `rg "OSS bucket|CORS|uploadFile|legal upload domain|thumbnailUrl" docs/release/cloudbase-and-miniapp.md` | W0 | pending |

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. New tests are added in each plan before implementation changes.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real OSS bucket CORS and WeChat legal domain settings | OSS-01/OSS-02 | Requires Alibaba Cloud console and WeChat admin account/domain备案 state | Follow release docs after Phase 11; verify `wx.uploadFile` to OSS succeeds in WeChat DevTools and on device. |
| Live CloudBase file byte copy | OSS-03 | Current data is fake and source files may not exist | Run the migration report first; only run copy mode when a valid local export/source map is available. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all missing references.
- [x] No watch-mode flags.
- [x] Feedback latency < 120s.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved 2026-05-11
