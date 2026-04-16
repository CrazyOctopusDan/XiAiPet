---
phase: 01
slug: foundation-and-cloud-boundary
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-16
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + workspace lint/typecheck |
| **Config file** | `vitest.config.ts` / workspace package scripts (Wave 0 installs) |
| **Quick run command** | `pnpm -r typecheck` |
| **Full suite command** | `pnpm -r lint && pnpm -r typecheck && pnpm --filter @xiaipet/shared test` |
| **Estimated runtime** | ~30-90 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm -r typecheck`
- **After every plan wave:** Run `pnpm -r lint && pnpm -r typecheck && pnpm --filter @xiaipet/shared test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | AUTH-01 | T-01-01 / — | Workspace and shared package boundaries are explicit | smoke | `test -f pnpm-workspace.yaml` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | AUTH-01 | T-01-02 | Sensitive collections are not front-end writable by default | smoke | `rg -n "orders|balance|merchant" apps/cloud-functions packages/shared` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 1 | AUTH-01, AUTH-02 | T-01-03 | Bootstrap flow creates only minimal user core record | unit/smoke | `pnpm --filter @xiaipet/shared test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `pnpm-workspace.yaml` — workspace package discovery
- [ ] root `package.json` — workspace scripts for `lint`, `typecheck`, `test`
- [ ] `tsconfig.base.json` — shared TypeScript baseline
- [ ] `packages/shared/vitest.config.ts` or equivalent test setup
- [ ] `packages/shared/src/**/*.test.ts` — stubs for schema and pure-rule verification

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CloudBase `dev` / `prod` environment mapping is correct | AUTH-01 | Requires checking actual cloud console config and environment IDs | Verify local/dev scripts point to `dev`, and release instructions require explicit `prod` target |
| Real merchant identity is denied when not on whitelist | AUTH-01 | Requires real or staged CloudBase identity context | Use a non-whitelisted account in `dev` and confirm merchant entry is rejected |
| Sensitive files are not reintroduced into app folders | AUTH-01 | Requires repo inspection beyond unit tests | Inspect `apps/` and release scripts for `.key`, `appSecret`, or equivalent secrets |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
