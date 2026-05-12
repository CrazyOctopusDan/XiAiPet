---
phase: 12-production-cutover-security-and-regression-verification
plan: 12-05
subsystem: production-cutover
tags: [cutover, rollback, cloudbase-retirement, ecs, rds, oss, miniapp-regression]

requires:
  - phase: 12-01
    provides: ECS Docker Compose, Nginx, HTTPS and WeChat legal-domain runway.
  - phase: 12-02
    provides: Production auth hardening and safe diagnostics.
  - phase: 12-03
    provides: Local, ECS, RDS and OSS smoke checklists.
  - phase: 12-04
    provides: Customer and merchant miniapp regression checklist.
provides:
  - Production cutover guide with preflight, deploy, verify, no-go and sign-off gates.
  - Conservative rollback guide that avoids destructive RDS reset.
  - CloudBase backend retirement gate tied to API, RDS, OSS, security and regression evidence.
affects: [phase-12, production-cutover, cloudbase-retirement, miniapp-release]

tech-stack:
  added: []
  patterns:
    - Production retirement gates must record blockers instead of implying launch readiness.
    - Rollback defaults to app/source/container recovery; RDS restore requires a separate manual decision.

key-files:
  created:
    - docs/release/production-cutover.md
    - .planning/phases/12-production-cutover-security-and-regression-verification/12-05-SUMMARY.md
  modified:
    - docs/release/cloudbase-and-miniapp.md
    - .planning/PROJECT.md

key-decisions:
  - "CloudBase backend dependency is not retired until API HTTPS health, RDS, OSS, security, customer regression and merchant regression gates have evidence."
  - "Production payment and legal-domain readiness remain blocked until ICP/legal-domain approval and real WeChat Pay activation/callback verification are complete."
  - "Rollback does not include destructive RDS reset; database restore is a separate manual decision."

patterns-established:
  - "Final release docs separate technical cutover readiness from external ICP and payment launch gates."
  - "Project decision outcomes can remain pending when implementation evidence exists but production evidence is not yet recorded."

requirements-completed: [DEP-01, DEP-02, DEP-03, DEP-04, DEP-05, VER-01, VER-02, VER-03, VER-04]

duration: 11min
completed: 2026-05-12
---

# Phase 12 Plan 12-05: Production Cutover Rollback and CloudBase Retirement Gate Summary

**Production cutover and rollback docs now gate CloudBase backend retirement on API, RDS, OSS, security and dual-miniapp regression evidence while preserving ICP and payment blockers.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-05-12T08:13:54Z
- **Completed:** 2026-05-12T08:24:52Z
- **Tasks:** 3
- **Files modified:** 3 planned files plus this summary

## Accomplishments

- Created `docs/release/production-cutover.md` with explicit preflight, deploy, verify, no-go and sign-off gates.
- Added rollback commands for the API service and documented that RDS reset is prohibited during rollback.
- Added the CloudBase Backend Retirement Gate to both release docs and updated `.planning/PROJECT.md` without overstating production readiness.
- Recorded that `api.xiaipet.vip` DNS points to ECS, while ICP/legal-domain approval and real WeChat Pay remain blockers.

## Task Commits

Each task was committed atomically:

1. **Task 12-05-01: Write production cutover guide with preflight and no-go gates** - `9cc3c16` (docs)
2. **Task 12-05-02: Add conservative rollback guide** - `10667ca` (docs)
3. **Task 12-05-03: Record CloudBase retirement gate and update project status** - `1274a24` (docs)

## Files Created/Modified

- `docs/release/production-cutover.md` - Final cutover, verification, rollback, no-go, sign-off and CloudBase retirement gate.
- `docs/release/cloudbase-and-miniapp.md` - CloudBase backend retirement gate and current ICP/payment blockers.
- `.planning/PROJECT.md` - Conservative project decision outcomes that keep production evidence and external blockers pending.
- `.planning/phases/12-production-cutover-security-and-regression-verification/12-05-SUMMARY.md` - Execution summary.

