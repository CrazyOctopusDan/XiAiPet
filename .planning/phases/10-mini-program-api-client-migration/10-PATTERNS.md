---
phase: 10
status: complete
generated_at: 2026-05-11
---

# Phase 10 Pattern Map

## Existing Service Pattern

Most miniapp services export domain functions used by pages directly. Preserve exported names where possible and replace the default transport dependency.

Examples:

- `apps/customer-miniapp/src/services/order-submit.ts` exposes `submitOrder(paymentMethod, callFunction, options)`.
- `apps/customer-miniapp/src/services/orders.ts` exposes `queryMyOrders(callFunction)` and `getMyOrderDetail(orderId, callFunction)`.
- `apps/merchant-miniapp/src/services/orders.ts` exposes `queryMerchantOrders(callFunction)`, `getMerchantOrderDetail(orderId, callFunction)`, and `updateMerchantOrderStatus(input, callFunction, accessVerifier)`.
- `apps/merchant-miniapp/src/services/user-admin.ts` exposes `queryMerchantUsers(input, callFunction)` and `submitBalanceAdjustment(draft, callFunction, accessVerifier, storage)`.

## Existing Test Pattern

Tests currently inject fake CloudBase call functions and assert payloads. Reuse the same style, but assert HTTP method/path/body.

Examples:

- `apps/customer-miniapp/src/services/auth.test.ts`
- `apps/customer-miniapp/src/services/order-submit.test.ts`
- `apps/customer-miniapp/src/services/orders.test.ts`
- `apps/merchant-miniapp/src/services/access.test.ts`
- `apps/merchant-miniapp/src/services/orders.test.ts`
- `apps/merchant-miniapp/src/services/catalog-admin.test.ts`
- `apps/merchant-miniapp/src/services/user-admin.test.ts`
- `apps/merchant-miniapp/src/services/runtime-config-admin.test.ts`
- `apps/merchant-miniapp/src/services/order-receipt-print.test.ts`

## API Contract Source

Use these files as route truth:

- `apps/api/src/routes/api-parity.ts`
- `apps/api/docs/api-parity.md`
- `apps/api/src/routes/customer/*.ts`
- `apps/api/src/routes/merchant/*.ts`

## Target New Files

Customer:

- `apps/customer-miniapp/src/services/api-config.ts`
- `apps/customer-miniapp/src/services/api-client.ts`
- `apps/customer-miniapp/src/services/api-client.test.ts`

Merchant:

- `apps/merchant-miniapp/src/services/api-config.ts`
- `apps/merchant-miniapp/src/services/api-client.ts`
- `apps/merchant-miniapp/src/services/api-client.test.ts`

## Worktree Caution

The merchant miniapp service files are already dirty before Phase 10 planning. Execution must read the current file contents and preserve user changes:

- `apps/merchant-miniapp/src/services/access.ts`
- `apps/merchant-miniapp/src/services/catalog-admin.ts`
- `apps/merchant-miniapp/src/services/order-receipt-print.ts`
- `apps/merchant-miniapp/src/services/orders.ts`
- `apps/merchant-miniapp/src/services/runtime-config-admin.ts`
- `apps/merchant-miniapp/src/services/user-admin.ts`
- `apps/merchant-miniapp/src/services/cloud.ts`

Generated `.js` files next to these `.ts` sources may also be dirty. If execution runs miniapp builds, it must review generated diffs before committing.
