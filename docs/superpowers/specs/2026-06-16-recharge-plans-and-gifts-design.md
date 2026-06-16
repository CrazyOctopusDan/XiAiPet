# Recharge Plans and Gifts Design

Date: 2026-06-16

## Goal

Add merchant-managed recharge plans and customer recharge gifts to XiAiPet. Merchants can configure fixed recharge tiers with bonus balance, gifts, and descriptions. Customers can buy a fixed tier through WeChat Pay, receive balance and gift snapshots, select gifts during checkout, and view their gifts from profile.

This design is REST API only. Cloud Functions are not part of the delivery boundary for this feature.

## Locked Decisions

- Backend work targets `apps/api` only. Existing Cloud Functions may remain as old code, but this feature does not add or maintain Cloud Function equivalents.
- Recharge amounts are fixed merchant-configured tiers. Customers cannot enter a custom amount.
- Recharge payment uses WeChat Pay.
- Balance posting creates two ledger rows after successful recharge payment: one for paid recharge amount and one for bonus amount.
- Gifts are account benefits, not product SKUs. They do not bind to product inventory and do not decrement product stock.
- Each configured gift row creates one user gift instance. There is no quantity field.
- Gift instances are snapshots. Later merchant edits or deletion of a recharge plan do not change gifts already granted to users.
- Gift instances support expiration. Merchant gift config includes valid days; generated user gifts store an `expiresAt` snapshot.
- Expired gifts remain visible in the customer's "expired" group, but cannot be selected during checkout.
- Checkout gift consumption uses a lock flow: `available -> locked -> redeemed`, or `locked -> available` when payment fails or is cancelled.
- Merchant recharge management uses a dedicated page and an operations-config summary entry.

## Recommended Approach

Use runtime configuration for merchant recharge plan definitions, plus dedicated database tables for user-facing recharge transactions and user gift instances.

Recharge plans are configuration: they define what can be bought now. Recharge transactions are immutable purchase records: they snapshot the selected plan, drive WeChat Pay, and support payment retry, notification idempotency, and customer support lookup. User gifts are durable account benefits: they snapshot the gift name, description, and expiration created at recharge settlement.

This avoids overloading product orders with account recharge behavior and keeps the order fulfillment model focused on pet bakery orders.

## Merchant Recharge Configuration

Add a merchant miniapp page:

```text
/pages/recharge-config/index
```

The merchant workspace should link to this page. The existing runtime configuration page should also show a recharge plan summary entry with active plan count and latest update time, then navigate to the dedicated page.

The recharge config page supports:

- Add and delete recharge plans.
- Edit plan paid amount, bonus amount, and explanation.
- Add and delete gifts within each plan.
- Edit gift name, description, and valid days.
- Save the full plan list through the merchant REST API.

Suggested card behavior:

- Collapsed plan card title: `充 {paidAmount} 送 {bonusAmount} + {giftCount} 个赠品`.
- Expanded plan card fields: paid amount, bonus amount, explanation, gift editor rows.
- Delete affects only future purchases. Historical recharge transactions and generated user gifts remain unchanged.

Validation:

- `paidAmount` must be greater than 0.
- `bonusAmount` must be 0 or greater.
- Gift `name` is required.
- Gift `validDays` must be greater than 0.
- Plan IDs and gift template IDs must remain stable across edits where possible, so existing UI selections and audit metadata are readable.

## Customer Recharge Flow

Add a customer miniapp page:

```text
/pages/recharge/index
```

The balance page and profile page should both expose a "go recharge" entry. The existing balance page remains the balance ledger page.

Recharge page behavior:

- Load enabled recharge plans from the customer REST API.
- Show plan cards with paid amount, bonus amount, gift count, and short explanation.
- Tapping a plan selects it and displays its full explanation, gift names, descriptions, and expiration labels.
- The primary action starts WeChat Pay for the selected plan.
- On payment success, sync payment status, refresh balance, and show a success summary with paid amount, bonus amount, and granted gift count.
- If the plan is disabled or deleted before purchase, the API rejects transaction creation and the page refreshes plans.

## Recharge Transactions

Add a `RechargeTransaction` database model for each attempted customer recharge.

Core fields:

```ts
interface RechargeTransaction {
  id: string;
  openid: string;
  planId: string;
  planSnapshot: RechargePlanSnapshot;
  paidAmount: number;
  bonusAmount: number;
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';
  outTradeNo: string;
  prepayId?: string;
  transactionId?: string;
  idempotencyKey: string;
  paidAt?: Date;
  settledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

`outTradeNo` should use the recharge transaction ID, or a deterministic recharge-prefixed value that the payment notification can resolve to the transaction. The payment notification handler must distinguish order payments from recharge payments before settlement.

Settlement is idempotent:

- If the transaction is already settled, return the existing result.
- If WeChat Pay reports success, update transaction payment fields, write balance ledgers, create user gifts, and mark the transaction settled in one database transaction.
- If any part fails after payment success, retrying sync or notification should complete the same settlement without duplicating ledgers or gifts.

Balance ledgers:

- Paid amount ledger: type `recharge`, amount `+paidAmount`, metadata `{ rechargeTransactionId, amountKind: 'paid', planId }`.
- Bonus amount ledger: type `recharge`, amount `+bonusAmount`, metadata `{ rechargeTransactionId, amountKind: 'bonus', planId }`.
- If `bonusAmount` is 0, the bonus ledger may be omitted.

## User Gifts

Add a `UserGift` database model.

Core fields:

```ts
type UserGiftStatus = 'available' | 'locked' | 'redeemed';

