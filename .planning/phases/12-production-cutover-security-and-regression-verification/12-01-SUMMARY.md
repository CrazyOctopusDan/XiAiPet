---
phase: 12-production-cutover-security-and-regression-verification
plan: 12-01
subsystem: infra
tags: [ecs, nginx, acme.sh, docker-compose, oss, wechat-legal-domain]

requires:
  - phase: 07-node-api-foundation-and-ecs-deployment-runway
    provides: apps/api Docker Compose deployment baseline
  - phase: 11-oss-asset-migration-and-upload-flow
    provides: OSS production bucket and asset URL conventions
provides:
  - ECS monorepo deployment layout for /opt/xiaipet/repo
  - Alibaba Cloud Linux 3 Docker, Nginx and acme.sh HTTPS runbook
  - Placeholder-only production env key list for RDS, OSS and two mini programs
  - ICP-gated WeChat request and OSS legal-domain checklist
affects: [phase-12, production-cutover, ecs-deployment, miniapp-release]

tech-stack:
  added: []
  patterns:
    - Git-based ECS deployment from full monorepo with api-only Compose runtime
    - Nginx exposes only ACME challenge files and reverse proxy traffic to 127.0.0.1:3000
    - Production secrets remain server-only placeholders in committed examples

key-files:
  created:
    - .planning/phases/12-production-cutover-security-and-regression-verification/12-01-SUMMARY.md
  modified:
    - docs/release/alibaba-ecs-api.md
    - apps/api/.env.example

key-decisions:
  - "Use /opt/xiaipet/repo as the ECS Git monorepo checkout because apps/api/Dockerfile needs root workspace files and packages/shared."
  - "Run only the Docker Compose service named api on ECS; Nginx proxies public HTTPS traffic to http://127.0.0.1:3000."
  - "Keep WeChat legal-domain setup gated on ICP approval, including both https://api.xiaipet.vip and the OSS public asset domain."

patterns-established:
  - "Release docs should include copy/paste ECS commands with expected verification checks."
  - "Committed env examples may include real non-secret Alibaba resource identifiers, but secrets must be angle-bracket placeholders."

requirements-completed: [DEP-01, DEP-02]

duration: 7min
completed: 2026-05-12
---

# Phase 12 Plan 12-01: Production ECS Nginx HTTPS and WeChat Legal-Domain Runway Summary

**ECS production runbook for `api.xiaipet.vip` with monorepo Git deployment, api-only Docker Compose runtime, Nginx/acme.sh HTTPS, and ICP-gated WeChat legal domains.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-05-12T07:29:41Z
- **Completed:** 2026-05-12T07:36:18Z
- **Tasks:** 3
- **Files modified:** 2 implementation artifacts plus this summary

## Accomplishments

- Expanded the ECS runbook around the exact `/opt/xiaipet/repo`, `/opt/xiaipet/releases`, and `/opt/xiaipet/backups` layout.
- Documented Alibaba Cloud Linux 3 package setup, Docker/Nginx services, `acme.sh` issuance, certificate install paths, and the Nginx reverse proxy to `127.0.0.1:3000`.
- Added placeholder-only production env keys for OSS and separate customer/merchant WeChat AppID/AppSecret pairs.
- Made ICP approval an explicit gate before WeChat request legal-domain and OSS image/download domain configuration.

## Task Commits

Each task was committed atomically:

1. **Task 12-01-01: Expand ECS monorepo deployment layout and Git workflow** - `b6d65fa` (docs)
2. **Task 12-01-02: Add Alibaba Cloud Linux 3 Docker Nginx and acme.sh runbook** - `1414d08` (docs)
3. **Task 12-01-03: Document production env placeholders and WeChat legal-domain gates** - `b0fc219` (docs)

## Files Created/Modified

- `docs/release/alibaba-ecs-api.md` - ECS deployment, Nginx/acme.sh HTTPS, production env, rollback, and legal-domain runbook.
- `apps/api/.env.example` - Placeholder-only OSS, session, and two-miniapp WeChat production env key list.
- `.planning/phases/12-production-cutover-security-and-regression-verification/12-01-SUMMARY.md` - Execution summary.

## Decisions Made

- Used Git monorepo checkout on ECS because the API Dockerfile depends on root workspace metadata and `packages/shared`.
- Kept `api.xiaipet.vip` as the only production API domain while documenting IP/local access as non-production.
- Used public OSS base URL `https://xiaipet-assets-prod.oss-cn-hangzhou.aliyuncs.com` for mini program image/download legal-domain setup after ICP approval.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Existing unstaged `.planning/STATE.md` changes were present before plan edits and were left untouched.
- Parallel executor changes briefly appeared outside 12-01 scope; only plan-listed files were staged and committed.

## Verification

- `rg -n "/opt/xiaipet/repo|git pull|docker compose up -d --build api|only the.*api" docs/release/alibaba-ecs-api.md` - PASS
- `rg -n "Alibaba Cloud Linux 3 First-Time Setup|acme\\.sh|/var/www/acme|/etc/nginx/ssl/api\\.xiaipet\\.vip|proxy_pass http://127\\.0\\.0\\.1:3000|nginx -t" docs/release/alibaba-ecs-api.md` - PASS
- `rg -n "CUSTOMER_WECHAT_APP_ID|MERCHANT_WECHAT_APP_ID|xiaipet-assets-prod|oss-cn-hangzhou|request legal domain|ICP" apps/api/.env.example docs/release/alibaba-ecs-api.md` - PASS
- `rg -n "/opt/xiaipet/repo|acme\\.sh|proxy_pass http://127\\.0\\.0\\.1:3000|CUSTOMER_WECHAT_APP_ID|MERCHANT_WECHAT_APP_ID|xiaipet-assets-prod|request legal domain" docs/release/alibaba-ecs-api.md apps/api/.env.example` - PASS
- `rg -n "(PASSWORD|SECRET|ACCESS_KEY|APP_SECRET|SESSION_SECRET)=([^<]|$)" apps/api/.env.example docs/release/alibaba-ecs-api.md` - PASS, no matches

## Known Stubs

None. Angle-bracket env placeholders are intentional examples for server-only secrets.

## Threat Flags

None. This plan changed documentation and env examples only; it did not add network endpoints, auth paths, file access patterns, or schema changes.

## User Setup Required

No separate setup artifact was generated. ECS, DNS, ICP, certificate issuance and WeChat legal-domain actions are documented directly in `docs/release/alibaba-ecs-api.md`.

## Next Phase Readiness

The deployment runway is ready for 12-02 security hardening and later smoke/regression plans. Production release remains blocked until ICP approval, HTTPS verification, WeChat legal-domain configuration, and downstream regression checks are complete.

## Self-Check: PASSED

- Found `docs/release/alibaba-ecs-api.md`.
- Found `apps/api/.env.example`.
- Found `.planning/phases/12-production-cutover-security-and-regression-verification/12-01-SUMMARY.md`.
- Found task commits `b6d65fa`, `1414d08`, and `b0fc219` in git history.

---
*Phase: 12-production-cutover-security-and-regression-verification*
*Completed: 2026-05-12*
