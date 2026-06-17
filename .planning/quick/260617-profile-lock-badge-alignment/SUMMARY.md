---
status: complete
---

# Profile lock badge alignment

## Summary

- Added a style regression test that requires the profile birthday lock badge to use fixed-height flex centering.
- Updated `.lock-badge` to use `display: flex`, centered alignment, `height: 52rpx`, and `line-height: 1`.
- Left the existing profile detail WXML edits untouched.

## Verification

- `pnpm --filter @xiaipet/customer-miniapp exec vitest run pages/cart-checkout.test.ts -t "centers the profile birthday lock badge"`
