---
phase: 7
slug: node-api-foundation-and-ecs-deployment-runway
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-11
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `apps/api/vitest.config.ts` |
| **Quick run command** | `pnpm --filter @xiaipet/api test` |
| **Full suite command** | `pnpm --filter @xiaipet/api typecheck && pnpm --filter @xiaipet/api test && pnpm --filter @xiaipet/api build` |
| **Estimated runtime** | ~30 seconds after dependencies are installed |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @xiaipet/api test` when the API package exists.
- **After every plan wave:** Run `pnpm --filter @xiaipet/api typecheck && pnpm --filter @xiaipet/api test && pnpm --filter @xiaipet/api build`.
- **Before `$gsd-verify-work`:** Full suite must be green.
- **Max feedback latency:** 60 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | BE-01, BE-05 | T7-01 | Health endpoint exposes no secrets | unit | `pnpm --filter @xiaipet/api test` | ❌ W0 | ⬜ pending |
| 07-02-01 | 02 | 1 | BE-03 | T7-02 | Invalid config fails closed | unit | `pnpm --filter @xiaipet/api test` | ❌ W0 | ⬜ pending |
| 07-03-01 | 03 | 2 | BE-02 | T7-03 | Compose uses env files, not committed secrets | static/manual | `docker compose config` | ❌ W0 | ⬜ pending |
| 07-04-01 | 04 | 2 | BE-04 | T7-04 | Runbook avoids printing secrets | manual | `sed -n '1,220p' docs/release/alibaba-ecs-api.md` | ❌ W0 | ⬜ pending |
| 07-05-01 | 05 | 3 | BE-01, BE-02 | T7-05 | Root scripts exercise API checks | automated | `pnpm --filter @xiaipet/api typecheck && pnpm --filter @xiaipet/api test && pnpm --filter @xiaipet/api build` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/package.json` — package scripts exist.
- [ ] `apps/api/vitest.config.ts` — Vitest configured.
- [ ] `apps/api/src/routes/health.test.ts` — health route test exists.
- [ ] `apps/api/src/config/env.test.ts` — config validation test exists.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ECS runbook is usable by a frontend developer | BE-04 | Requires human readability review | Read `docs/release/alibaba-ecs-api.md` and confirm commands cover install, start, logs, restart and rollback |
| Docker Compose is production-safe | BE-02, BE-03 | Docker may not be available in every local sandbox | If Docker is installed, run `docker compose config`; otherwise inspect `docker-compose.yml` for env-file usage and no literal secrets |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all MISSING references.
- [x] No watch-mode flags.
- [x] Feedback latency target < 60s.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved 2026-05-11
