---
phase: 12-production-cutover-security-and-regression-verification
plan: 12-03
subsystem: release-verification
tags: [ecs, rds, oss, smoke-checks, cors, production-cutover]

requires:
  - phase: 12-01
    provides: ECS Docker Compose, Nginx, HTTPS and WeChat legal-domain runway.
  - phase: 12-02
    provides: Production auth hardening and safe health diagnostics contract.
provides:
  - Local API smoke checklist with typecheck, tests and build commands.
  - ECS post-deploy smoke checklist for Docker, logs, local/public health and Nginx syntax.
  - Production RDS smoke gate with backup confirmation and non-destructive migration verification.
  - Production OSS smoke and CORS checklist for mini program upload/display readiness.
affects: [phase-12, production-cutover, ecs-deployment, rds-migration, oss-assets, miniapp-release]

tech-stack:
  added: []
  patterns:
    - Group release smoke checks by where they run and by production gate ownership.
    - Treat production database and payment checks as gated, non-destructive manual operations.

key-files:
  created:
    - .planning/phases/12-production-cutover-security-and-regression-verification/12-03-SUMMARY.md
  modified:
    - docs/release/alibaba-ecs-api.md
    - docs/release/alibaba-rds.md
    - apps/api/docs/oss-assets.md

key-decisions:
  - "Default production smoke checks are read-only; write/payment checks require a separate manual test window and safe test data."
  - "RDS production verification requires backup confirmation and forbids destructive Prisma reset commands."
  - "OSS production readiness requires both CORS compatibility for wx.uploadFile and WeChat legal-domain readiness for asset display."

patterns-established:
  - "Release docs should include expected pass output for every smoke command."
  - "Committed docs may include real non-secret Alibaba resource identifiers, but passwords and AccessKeySecret values remain placeholders or omitted."

requirements-completed: [VER-02, VER-03, DEP-05]

duration: 8min
completed: 2026-05-12
---

# Phase 12 Plan 12-03: Local ECS RDS and OSS Smoke Verification Checklist Summary

**Cutover smoke runbooks now cover local API checks, ECS health checks, backup-gated RDS verification, and OSS/CORS upload readiness without exposing production secrets.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-12T07:57:25Z
- **Completed:** 2026-05-12T08:05:32Z
- **Tasks:** 3
- **Files modified:** 3 release docs plus this summary

## Accomplishments

- Added local API smoke commands for typecheck, test and build, with expected pass outcomes.
- Added ECS post-deploy checks for `docker compose ps`, API logs, local health, public HTTPS health and `nginx -t`.
- Hardened RDS production guidance around the confirmed endpoint, `xiaipet_db`, `XiAiPet_db`, backup confirmation and non-destructive migration verification.
- Added OSS production smoke and CORS checklists for `xiaipet-assets-prod`, `wx.uploadFile`, legal-domain readiness and RAM secret handling.

## Task Commits

Each task was committed atomically:

1. **Task 12-03-01: Add local and ECS smoke checklist sections** - `8db590b` (docs)
2. **Task 12-03-02: Harden RDS production verification guidance** - `722af6d` (docs)
3. **Task 12-03-03: Add OSS production smoke and CORS checklist** - `dca8048` (docs)

## Files Created/Modified

- `docs/release/alibaba-ecs-api.md` - Local/ECS smoke checklists, expected health output and payment/ICP gating notes.
- `docs/release/alibaba-rds.md` - Production RDS endpoint/account guidance and reset prohibition.
- `apps/api/docs/oss-assets.md` - Production OSS values, upload/display smoke checks and CORS checklist.
- `.planning/phases/12-production-cutover-security-and-regression-verification/12-03-SUMMARY.md` - Execution summary.

## Decisions Made

- Kept smoke checks read-only by default to avoid mutating production orders, balances, inventory or payment state.
- Kept real secrets out of documentation; only non-secret Alibaba identifiers and angle-bracket password placeholders are documented.
- Treated ICP and payment activation as explicit gates rather than implicit release readiness.

## Deviations from Plan

None - plan scope and expected files were honored.

## Issues Encountered

- A concurrent executor committed the main RDS endpoint/gate additions before the 12-03 task commit could capture them. I did not revert or overwrite that work; the 12-03 RDS task commit adds a scoped reinforcing warning against destructive production RDS resets.
- Existing unrelated modified files remained outside this plan scope: `.planning/STATE.md`, `docs/release/cloudbase-and-miniapp.md`, and `docs/release/miniapp-regression.md`.

## Verification

- `rg -n "Local Smoke Checklist|ECS Post-Deploy Smoke Checklist|pnpm --filter @xiaipet/api test|curl https://api\\.xiaipet\\.vip/health|nginx -t" docs/release/alibaba-ecs-api.md` - PASS.
- `rg -n "rm-bp15i4u17t16iwk4t\\.mysql\\.rds\\.aliyuncs\\.com|xiaipet_db|XiAiPet_db|Production RDS Smoke Gate|Never run prisma migrate reset against RDS|Destructive production RDS resets" docs/release/alibaba-rds.md` - PASS.
- `rg -n "Production OSS Smoke Checklist|OSS_REGION=oss-cn-hangzhou|xiaipet-assets-prod|CORS Checklist|wx.uploadFile|AccessKeySecret.*never" apps/api/docs/oss-assets.md` - PASS.
- `rg -n "Smoke Checklist|Production RDS Smoke Gate|Production OSS Smoke Checklist|CORS Checklist|payment blocked|ICP" docs/release/alibaba-ecs-api.md docs/release/alibaba-rds.md apps/api/docs/oss-assets.md` - PASS.
- `rg -n "(PASSWORD|SECRET|ACCESS_KEY|APP_SECRET|SESSION_SECRET)=([^<]|$)|AccessKeySecret=|RDS_PASSWORD=[^<]" docs/release/alibaba-ecs-api.md docs/release/alibaba-rds.md apps/api/docs/oss-assets.md` - PASS, no matches.

## Known Stubs

None. Placeholder mentions in the docs are intentional secret placeholders, not incomplete implementation stubs.

## Threat Flags

None. This plan changed documentation only; it did not add network endpoints, auth paths, file access patterns or schema changes.

## User Setup Required

Production smoke execution still requires real ECS/RDS/OSS/WeChat access. ICP remains pending, and real payment acceptance remains blocked until WeChat Pay subject activation and payment credentials are ready.

## Next Phase Readiness

The local, ECS, RDS and OSS smoke instructions are ready for the remaining Phase 12 regression and cutover plans. Production release remains blocked until ICP approval, HTTPS/legal-domain verification, production secrets injection, RDS backup confirmation, OSS CORS validation and payment gate resolution.

## Self-Check: PASSED

- Found `.planning/phases/12-production-cutover-security-and-regression-verification/12-03-SUMMARY.md`.
- Found `docs/release/alibaba-ecs-api.md`.
- Found `docs/release/alibaba-rds.md`.
- Found `apps/api/docs/oss-assets.md`.
- Found task commits `8db590b`, `722af6d`, and `dca8048` in git history.

---
*Phase: 12-production-cutover-security-and-regression-verification*
*Completed: 2026-05-12*
