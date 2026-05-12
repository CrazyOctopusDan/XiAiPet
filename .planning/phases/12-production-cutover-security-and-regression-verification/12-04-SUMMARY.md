---
phase: 12-production-cutover-security-and-regression-verification
plan: 12-04
subsystem: release-verification
tags: [miniapp-regression, customer-miniapp, merchant-miniapp, vitest, production-blockers]

requires:
  - phase: 10-mini-program-api-client-migration
    provides: Customer and merchant miniapp HTTP API clients and regression tests.
  - phase: 11-oss-asset-migration-and-upload-flow
    provides: OSS asset display and merchant upload behavior.
  - phase: 12-production-cutover-security-and-regression-verification
    provides: Split customer and merchant WeChat login credentials from 12-02.
provides:
  - Customer miniapp critical workflow regression checklist.
  - Merchant miniapp critical workflow regression checklist with safe test user/order constraints.
  - Automated regression command list and explicit ICP/payment production blockers.
affects: [phase-12, production-cutover, miniapp-release, regression-verification]

tech-stack:
  added: []
  patterns:
    - Release regression docs pair automated Vitest references with manual WeChat DevTools checks.
    - Payment verification is split between mock/dev payment path and blocked real WeChat Pay gate.

key-files:
  created:
    - docs/release/miniapp-regression.md
    - .planning/phases/12-production-cutover-security-and-regression-verification/12-04-SUMMARY.md
  modified:
    - docs/release/cloudbase-and-miniapp.md

key-decisions:
  - "Use docs/release/miniapp-regression.md as the Phase 12 miniapp regression source of truth."
  - "Keep real WeChat Pay and ICP/legal-domain readiness as explicit blockers, not completed checks."
  - "Merchant balance and order mutation checks require designated test users and test orders."

patterns-established:
  - "Each regression row includes workflow, automated reference, manual steps, expected result and status."
  - "Release notes link to the regression source of truth instead of duplicating checklist content."

requirements-completed: [VER-01, VER-04, MP-04, MP-05]

duration: 9min
completed: 2026-05-12
---

# Phase 12 Plan 12-04: Customer and Merchant Critical Workflow Regression Checklist Summary

**Dual-miniapp regression source of truth connecting customer, merchant and API test suites to manual cutover checks while preserving ICP and real WeChat Pay gates.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-05-12T07:57:25Z
- **Completed:** 2026-05-12T08:06:47Z
- **Tasks:** 3
- **Files modified:** 2 planned release docs plus this summary

## Accomplishments

- Created `docs/release/miniapp-regression.md` with customer workflows for launch/login/bootstrap, runtime config, catalog/search/detail, cart/spec selection, checkout, mock/dev payment, payment sync, orders, profile, pets, addresses and OSS image display.
- Added merchant regression workflows for access gate, order operations, catalog/product admin with OSS upload, user search, balance safeguards, runtime config/Banner editing and receipt printing.
- Added automated regression commands for customer miniapp, merchant miniapp and API tests, then linked the CloudBase/miniapp release notes to the checklist.
- Explicitly documented ICP/legal-domain approval and real WeChat Pay activation/API v3/cert/callback verification as production blockers.

## Task Commits

Each task was committed atomically:

1. **Task 12-04-01: Create customer miniapp critical workflow regression checklist** - `65268ed` (docs)
2. **Task 12-04-02: Add merchant miniapp critical workflow regression checklist** - `586364b` (docs)
3. **Task 12-04-03: Connect regression checklist to automated test commands and known blockers** - `0548623` (docs)

## Files Created/Modified

- `docs/release/miniapp-regression.md` - Customer and merchant regression checklist, automated test commands and production blockers.
- `docs/release/cloudbase-and-miniapp.md` - References the regression checklist as the Phase 12 source of truth.
- `.planning/phases/12-production-cutover-security-and-regression-verification/12-04-SUMMARY.md` - Execution summary.

## Decisions Made

- Used one checklist file for both mini programs so cutover verification has a single source of truth.
- Kept statuses as pending manual regression because WeChat DevTools, legal-domain setup and production credentials are outside this local execution environment.
- Required designated test users/orders for merchant balance and order mutation checks to avoid accidental production data changes.

## Deviations from Plan

### Execution Deviations

**1. Pre-staged parallel work was included in the first task commit**
- **Found during:** Post-commit deletion/status check after Task 12-04-01
- **Issue:** `docs/release/alibaba-rds.md` was already staged by parallel work before the first `12-04` commit and was included in commit `65268ed`.
- **Action:** Did not revert or modify that file because the user explicitly instructed not to revert edits made by others. Subsequent commits checked the staged set before commit and included only plan files.
- **Files affected:** `docs/release/alibaba-rds.md`
- **Verification:** `git show --stat --oneline --name-status 65268ed`; no deletions were present.

---

**Total deviations:** 1 execution deviation, no auto-fixed code deviations.
**Impact on plan:** Plan deliverables completed. The extra committed file is outside 12-04 scope and should be reconciled by the phase orchestrator or the 12-03 executor.

## Issues Encountered

- Existing `.planning/STATE.md` changes were present before and after execution. Per user instruction, this plan did not modify or commit `STATE.md`, `ROADMAP.md` or `PROJECT.md`.

## Verification

- `rg -n "Customer Mini Program Regression|launch/login/bootstrap|payment sync|OSS-backed image display|cart and spec selection" docs/release/miniapp-regression.md` - PASS.
- `rg -n "Merchant Mini Program Regression|access gate|OSS upload|balance adjustment safeguard|receipt print" docs/release/miniapp-regression.md` - PASS.
- `rg -n "Automated Regression Commands|pnpm --filter @xiaipet/customer-miniapp test|Known Production Blockers|real WeChat Pay|docs/release/miniapp-regression.md" docs/release/miniapp-regression.md docs/release/cloudbase-and-miniapp.md` - PASS.
- `source ~/.nvm/nvm.sh && pnpm --filter @xiaipet/customer-miniapp test` - PASS, 17 files / 103 tests.
- `source ~/.nvm/nvm.sh && pnpm --filter @xiaipet/merchant-miniapp test` - PASS, 11 files / 46 tests.
- `source ~/.nvm/nvm.sh && pnpm --filter @xiaipet/api test` - PASS, 21 files / 46 tests.
- `rg -n "Customer Mini Program Regression|Merchant Mini Program Regression|Known Production Blockers" docs/release/miniapp-regression.md` - PASS.

## Known Stubs

None. Stub scan found no `TODO`, `FIXME`, placeholder, coming soon or empty hardcoded UI data patterns in the modified release docs.

## Threat Flags

None. This plan changed release documentation only and did not add network endpoints, auth paths, file access patterns or schema changes.

## User Setup Required

No new setup file was generated. Production release remains blocked until ICP/legal-domain approval and real WeChat Pay activation/API v3/cert/callback verification are ready.

## Next Phase Readiness

Plan 12-04 regression documentation is ready for the remaining Phase 12 cutover/retirement decision work. Manual regression statuses remain pending until the user can verify in WeChat DevTools against the intended API environment and designated test records.

## Self-Check: PASSED

- Found `docs/release/miniapp-regression.md`.
- Found `docs/release/cloudbase-and-miniapp.md`.
- Found `.planning/phases/12-production-cutover-security-and-regression-verification/12-04-SUMMARY.md`.
- Found task commits `65268ed`, `586364b` and `0548623` in git history.
- Verified no tracked file deletions in task commits.

---
*Phase: 12-production-cutover-security-and-regression-verification*
*Completed: 2026-05-12*
