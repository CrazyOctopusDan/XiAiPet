---
phase: 09
plan: 09-01
status: completed
completed_at: 2026-05-11
commit: pending
---

# 09-01 Summary: Auth Session And Customer Identity APIs

## Outcome

Added API auth foundations for session signing, WeChat login exchange, customer identity routes and merchant access checks.

## Key Changes

- Added signed HMAC session tokens in `apps/api/src/modules/auth/session.ts`.
- Added injectable WeChat login provider and customer/merchant Fastify guards.
- Added `POST /api/v1/customer/auth/login`, `POST /api/v1/customer/bootstrap`, `POST /api/v1/customer/profile/phone`, and `GET /api/v1/merchant/access`.
- Extended API config with `API_SESSION_SECRET`, `API_SESSION_TTL_SECONDS`, `WECHAT_APP_ID`, and `WECHAT_APP_SECRET`.

## Verification

- `pnpm --filter @xiaipet/api typecheck` passed.
- `pnpm --filter @xiaipet/api test` passed: 17 files, 35 tests.

## Deviations

- Shared phone schema could not be imported directly because `apps/api` currently compiles with `rootDir: src`; a narrow local validator was used to avoid widening build output.

## Self-Check

PASSED
