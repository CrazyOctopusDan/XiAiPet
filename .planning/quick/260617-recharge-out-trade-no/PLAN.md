# Recharge payment 502 debug

## Trigger

Customer miniapp recharge confirmation calls `POST /api/v1/customer/recharge-transactions` and receives 502.

## Evidence

- The miniapp sends a page idempotency key shaped like `recharge-page-{timestamp}-{random}`.
- The API builds recharge `outTradeNo` from `openid + idempotencyKey`.
- The WeChat payment provider uses that value as `out_trade_no` during prepay.

## Plan

1. Add a failing service test proving recharge payment trade numbers stay within WeChat's 32-character `out_trade_no` boundary.
2. Replace raw `openid + idempotencyKey` recharge IDs with a deterministic short hash that keeps the `recharge-` prefix for notification routing.
3. Run focused API recharge/payment tests and build verification.
