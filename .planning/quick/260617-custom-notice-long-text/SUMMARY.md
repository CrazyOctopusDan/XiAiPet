# Long custom notice text fix summary

## Changes
- Disabled the WeChat default 140 character textarea limit for the merchant purchase notice editor with `maxlength="-1"`.
- Changed the customer home purchase notice modal to a fixed-height notice dialog with an internal `scroll-view`.
- Added regression tests for both the merchant textarea limit and the customer scrollable notice modal.

## Verification
- `pnpm --filter @xiaipet/customer-miniapp exec vitest run pages/home.test.ts`
- `pnpm --filter @xiaipet/merchant-miniapp exec vitest run src/testing/runtime-config-page.test.ts`
- `pnpm --filter @xiaipet/customer-miniapp typecheck`
- `pnpm --filter @xiaipet/merchant-miniapp typecheck`
- `git diff --check`
