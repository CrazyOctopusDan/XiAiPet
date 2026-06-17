---
status: complete
---

# Recharge gift settlement audit

## Summary

- Audited recharge settlement, paid/bonus balance ledgers, gift snapshot creation, gift listing, checkout gift locking, and order payment settlement.
- Added customer unpaid-order cancellation for WeChat Pay cancellation so locked gifts are released instead of remaining unavailable.
- Preserved paid-order safety: if WeChat payment succeeds but payment sync fails, the customer order is not cancelled and can still settle through sync or notify.

## Verification

- `pnpm --filter @xiaipet/api exec vitest run src/modules/recharge/service.test.ts src/modules/orders/service.test.ts src/modules/gifts/service.test.ts src/modules/payments/notification-service.test.ts src/routes/recharge.routes.test.ts src/routes/customer-account.routes.test.ts src/routes/customer-orders.routes.test.ts`
- `pnpm --filter @xiaipet/customer-miniapp exec vitest run src/services/recharge.test.ts src/services/gifts.test.ts src/services/order-submit.test.ts pages/recharge-flow.test.ts pages/cart-checkout.test.ts -t "gift|recharge|payment|balance|WeChat|cancel"`
- `pnpm --filter @xiaipet/shared exec vitest run src/schema/recharge.test.ts src/schema/runtime-config.test.ts`
