# Phase 5 Real Transaction Closure Design

Date: 2026-04-17
Project: XiAiPet
Scope: Replace the current mock payment/order closure in Phase 5 with a production-shaped backend boundary that persists orders in CloudBase, supports real backend balance payment, and prepares the WeChat Pay flow without requiring live merchant credentials yet.

## Context

Phase 5 currently has a user-visible checkout flow, payment method selection, and order list/detail pages, but the final closure is still backed by a local client-side order store and mock payment confirmation. That is not acceptable as the long-term boundary because:

- order history must be trustworthy and queryable from the cloud
- balance deduction must happen on the backend with an auditable ledger
- duplicate taps and retries must not create duplicate orders
- WeChat Pay must eventually slot into the existing checkout flow without rewriting the frontend path again

The goal of this design is to convert Phase 5 from a demo-grade closure into a production-shaped transaction skeleton, while deferring live WeChat Pay credentials and final platform callbacks until the business paperwork is ready.

## Goals

- Persist customer orders in CloudBase instead of local in-memory state.
- Move order list/detail pages to cloud-backed data reads.
- Make balance payment a real backend transaction that updates order state, inventory, and balance ledger consistently.
- Add frontend debounce and backend idempotency for all order submission and payment initiation actions.
- Keep a WeChat Pay integration boundary in place so live credentials can be added later without redesigning checkout.

## Non-Goals

- Live WeChat Pay production integration with real merchant credentials.
- Real payment callback signature verification against live WeChat payloads.
- Refunds, order auto-close, or after-sales workflows.
- Merchant-side order UI for status operations.

## Recommended Approach

Use a production-shaped backend design now:

- `createOrder` persists a `pending_payment` order to CloudBase.
- `payOrder` is the only payment entrypoint.
- `balance` payment executes as a backend transaction.
- `wechat` payment follows the formal structure, but returns `WECHAT_PAY_NOT_CONFIGURED` until live config exists.
- frontend checkout uses a submit lock plus idempotency key and never treats a WeChat payment attempt as success until backend state confirms it.

This is preferred over keeping mock payment behavior because it prevents another architectural rewrite when the WeChat Pay credentials become available.

## Architecture

### Client

The customer mini program keeps checkout draft state locally, but it is no longer the source of truth for orders after submit.

- checkout page:
  - generates a per-submit `idempotencyKey`
  - disables all order/payment buttons while a submission is in progress
  - calls `createOrder`
  - calls `payOrder`
  - for balance payment, redirects to orders only after backend returns `paid`
  - for WeChat payment, only calls `wx.requestPayment` if backend returns valid payment parameters
  - after `wx.requestPayment`, calls `syncOrderPayment(orderId)` instead of assuming success
- orders page:
  - loads data from `queryMyOrders`
- order detail page:
  - loads data from `getMyOrderDetail`

The local `orders.ts` service should be reduced to a page-facing view-model adapter only, or removed if page mapping is simple enough to live inside page loaders. It must not remain a client-side source of truth.

### Cloud Functions

The backend boundary is split into the following functions:

- `createOrder`
  - validates payload
  - enforces idempotent order creation using `openid + idempotencyKey`
  - writes the frozen snapshot and pricing into `orders`
  - returns the created or previously-created order
- `payOrder`
  - validates order ownership and current state
  - branches by payment method
  - `balance`: runs a backend transaction and returns `paid`
  - `wechat`: returns `WECHAT_PAY_NOT_CONFIGURED` until live config exists; later it will request a prepay order and return frontend payment params
- `queryMyOrders`
  - returns current user order cards
- `getMyOrderDetail`
  - returns one owned order detail payload
- `syncOrderPayment`
  - re-checks the latest backend payment state for a specific order
  - when later connected to live WeChat Pay, this becomes the frontend-safe post-payment status sync step
- `handlePaymentNotify`
  - reserved callback entrypoint for WeChat Pay result notifications
  - this function is scaffolded now as a backend boundary, but it is not considered live until payment credentials and callback deployment are available

## Data Model

### `orders`

Suggested shape:

