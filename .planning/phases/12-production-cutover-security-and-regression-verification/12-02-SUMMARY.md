---
phase: 12-production-cutover-security-and-regression-verification
plan: 12-02
subsystem: auth-security
tags: [fastify, wechat-login, env-config, merchant-auth, diagnostics, vitest]

requires:
  - phase: 09-http-api-parity-for-unified-backend
    provides: Unified Fastify API route surface and session-based auth guards.
  - phase: 10-mini-program-api-client-migration
    provides: Miniapp HTTP API clients and token retry behavior.
provides:
  - Separate customer and merchant WeChat AppID/AppSecret configuration.
  - Merchant miniapp login endpoint at /api/v1/merchant/auth/login.
  - Production-safe health response assertions and expanded secret redaction.
affects: [production-cutover, auth, merchant-miniapp, diagnostics]

tech-stack:
  added: []
  patterns: [separate-wechat-login-providers, explicit-safe-health-contract]

key-files:
  created:
    - apps/api/src/routes/merchant/auth.ts
  modified:
    - apps/api/src/config/env.ts
    - apps/api/src/config/env.test.ts
    - apps/api/src/lib/logger.ts
    - apps/api/src/routes/dependencies.ts
    - apps/api/src/routes/customer/auth.ts
    - apps/api/src/routes/api-v1.ts
    - apps/api/src/routes/auth.routes.test.ts
    - apps/api/src/routes/health.test.ts
    - apps/api/src/routes/test-helpers.ts
    - apps/merchant-miniapp/src/services/api-client.ts
    - apps/merchant-miniapp/src/services/api-client.js
    - apps/merchant-miniapp/src/services/api-client.test.ts

key-decisions:
  - "Production auth now requires separate customer and merchant WeChat credentials."
  - "Merchant login has its own route while protected merchant APIs still use the existing merchant authorization guard."
  - "Health diagnostics remain public but constrained to ok, service, and uptimeSeconds."

patterns-established:
  - "WeChat login providers are injected per mini program instead of shared globally."
  - "Public diagnostics tests assert an allowlist and explicit forbidden secret fields."

requirements-completed: [DEP-03, DEP-04, DEP-05, VER-01]

duration: 14min
completed: 2026-05-12
---

# Phase 12 Plan 12-02: Production Auth Security Hardening and Safe Diagnostics Summary

**Customer and merchant WeChat login now use separate credentials, with merchant miniapp login routed through a merchant endpoint and health diagnostics locked to safe fields.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-05-12T07:30:09Z
- **Completed:** 2026-05-12T07:44:08Z
- **Tasks:** 4
- **Files modified:** 12 modified, 1 created

## Accomplishments

- Split API config from one `WECHAT_APP_ID` / `WECHAT_APP_SECRET` pair into customer and merchant WeChat credential pairs.
- Added `/api/v1/merchant/auth/login` and registered separate customer and merchant login providers.
- Changed the merchant miniapp login client from the customer login endpoint to the merchant login endpoint.
- Strengthened health diagnostics tests to prove secrets, headers, env dumps, and stack fields are absent.

## Task Commits

1. **Task 12-02-01: Split WeChat app configuration for customer and merchant mini programs** - `15b644e` (feat)
2. **Task 12-02-02: Add merchant auth login endpoint and route dependencies** - `1673416` (feat)
3. **Task 12-02-03: Point merchant miniapp login to merchant auth endpoint** - `6e7e68c` (fix)
4. **Task 12-02-04: Verify production-safe health errors and merchant authorization boundaries** - `c96e7f0` (test)

## Files Created/Modified

- `apps/api/src/config/env.ts` - Defines separate customer and merchant WeChat credential config.
- `apps/api/src/config/env.test.ts` - Verifies deterministic test defaults and production overrides for both mini programs.
- `apps/api/src/lib/logger.ts` - Redacts both new WeChat secret env names and config property names.
- `apps/api/src/routes/dependencies.ts` - Builds separate customer and merchant WeChat login providers.
- `apps/api/src/routes/customer/auth.ts` - Uses the customer login provider.
- `apps/api/src/routes/merchant/auth.ts` - Adds merchant login route with the same session response shape.
- `apps/api/src/routes/api-v1.ts` - Registers merchant auth routes before protected merchant routes.
- `apps/api/src/routes/auth.routes.test.ts` - Covers separate provider use and merchant authorization boundary.
- `apps/api/src/routes/health.test.ts` - Locks `/health` to safe fields and explicit secret absence checks.
- `apps/api/src/routes/test-helpers.ts` - Keeps route test config aligned with the new `ApiConfig` contract.
- `apps/merchant-miniapp/src/services/api-client.ts` - Uses `/api/v1/merchant/auth/login`.
- `apps/merchant-miniapp/src/services/api-client.js` - Generated client output kept in sync with TypeScript source.
- `apps/merchant-miniapp/src/services/api-client.test.ts` - Expects merchant login requests to use the merchant endpoint.

