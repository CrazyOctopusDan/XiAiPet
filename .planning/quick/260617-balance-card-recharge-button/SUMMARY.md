# Balance card recharge button layout summary

## Changes
- Moved the balance card recharge CTA out of the centered amount area.
- Grouped the order-deduction status pill and recharge CTA in a right-aligned header action area.
- Kept the amount line as the dominant visual element and preserved the existing recharge navigation behavior.
- Added a static regression assertion so the old centered `overview-action-row` layout does not return.

## Verification
- `pnpm --filter @xiaipet/customer-miniapp exec vitest run pages/cart-checkout.test.ts -t "renders the balance ledger page"`
- `pnpm --filter @xiaipet/customer-miniapp typecheck`
- `pnpm --filter @xiaipet/customer-miniapp build`
