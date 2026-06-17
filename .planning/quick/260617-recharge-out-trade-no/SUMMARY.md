# Recharge payment 502 debug summary

## Result

Fixed recharge payment prepay failures caused by overlong WeChat `out_trade_no` values.

## Root Cause

The recharge transaction ID was generated from `openid + idempotencyKey`. Customer miniapp idempotency keys include a timestamp and random suffix, so production recharge IDs could exceed WeChat Pay's 32-character `out_trade_no` limit.

## Changes

- Generate recharge transaction IDs as deterministic short SHA-256 hashes.
- Keep the `recharge-` prefix so payment notifications continue to route to recharge settlement.
- Repair already-created pending recharge transactions that still have legacy overlong trade numbers before retrying WeChat payment start.
- Added a service regression test covering long openid/idempotency-key inputs.
- Added a service regression test covering retry after a legacy pending transaction was left behind.

## Verification

- `pnpm --filter @xiaipet/api exec vitest run src/modules/recharge/service.test.ts --testNamePattern "WeChat-compatible recharge trade numbers"`
- `pnpm --filter @xiaipet/api exec vitest run src/modules/recharge/service.test.ts --testNamePattern "repairs an existing pending recharge"`
- `pnpm --filter @xiaipet/api exec vitest run src/modules/recharge/service.test.ts`
- `pnpm --filter @xiaipet/api exec vitest run src/modules/recharge/service.test.ts src/modules/recharge/repository.test.ts src/routes/recharge.routes.test.ts src/modules/payments/notification-service.test.ts`
- `pnpm --filter @xiaipet/api typecheck`
- `pnpm --filter @xiaipet/api build`
