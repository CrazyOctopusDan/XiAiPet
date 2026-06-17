# Recharge plans GET response compatibility

- Root cause: API GET /recharge-plans returns a raw array, but miniapp services read response.plans.
- Merchant recharge config page therefore renders zero plans even when the 200 response contains plan records.
- Customer recharge hydration uses the same response assumption and should be fixed in the same compatibility layer.

Verification targets:
- merchant recharge-config service tests
- customer recharge service tests
- merchant/customer typecheck and build
