# Recharge gift settlement audit

## Goal

Audit and harden the recharge and gift settlement flow before merchant rollout, with emphasis on cash settlement and gift state consistency.

## Scope

- Verify recharge paid amount settlement still credits paid amount and bonus amount exactly once.
- Verify recharge gifts are snapshotted with expiration and shown in customer gift lists.
- Add a missing cleanup path for gifts locked by an unpaid order when the customer cancels WeChat Pay.
- Keep existing unrelated profile detail WXML changes untouched.

## Verification

- Focused API recharge/order/gift/payment tests.
- Focused customer miniapp recharge/gift/order submit tests.
- API and customer miniapp typecheck/build.