```ts
interface OrderDocument {
  _id: string;
  orderNo: string;
  openid: string;
  status: 'pending_payment' | 'payment_processing' | 'paid' | 'payment_failed' | 'cancelled';
  idempotencyKey: string;
  pricing: {
    itemsSubtotal: number;
    deliveryFee: number;
    payableTotal: number;
  };
  payment: {
    method: 'wechat' | 'balance';
    status: 'pending' | 'processing' | 'paid' | 'failed';
    outTradeNo?: string;
    prepayId?: string;
    transactionId?: string;
    failureCode?: string;
    failureMessage?: string;
  };
  snapshot: {
    fulfillment: unknown;
    items: unknown[];
    pets: unknown[];
    remark: string;
  };
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  cancelledAt?: string;
}
```

### `balance_ledgers`

Suggested shape:

```ts
interface BalanceLedgerDocument {
  _id: string;
  openid: string;
  orderId: string;
  amountDelta: number;
  beforeBalance: number;
  afterBalance: number;
  reason: 'order_payment';
  createdAt: string;
}
```

### `users` or profile/balance source

Whichever collection currently owns customer balance must remain the single balance source. Balance updates must happen only in cloud functions.

### `products`

The inventory field remains on product documents, but all inventory writes must move behind cloud function transaction logic.

### `runtime_configs`

Reserve a runtime-facing schema for payment enablement:

```ts
interface RuntimeConfig {
  wechatPay: {
    enabled: boolean;
    appid?: string;
    mchid?: string;
    notifyUrl?: string;
  };
}
```

Sensitive secrets such as APIv3 key, merchant private key, and certificate material must not be stored in business collections. They belong in environment-level secure config.

## State Machine

### Order States

- `pending_payment`
  - order exists, no confirmed payment yet
- `payment_processing`
  - WeChat Pay has been initiated and backend is waiting for confirmed payment result
- `paid`
  - payment is confirmed and all business side effects are complete
- `payment_failed`
  - payment definitively failed
- `cancelled`
  - order cancelled by timeout or explicit operation

### Transition Rules

- `createOrder` always creates or returns an order in `pending_payment`
- `payOrder(balance)`
  - if successful, moves directly to `paid`
  - if insufficient balance, keeps order unpaid and returns a domain error
- `payOrder(wechat)`
  - with no payment config, does not move to success; returns `WECHAT_PAY_NOT_CONFIGURED`
  - with future live config, moves order to `payment_processing`
- `syncOrderPayment`
  - only moves to `paid` when backend payment confirmation is available
- `handlePaymentNotify`
  - must be idempotent and must not duplicate side effects

## Idempotency and Duplicate Submission Protection

### Frontend Guard

Every user-facing action that can create or progress an order must use:

- debounce on tap
- local submit lock while the request is pending
- disabled/loading visual state

This applies to:

- confirm order
- pay now
- balance pay confirmation

### Backend Guard

Frontend debounce is not sufficient. The backend must also be idempotent.

- `createOrder`
  - receives `idempotencyKey`
  - deduplicates by `openid + idempotencyKey`
  - returns the existing order if the same request is replayed
- `payOrder(balance)`
  - must detect that the order is already paid and return the current state without re-deducting balance or inventory
- `syncOrderPayment`
  - can be called repeatedly without duplicating side effects
- `handlePaymentNotify`
  - must accept repeated notification delivery safely

## Detailed Function Contracts

### `createOrder`

Input:

- checkout snapshot payload
- payment method
- pricing payload
- `idempotencyKey`

Output:

- `ok`
- order summary including `orderId`, `orderNo`, `status`

Failure conditions:

- invalid payload
- ownership/context mismatch
- duplicate request with conflicting content under the same idempotency key

### `payOrder`

Input:

- `orderId`

Output:

- balance path:
  - `ok`
  - final order status `paid`
- wechat path:
  - either payment params for `wx.requestPayment`
  - or `WECHAT_PAY_NOT_CONFIGURED`

Failure conditions:

- order not found
- order does not belong to current user
- order already terminal in an incompatible state
- insufficient balance
- payment not configured

### `queryMyOrders`

Input:

- pagination options
- optional status filter

Output:

- ordered card payloads for the current user only

### `getMyOrderDetail`

Input:

- `orderId`

Output:

- full frozen snapshot detail payload for the current user only

