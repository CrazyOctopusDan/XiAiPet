# Quick Task: API Recharge Docker Runtime Schema

## Problem

Production Docker startup fails because `apps/api/dist/modules/recharge/service.js` requires `../../../../../packages/shared/src/schema/recharge.js`, but the API runtime image does not include that monorepo source path.

## Root Cause

The API recharge service used a direct relative `require` to the shared package source. This works in the monorepo checkout but not in the Docker runtime, where only API runtime artifacts and selected files are copied.

## Fix

- Add an API-local runtime recharge schema module that compiles into `apps/api/dist`.
- Update recharge service to import the local runtime module.
- Add parity tests against the shared schema behavior.
- Verify API build output no longer references `packages/shared/src/schema/recharge`.

## Verification

- `pnpm --filter @xiaipet/api test -- src/modules/recharge/recharge-schema.test.ts src/modules/recharge/service.test.ts`
- `pnpm --filter @xiaipet/api typecheck`
- `pnpm --filter @xiaipet/api build`
- `rg "packages/shared/src/schema/recharge|@xiaipet/shared/src/schema/recharge" apps/api/dist`
- Temporary runtime load of `dist/modules/recharge/service.js` without a `packages/` directory.
