# Profile lock badge alignment

## Goal

Fix the customer profile detail birthday lock badge so the `保存后锁定` / `已锁定` text is vertically centered inside the pill.

## Scope

- Add a focused regression assertion for the profile detail lock badge style.
- Change the badge from block/padding-driven layout to fixed-height flex centering.
- Do not alter the existing profile detail WXML content changes.

## Verification

- `pnpm --filter @xiaipet/customer-miniapp exec vitest run pages/cart-checkout.test.ts -t "centers the profile birthday lock badge"`
- `pnpm --filter @xiaipet/customer-miniapp typecheck`
- `pnpm --filter @xiaipet/customer-miniapp build`
