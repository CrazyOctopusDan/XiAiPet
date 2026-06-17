# Balance card status pill removal summary

## Changes
- Removed the `可用于订单抵扣` status pill from the customer balance overview card.
- Kept `去充值` as the only right-side action in the card header.
- Updated the static layout regression test to prevent the removed status pill from returning.

## Verification
- `pnpm --filter @xiaipet/customer-miniapp exec vitest run pages/cart-checkout.test.ts -t "renders the balance ledger page"`
- `pnpm --filter @xiaipet/customer-miniapp typecheck`
- `pnpm --filter @xiaipet/customer-miniapp build`
