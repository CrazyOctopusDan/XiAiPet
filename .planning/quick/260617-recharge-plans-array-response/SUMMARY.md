# Recharge plans GET response compatibility summary

## Root Cause
- The API GET `/recharge-plans` routes return a raw `RechargePlanConfig[]`.
- The customer and merchant miniapp recharge services read only `response.plans`, so array responses were interpreted as no plans.

## Changes
- Merchant recharge config now accepts either `{ plans }` or a raw plan array.
- Customer recharge hydration now accepts either `{ plans }` or a raw plan array.
- Added regression tests for the raw array response shape in both miniapps.

## Verification
- `pnpm --filter @xiaipet/merchant-miniapp exec vitest run src/services/recharge-config.test.ts`
- `pnpm --filter @xiaipet/customer-miniapp exec vitest run src/services/recharge.test.ts`
- `pnpm --filter @xiaipet/merchant-miniapp typecheck`
- `pnpm --filter @xiaipet/customer-miniapp typecheck`
- `pnpm --filter @xiaipet/merchant-miniapp build`
- `pnpm --filter @xiaipet/customer-miniapp build`