## Decisions Made

- Kept legacy `WECHAT_APP_SECRET` only in logger redaction, not as required API config.
- Reused the existing session token shape for merchant login so merchant authorization remains enforced by existing protected route guards.
- Did not modify `.planning/STATE.md`, `.planning/ROADMAP.md`, or `.planning/PROJECT.md` because the phase orchestrator owns those files during parallel execution.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated route test config helper for the new ApiConfig contract**
- **Found during:** Task 12-02-02
- **Issue:** `apps/api/src/routes/test-helpers.ts` still provided the removed `wechatAppId` and `wechatAppSecret` fields after Task 12-02-01 changed `ApiConfig`.
- **Fix:** Replaced those fields with customer and merchant WeChat test credentials.
- **Files modified:** `apps/api/src/routes/test-helpers.ts`
- **Verification:** `source ~/.nvm/nvm.sh && pnpm --filter @xiaipet/api typecheck`
- **Committed in:** `1673416`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required to keep route tests and typecheck aligned with the planned config split. No product scope expansion.

## Issues Encountered

- Running Vitest with the shell's system Node `v18.16.1` fails during config startup with a Vite/Vitest ESM loading error. Verification was run with the workspace nvm default Node `v24.13.1`, which loaded Vitest successfully.

## Verification

- `source ~/.nvm/nvm.sh && pnpm --filter @xiaipet/api test -- src/config/env.test.ts`
  - Result: passed, 21 test files / 45 tests.
- `source ~/.nvm/nvm.sh && pnpm --filter @xiaipet/api test -- src/routes/auth.routes.test.ts`
  - Result: passed, 21 test files / 46 tests.
- `source ~/.nvm/nvm.sh && pnpm --filter @xiaipet/api typecheck`
  - Result: passed.
- `source ~/.nvm/nvm.sh && pnpm --filter @xiaipet/merchant-miniapp test -- src/services/api-client.test.ts`
  - Result: passed, 11 test files / 46 tests.
- `source ~/.nvm/nvm.sh && pnpm --filter @xiaipet/api test -- src/routes/health.test.ts src/routes/auth.routes.test.ts`
  - Result: passed, 21 test files / 46 tests.
- `source ~/.nvm/nvm.sh && pnpm --filter @xiaipet/api test -- src/config/env.test.ts src/routes/auth.routes.test.ts src/routes/health.test.ts`
  - Result: passed, 21 test files / 46 tests.

## Known Stubs

None. Stub scan only found normal null/undefined handling and default parameter syntax.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: auth-endpoint | apps/api/src/routes/merchant/auth.ts | New merchant login endpoint added for the threat-model mitigation T-12-02A; returns only session token, expiry, and openid using server-side WeChat provider exchange. |

## User Setup Required

Production API env now requires these four separate variables instead of a single shared WeChat pair:

- `CUSTOMER_WECHAT_APP_ID`
- `CUSTOMER_WECHAT_APP_SECRET`
- `MERCHANT_WECHAT_APP_ID`
- `MERCHANT_WECHAT_APP_SECRET`

Do not commit real values. Inject them through the production server environment.

## Next Phase Readiness

Auth, diagnostics, and merchant miniapp login routing are ready for the remaining Phase 12 cutover and regression plans. Production still remains gated by ICP/HTTPS/legal-domain setup and real production secret injection.

## Self-Check: PASSED

- Summary file exists: `.planning/phases/12-production-cutover-security-and-regression-verification/12-02-SUMMARY.md`
- Created merchant auth route exists: `apps/api/src/routes/merchant/auth.ts`
- Task commits found: `15b644e`, `1673416`, `6e7e68c`, `c96e7f0`
- Acceptance markers verified for split env config, merchant auth route/client, safe health assertions, and merchant authorization no-call guard.

---
*Phase: 12-production-cutover-security-and-regression-verification*
*Completed: 2026-05-12*