## Decisions Made

- Kept Docker Compose, RDS, OSS and `https://api.xiaipet.vip` project outcomes pending because production evidence is still gated by ECS/RDS/OSS/manual checks and ICP/legal-domain approval.
- Treated CloudBase source deletion as a later cleanup action, not part of dependency retirement.
- Kept real WeChat Pay out of production readiness until subject/payment activation, API v3 key, cert/private key handling and callback verification are complete.

## Deviations from Plan

None - plan tasks executed as written.

## Execution Notes

- `.planning/STATE.md` had an unrelated pre-existing modification before and after this plan. It was not edited, staged or committed.
- Generic GSD state, roadmap and requirements update steps were skipped because the user explicitly said the orchestrator owns `.planning/STATE.md` and `.planning/ROADMAP.md`, and this plan scope only allowed `.planning/PROJECT.md`.
- `.planning/PROJECT.md` is ignored by git, so it was staged as the one allowed planning file.

## Verification

- `rg -n "Preflight|Deploy|Verify|No-Go Criteria|Sign-Off|RDS backup|api\\.xiaipet\\.vip/health|merchant login|customer login" docs/release/production-cutover.md` - PASS.
- `rg -n "git checkout <previous-good-commit>|docker compose up -d --build api|Database Rollback Policy|Do not run prisma migrate reset against RDS" docs/release/production-cutover.md` - PASS.
- `rg -n "CloudBase Backend Retirement Gate|API HTTPS health|RDS migration|OSS upload|customer regression|merchant regression|payment gate" docs/release/cloudbase-and-miniapp.md docs/release/production-cutover.md` - PASS.
- `rg -n "Preflight|Rollback|CloudBase Backend Retirement Gate|No-Go Criteria|payment gate" docs/release/production-cutover.md docs/release/cloudbase-and-miniapp.md` - PASS.
- `source ~/.nvm/nvm.sh && pnpm --filter @xiaipet/api test` - PASS, 21 test files / 46 tests.
- `source ~/.nvm/nvm.sh && pnpm --filter @xiaipet/customer-miniapp test` - PASS, 17 test files / 103 tests.
- `source ~/.nvm/nvm.sh && pnpm --filter @xiaipet/merchant-miniapp test` - PASS, 11 test files / 46 tests.

## Known Stubs

None. Stub scan found no `TODO`, `FIXME`, placeholder, coming soon, not available, or empty hardcoded UI data patterns in the modified files.

## Threat Flags

None. This plan changed release and planning documentation only; it did not add network endpoints, auth paths, file access patterns or schema changes.

## Blockers

- ICP/legal-domain approval is still pending; production mini program legal-domain readiness is not complete.
- Real WeChat Pay remains blocked until customer miniapp subject/payment activation plus API v3 key, certificate/private key handling and callback verification are ready.
- RDS production backup/migration verification, OSS CORS/upload/display, ECS HTTPS health and manual customer/merchant regression still need recorded production evidence before CloudBase backend dependency retirement.

## User Setup Required

No new setup file was generated. Operators should follow `docs/release/production-cutover.md`, `docs/release/alibaba-ecs-api.md`, `docs/release/alibaba-rds.md`, `apps/api/docs/oss-assets.md` and `docs/release/miniapp-regression.md` during production cutover.

## Next Phase Readiness

Phase 12 plan execution is complete from the documentation and local automated verification side. Production cutover still depends on the explicit gates above; the docs intentionally do not claim production payment or legal-domain readiness.

## Self-Check: PASSED

- Found `docs/release/production-cutover.md`.
- Found `docs/release/cloudbase-and-miniapp.md`.
- Found `.planning/PROJECT.md`.
- Found `.planning/phases/12-production-cutover-security-and-regression-verification/12-05-SUMMARY.md`.
- Found task commits `9cc3c16`, `10667ca` and `1274a24` in git history.

---
*Phase: 12-production-cutover-security-and-regression-verification*
*Completed: 2026-05-12*
