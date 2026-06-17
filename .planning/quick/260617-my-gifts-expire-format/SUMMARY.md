# My gifts expiration display format summary

## Result

Changed the customer my-gifts page to display expiration times as `yyyy-mm-dd hh-mm-ss`.

## Changes

- Added a formatted `displayExpiresAt` field in the my-gifts page data model.
- Preserved the raw API `expiresAt` value for logic and future use.
- Updated the my-gifts WXML to render the formatted value.
- Added page-flow regression coverage.

## Verification

- `pnpm --filter @xiaipet/customer-miniapp exec vitest run pages/recharge-flow.test.ts --testNamePattern "formats my gift expiration"`
- `pnpm --filter @xiaipet/customer-miniapp exec vitest run pages/recharge-flow.test.ts src/services/gifts.test.ts`
- `pnpm --filter @xiaipet/customer-miniapp typecheck`
- `pnpm --filter @xiaipet/customer-miniapp build`
- `git diff --check`
