---
phase: 8
slug: mysql-data-model-and-migration-pipeline
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-11
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + Prisma CLI + local MySQL 8 |
| **Config file** | `apps/api/vitest.config.ts`, `apps/api/prisma.config.ts` |
| **Quick run command** | `pnpm --filter @xiaipet/api test` |
| **Full suite command** | `pnpm --filter @xiaipet/api typecheck && pnpm --filter @xiaipet/api test && pnpm --filter @xiaipet/api build` |
| **Estimated runtime** | ~60 seconds without Docker MySQL; ~180 seconds with local MySQL migrations |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @xiaipet/api test`
- **After every plan wave:** Run `pnpm --filter @xiaipet/api typecheck && pnpm --filter @xiaipet/api test && pnpm --filter @xiaipet/api build`
- **Before `$gsd-verify-work`:** Full suite plus DB commands must be green where Docker/MySQL is available
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | DB-01 | T8-01 | No secrets in Prisma config | static/type | `pnpm --filter @xiaipet/api typecheck` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | DB-01, DB-02 | T8-01 | Schema includes required models and constraints | static | `rg "model User|model Order|Json|Decimal" apps/api/prisma/schema.prisma` | ❌ W0 | ⬜ pending |
| 08-02-01 | 02 | 1 | DB-01 | T8-02 | Local DB uses placeholders only | config | `docker compose -f docker-compose.dev.yml config` | ❌ W0 | ⬜ pending |
| 08-02-02 | 02 | 1 | DB-01 | T8-02 | Seed uses non-secret local data | cli | `pnpm --filter @xiaipet/api db:seed` | ❌ W0 | ⬜ pending |
| 08-03-01 | 03 | 2 | DB-03 | T8-03 | Transactions wrap sensitive writes | unit/integration | `pnpm --filter @xiaipet/api test` | ❌ W0 | ⬜ pending |
| 08-04-01 | 04 | 3 | DB-04 | T8-04 | Importer is idempotent and reports changes | cli/test | `pnpm --filter @xiaipet/api db:verify` | ❌ W0 | ⬜ pending |
| 08-05-01 | 05 | 4 | DB-01, DB-04 | T8-05 | RDS docs avoid real credentials | docs/static | `rg "DATABASE_URL|migrate deploy|backup" docs/release/alibaba-rds.md` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/prisma/schema.prisma` — required before Prisma commands can run
- [ ] `apps/api/prisma.config.ts` — required before Prisma CLI can resolve `DATABASE_URL`
- [ ] `docker-compose.dev.yml` or equivalent local MySQL profile — required before local DB verification can run
- [ ] `apps/api/scripts/verify-data.ts` — required before Phase 8 final verification

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Alibaba Cloud RDS backup settings | DB-01 | Requires console/server access outside repo | Follow `docs/release/alibaba-rds.md` backup checklist against the actual RDS instance |
| Docker availability | DB-01 | Current local environment may not have Docker installed | Run `docker compose version`; if absent, execute local DB steps on ECS/dev machine with Docker |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 180s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-11