interface UserGift {
  id: string;
  openid: string;
  sourceRechargeTransactionId: string;
  sourcePlanId: string;
  giftTemplateId: string;
  giftSnapshot: {
    name: string;
    description: string;
    validDays: number;
  };
  status: UserGiftStatus;
  expiresAt: Date;
  lockedOrderId?: string;
  redeemedOrderId?: string;
  lockedAt?: Date;
  redeemedAt?: Date;
  releasedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

Expiration is evaluated from `expiresAt`, not by mutating the status. An expired gift can still have status `available`, but customer checkout APIs must exclude it from selectable gifts and "my gifts" should group it as expired. `releasedAt` records that a previous order lock was released; the current status returns to `available`.

## Checkout Gift Flow

Add a customer miniapp page:

```text
/pages/checkout-gifts/index
```

The checkout page adds a "Gifts" row showing selected gift count and opens the new selection page. The selection page allows multi-select only for gifts that belong to the current customer, have status `available`, and are not expired.

Order creation accepts selected gift IDs:

```ts
interface CreateOrderPayload {
  selectedGiftIds?: string[];
}
```

Order creation behavior:

- In the same transaction that creates the order, verify each selected gift belongs to the customer, is `available`, and is not expired.
- Set those gifts to `locked`, with `lockedOrderId` and `lockedAt`.
- Write gift snapshots into the order snapshot.
- If validation fails, reject the order with a refreshable error. Do not partially lock gifts.

Payment result behavior:

- WeChat or balance payment success changes locked gifts for that order to `redeemed`, with `redeemedOrderId` and `redeemedAt`.
- Payment failure, cancellation, or timeout releases locked gifts back to `available`, with `releasedAt` updated for audit.
- Balance payment failure should not leave gifts locked. If gifts were locked during order creation, the failure path must release them immediately.
- Order detail pages and merchant order detail pages display gift snapshots from the order, not current user gift records.

## Customer Gift Pages

Add:

```text
/pages/my-gifts/index
```

Profile page adds a "My Gifts" entry.

Display groups:

- Available: usable gifts with name, description, and expiration date.
- Locked: gifts attached to an unpaid or processing order, with order ID.
- Used: redeemed gifts, with order ID and redeemed time.
- Expired: expired gifts, visible but disabled.

The checkout gift picker should use a stricter API than "my gifts": it returns only selectable available gifts.

## REST API Design

Customer APIs:

```http
GET /api/v1/customer/recharge-plans
POST /api/v1/customer/recharge-transactions
POST /api/v1/customer/recharge-transactions/:transactionId/payment-sync
GET /api/v1/customer/gifts
GET /api/v1/customer/checkout-gifts
```

Merchant APIs:

```http
GET /api/v1/merchant/recharge-plans
PUT /api/v1/merchant/recharge-plans
```

Existing APIs to extend:

- `POST /api/v1/customer/orders` accepts selected gift IDs and locks gifts.
- `POST /api/v1/customer/orders/:orderId/payment` redeems or releases gifts according to payment result.
- `POST /api/v1/customer/orders/:orderId/payment-sync` redeems gifts when WeChat payment succeeds and releases them on terminal failure.
- `POST /api/v1/payments/wechat/notify` routes successful notifications to either order settlement or recharge settlement.

Representative customer recharge transaction request:

```ts
interface CreateRechargeTransactionRequest {
  planId: string;
  idempotencyKey: string;
}
```

Representative response:

```ts
interface CreateRechargeTransactionResponse {
  ok: true;
  transaction: RechargeTransactionView;
  paymentParams: Record<string, unknown>;
}
```

## Error Handling

- Plan disabled or deleted: return a stable error code such as `RECHARGE_PLAN_UNAVAILABLE`; frontend refreshes plan list.
- Invalid plan config: merchant save returns field-level validation errors where possible.
- WeChat Pay cancelled: transaction remains pending or processing; customer can retry or create a new transaction.
- Payment success but settlement retry needed: sync and notification paths are idempotent and safe to repeat.
- Gift selection conflict: return `GIFT_UNAVAILABLE`; frontend refreshes checkout gift list.
- Gift expired between selection and submit: reject order with `GIFT_EXPIRED`; frontend refreshes checkout gift list.
- Balance payment insufficient funds: release locked gifts and return the existing insufficient balance behavior.

## Testing Scope

Shared and API tests:

- Recharge plan and gift validation.
- Create recharge transaction from enabled plan.
- Reject deleted or disabled plans.
- WeChat Pay sync and notification settlement for recharge.
- Idempotent recharge settlement creates one paid ledger, one bonus ledger, and one gift per configured gift row.
- User gift expiration grouping and checkout eligibility.
- Order creation locks selected gifts atomically.
- Payment success redeems locked gifts.
- Payment failure or insufficient balance releases locked gifts.
- Order snapshots preserve selected gift details.

Miniapp service and page tests:

- Merchant recharge config saves plans, gift descriptions, and valid days.
- Customer recharge page loads plans, selects a plan, starts payment, and displays settlement summary.
- Balance page and profile page expose recharge entry.
- Profile exposes "my gifts" entry.
- My gifts page groups available, locked, used, and expired gifts.
- Checkout page exposes gift row and selected count.
- Checkout gift picker supports multi-select and excludes expired gifts.

Out of scope:

- Cloud Functions parity.
- Product inventory linkage for gifts.
- Custom recharge amount.
- Refund automation for recharge transactions.