### `syncOrderPayment`

Input:

- `orderId`

Output:

- latest confirmed order state

Current behavior without credentials:

- returns existing order state only
- never fabricates payment success

Future behavior with credentials:

- checks WeChat payment status or confirmed notify result
- performs idempotent finalization if payment is confirmed

### `handlePaymentNotify`

Current behavior without credentials:

- defined as backend boundary only
- not exposed as a live completion path in production behavior yet

Future behavior with credentials:

- verifies notification authenticity
- finalizes the order if not already finalized

## Frontend Flow

### Balance Payment

1. user taps submit
2. frontend locks the button and creates `idempotencyKey`
3. frontend calls `createOrder`
4. frontend calls `payOrder(orderId)`
5. backend transaction finalizes payment
6. frontend redirects to orders page

### WeChat Payment Without Credentials

1. user taps submit
2. frontend locks the button and creates `idempotencyKey`
3. frontend calls `createOrder`
4. frontend calls `payOrder(orderId)`
5. backend returns `WECHAT_PAY_NOT_CONFIGURED`
6. frontend shows a precise message and keeps the order visible as unpaid

### WeChat Payment With Credentials Later

1. user taps submit
2. frontend calls `createOrder`
3. frontend calls `payOrder(orderId)`
4. backend returns `wx.requestPayment` parameters
5. frontend invokes `wx.requestPayment`
6. frontend calls `syncOrderPayment(orderId)` after the payment sheet returns
7. frontend only redirects to orders after backend confirms `paid`

## Error Handling

The UI should show explicit domain errors, not generic success/failure wording.

Required domain-level cases:

- `INSUFFICIENT_BALANCE`
- `WECHAT_PAY_NOT_CONFIGURED`
- `ORDER_NOT_FOUND`
- `ORDER_FORBIDDEN`
- `ORDER_ALREADY_PAID`
- `ORDER_NOT_PAYABLE`
- `DUPLICATE_SUBMIT_CONFLICT`

WeChat payment must never be shown as successful if:

- `wx.requestPayment` returns cancellation
- backend `syncOrderPayment` does not confirm `paid`
- the system is missing live payment config

## Testing Strategy

### Automated

- `createOrder` creates one order and returns the same order on replay with the same `idempotencyKey`
- `createOrder` rejects conflicting payload reuse for the same key
- `payOrder(balance)` succeeds with sufficient balance
- `payOrder(balance)` fails with insufficient balance
- `payOrder(balance)` is idempotent and does not re-deduct inventory or balance
- `queryMyOrders` returns only the caller's orders
- `getMyOrderDetail` enforces order ownership
- checkout button lock prevents duplicate submit calls at page level
- order list/detail pages render cloud-backed payloads correctly

### Manual

- balance payment success path
- insufficient balance path
- WeChat Pay not configured path
- order list/detail after successful balance payment
- repeated rapid taps on checkout buttons do not create duplicate orders

## Implementation Slices

This design is intentionally suited for a single follow-up implementation plan with these slices:

1. shared contract updates for idempotency key, order/payment states, and cloud-facing result types
2. cloud data access and `createOrder` persistence
3. backend balance payment transaction
4. frontend migration from local order store to cloud-backed order reads
5. WeChat Pay skeleton wiring, explicit not-configured handling, and `syncOrderPayment`
6. duplicate-submit protection and test coverage

## Risks

- if local order state remains in the app as a fallback truth, Phase 5 and Phase 6 will diverge on order behavior
- if idempotency exists only in the frontend, weak-network retries can still create duplicates
- if WeChat Pay is treated as success immediately after `wx.requestPayment`, paid status can drift from reality
- if balance deduction and inventory deduction are not in the same backend transaction, partial success can corrupt business data

## Decision Summary

- orders must be persisted in CloudBase
- balance payment must be executed on the backend with transaction semantics
- all order/payment buttons require frontend debounce and submit locks
- all create/pay operations require backend idempotency
- WeChat Pay is implemented as a formal integration boundary now, but returns `WECHAT_PAY_NOT_CONFIGURED` until credentials exist
- Phase 5 should be corrected to this trustworthy transaction boundary before moving on to real Phase 6 implementation
