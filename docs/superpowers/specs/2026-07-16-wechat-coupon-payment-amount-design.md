# WeChat Coupon Payment Amount Contract Design

## Context

On 2026-07-16, a customer selected a CNY 500 recharge plan with a CNY 25 bonus. WeChat Pay completed the order with `amount.total = 50000` cents and `amount.payer_total = 38500` cents after applying two CASH coupons funded entirely by WeChat. The API treated `payer_total` as the amount to compare with the recharge plan, rejected both the asynchronous notification and active payment sync with `RECHARGE_PAYMENT_AMOUNT_MISMATCH`, and left the recharge transaction in `PROCESSING` without balance ledgers.

The same ambiguous `paidAmountCents` contract is shared by recharge and ordinary order payment sync, so the fix must cover both business flows.

## Goals

- Validate the merchant order amount against WeChat `amount.total`.
- Keep the customer's post-coupon payment amount distinct from the merchant order amount.
- Apply the same contract to asynchronous notifications and active WeChat order queries.
- Preserve strict amount-mismatch protection; a real total mismatch must still prevent settlement.
- Keep recharge settlement atomic and idempotent.
- Block production deployment until the already-paid, manually adjusted transaction is made non-settleable in a separately approved reconciliation task.

## Non-Goals

- Do not automatically deploy to ECS as part of the code change.
- Do not mutate production balances during local implementation or verification.
- Do not add, reverse, or otherwise change the affected customer's balance; the user has already handled the monetary adjustment in the merchant app.
- Do not add a merchant-facing arbitrary recharge-status editor.
- Do not accept either `total` or `payer_total` as interchangeable settlement amounts.
- Do not redesign recharge plans, bonuses, gifts, or ordinary order pricing.
- Do not redesign payment logging or observability in this fix.

## Chosen Contract

Replace the ambiguous payment-sync amount with two explicit fields:

```ts
interface WechatPaymentSyncResult {
  tradeState: string;
  transactionId?: string;
  paidAt?: Date;
  orderAmountCents?: number;
  payerAmountCents?: number;
  failureCode?: string;
  failureMessage?: string;
}
```

- `orderAmountCents` maps only to WeChat `amount.total`. It is the value used for order and recharge settlement validation.
- `payerAmountCents` maps only to WeChat `amount.payer_total`. It records the amount paid directly by the customer after WeChat coupons and is not accepted as a substitute for the order total.
- Mock payment results populate both fields with the same amount.
- Missing or malformed `amount.total` remains a hard failure for successful payments.

The internal recharge settlement payload will use `orderAmountCents` rather than `paidAmountCents` so the security contract is explicit at the transaction boundary.

## Data Flow

### Active payment sync

1. The customer app calls the existing order or recharge payment-sync endpoint.
2. The WeChat provider queries the order by `out_trade_no`.
3. The provider maps `amount.total` to `orderAmountCents` and `amount.payer_total` to `payerAmountCents`.
4. The order or recharge service compares `orderAmountCents` with its persisted payable amount.
5. On equality, the existing idempotent settlement runs. On mismatch or missing total, settlement is rejected.

### Asynchronous notification

1. The API verifies the WeChat signature and decrypts the resource as it does today.
2. For `trade_state = SUCCESS`, the notification service requires a finite integer `amount.total`.
3. The notification routes recharge trade numbers to recharge settlement and other trade numbers to order settlement using the total amount.
4. `payer_total` may be parsed for future audit use, but it never controls entitlement or order-total validation.

## Existing Manually Adjusted Transaction

The affected recharge transaction remains `PROCESSING` even though the user has already added the missing balance through the merchant app. Deploying the corrected code while that transaction remains settleable could cause a later WeChat callback or customer payment-sync request to apply the normal CNY 500 principal and CNY 25 bonus again.

This code change must not automatically replay or settle historical transactions. Production deployment is blocked until a separate, explicitly approved reconciliation step makes the affected transaction non-settleable without changing the balance again. That step must first verify the WeChat order, the exact merchant manual-adjustment ledger amount, and whether the CNY 25 bonus and configured gifts were included in the manual handling.

The local implementation ends with release-ready code and does not deploy, replay callbacks, call payment-sync for this transaction, or update RDS. A later production-reconciliation task will choose and verify the exact non-balance state transition for the manually adjusted transaction before deployment.

## Error Handling

- A successful WeChat response without a valid `amount.total` is rejected before settlement.
- A valid `amount.total` that differs from the persisted order or recharge amount returns the existing mismatch error.
- A lower `payer_total` caused by coupons is accepted when `total` still matches.
- Callback retries remain safe because settlement and balance writes are idempotent.

## Testing Strategy

Use test-driven development and observe the coupon cases fail before changing production code.

1. Provider query regression: WeChat returns `total = 50000` and `payer_total = 38500`; the provider returns both explicit fields.
2. Recharge notification regression: the same coupon response passes `orderAmountCents = 50000` into recharge settlement.
3. Ordinary order notification regression: a coupon-funded payment settles when `total` matches the payable total.
4. Recharge active-sync regression: settlement receives `orderAmountCents`, not `payerAmountCents`.
5. Ordinary order active-sync regression: amount validation uses `orderAmountCents`.
6. Security regressions: missing total and mismatched total still fail, even if `payer_total` happens to match.
7. Existing recharge idempotency, notification signature, order settlement, typecheck, and production build checks remain green.

## Rollout Gates

Local completion requires:

- Focused provider, notification, recharge, and order tests pass.
- The full API test suite passes.
- API typecheck passes.
- API production build passes.
- No production credentials, payloads, phone numbers, or transaction data are added to tests or committed files.

Production deployment requires a separate confirmation and a prior reconciliation of the manually adjusted `PROCESSING` transaction so it cannot be credited again. Only then may the ECS build/restart, health checks, log checks, and RDS read-only verification proceed.
