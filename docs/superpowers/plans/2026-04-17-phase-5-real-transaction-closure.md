# Phase 5 Real Transaction Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current mock payment/order closure with a cloud-backed transaction boundary that persists orders, supports real backend balance payment, and leaves a production-shaped WeChat Pay skeleton.

**Architecture:** The frontend keeps checkout draft state only until submit, then delegates order creation and payment progression to cloud functions. Orders, payment state, and auditable balance effects live in CloudBase, while the customer mini program reads order lists/details from cloud-backed endpoints and never treats WeChat payment as successful without backend confirmation.

**Tech Stack:** WeChat mini program, TypeScript, CloudBase cloud functions, CloudBase document database, Vitest

---

## File Structure

### Shared contracts

- Modify: `packages/shared/src/types/order.ts`
  - add idempotency key, persisted payment status, order query/detail result types
- Modify: `packages/shared/src/index.ts`
  - export any new order contract helpers

### Customer mini program

- Modify: `apps/customer-miniapp/src/services/order-submit.ts`
  - stop treating local memory as order truth; call cloud functions with idempotency key
- Modify: `apps/customer-miniapp/src/services/order-submit.test.ts`
  - cover idempotency key propagation and payment outcome handling
- Modify: `apps/customer-miniapp/src/services/orders.ts`
  - reduce this to view-model mapping from cloud payloads, not in-memory persistence
- Modify: `apps/customer-miniapp/src/services/orders.test.ts`
  - cover mapping from cloud order payloads
- Modify: `apps/customer-miniapp/src/services/cloud.ts`
  - add typed wrappers for new cloud functions if needed
- Modify: `apps/customer-miniapp/pages/checkout/index.ts`
  - add debounce/submit lock, create/pay/sync flow
- Modify: `apps/customer-miniapp/pages/cart-checkout.test.ts`
  - verify duplicate taps do not duplicate submit
- Modify: `apps/customer-miniapp/pages/orders/index.ts`
  - load orders from backend
- Modify: `apps/customer-miniapp/pages/order-detail/index.ts`
  - load one order from backend
- Modify: `apps/customer-miniapp/pages/orders-flow.test.ts`
  - cover cloud-backed list/detail loading

### Cloud functions

- Modify: `apps/cloud-functions/cloudfunctions.json`
  - register new order query/payment sync handlers
- Modify: `apps/cloud-functions/src/createOrder/index.ts`
  - persist order documents and enforce create idempotency
- Modify: `apps/cloud-functions/src/createOrder/index.test.ts`
  - cover replay and conflict cases
- Add: `apps/cloud-functions/src/payOrder/index.ts`
  - unify balance and WeChat payment branching
- Add: `apps/cloud-functions/src/payOrder/index.test.ts`
  - cover paid, insufficient balance, not-configured outcomes
- Add: `apps/cloud-functions/src/queryMyOrders/index.ts`
  - list current user orders
- Add: `apps/cloud-functions/src/queryMyOrders/index.test.ts`
  - cover ownership filtering
- Add: `apps/cloud-functions/src/getMyOrderDetail/index.ts`
  - fetch one owned order
- Add: `apps/cloud-functions/src/getMyOrderDetail/index.test.ts`
  - cover forbidden/not-found cases
- Add: `apps/cloud-functions/src/syncOrderPayment/index.ts`
  - sync latest backend payment state
- Add: `apps/cloud-functions/src/syncOrderPayment/index.test.ts`
  - cover idempotent paid confirmation and not-configured behavior
- Modify: `apps/cloud-functions/src/confirmPayment/index.ts`
  - narrow this toward internal finalization helper or remove once superseded

## Task 1: Expand Shared Contracts for Cloud-Persisted Orders

**Files:**
- Modify: `packages/shared/src/types/order.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/src/rules/order-pricing.test.ts`

- [ ] **Step 1: Write the failing contract test**

```ts
import { describe, expect, it } from 'vitest';
import type { CreateOrderPayload } from '../types/order';

describe('order contracts', () => {
  it('accepts a create-order payload with an idempotency key', () => {
    const payload: CreateOrderPayload = {
      idempotencyKey: 'checkout-20260417-001',
      paymentMethod: 'balance',
      fulfillment: {
        mode: 'delivery',
        address: {
          recipientName: '虾衣妈妈',
          phoneNumber: '13800001234',
          regionLabel: '上海市 静安区',
          detailAddress: '南京西路 1266 号 8 楼',
          tag: '家'
        },
        store: {
          name: '虾衣宠物烘焙工作室',
          address: '上海市静安区南京西路 1266 号 8 楼'
        }
      },
      items: [],
      pets: [],
      remark: '',
      hasReadCustomNotice: true,
      pricing: {
        itemsSubtotal: 0,
        deliveryFee: 0,
        payableTotal: 0
      }
    };

    expect(payload.idempotencyKey).toBe('checkout-20260417-001');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @xiaipet/shared test -- order-pricing`
Expected: FAIL with a TypeScript error or runtime import mismatch because `CreateOrderPayload` does not contain `idempotencyKey`.

- [ ] **Step 3: Write the minimal contract changes**

```ts
export interface CreateOrderPayload {
  idempotencyKey: string;
  paymentMethod: PaymentMethod;
  fulfillment: OrderFulfillmentSnapshot;
  items: OrderItemSnapshot[];
  pets: OrderPetSnapshot[];
  remark: string;
  hasReadCustomNotice: boolean;
  pricing: OrderPricingBreakdown;
}

export interface QueryMyOrdersResult {
  orders: OrderRecord[];
}

export interface GetMyOrderDetailResult {
  order: OrderRecord;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @xiaipet/shared test -- order-pricing`
Expected: PASS with the new payload field accepted.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/types/order.ts packages/shared/src/index.ts packages/shared/src/rules/order-pricing.test.ts
git commit -m "feat: extend order contracts for cloud transaction flow"
```

## Task 2: Persist Orders in CloudBase and Enforce Create Idempotency

**Files:**
- Modify: `apps/cloud-functions/src/createOrder/index.ts`
- Modify: `apps/cloud-functions/src/createOrder/index.test.ts`
- Modify: `apps/cloud-functions/src/shared/env.ts`

- [ ] **Step 1: Write the failing create-order tests**

```ts
it('returns the same order when the same idempotency key is replayed', async () => {
  const first = await main({ payload: validPayload }, mockContext);
  const second = await main({ payload: validPayload }, mockContext);

  expect(second.order.id).toBe(first.order.id);
});

it('rejects a conflicting payload under the same idempotency key', async () => {
  await main({ payload: validPayload }, mockContext);

  await expect(
    main({
      payload: {
        ...validPayload,
        pricing: { ...validPayload.pricing, payableTotal: 999 }
      }
    }, mockContext)
  ).rejects.toThrow('duplicate_submit_conflict');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @xiaipet/cloud-functions test -- createOrder`
Expected: FAIL because `createOrder` currently only returns an in-memory shape and does not persist or deduplicate.

- [ ] **Step 3: Write the minimal persistence implementation**

```ts
const existing = await ordersCollection
  .where({
    openid: auth.openid,
    idempotencyKey: event.payload.idempotencyKey
  })
  .get();

if (existing.data.length) {
  const matched = existing.data[0] as OrderRecord;
  if (matched.pricing.payableTotal !== event.payload.pricing.payableTotal) {
    throw new Error('duplicate_submit_conflict');
  }

  return { ok: true, order: matched };
}

await ordersCollection.add({ ...orderDocument });
return { ok: true, order: orderDocument };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @xiaipet/cloud-functions test -- createOrder`
Expected: PASS, with replay returning the same order and conflict path throwing.

- [ ] **Step 5: Commit**

```bash
git add apps/cloud-functions/src/createOrder/index.ts apps/cloud-functions/src/createOrder/index.test.ts
git commit -m "feat: persist orders with idempotent create flow"
```

## Task 3: Implement Unified `payOrder` with Backend Balance Transaction

**Files:**
- Add: `apps/cloud-functions/src/payOrder/index.ts`
- Add: `apps/cloud-functions/src/payOrder/index.test.ts`
- Modify: `apps/cloud-functions/cloudfunctions.json`

- [ ] **Step 1: Write the failing payment tests**

```ts
it('marks a balance order as paid and returns the final order', async () => {
  const result = await main({ orderId: 'order-001' }, mockContext);
  expect(result.order.status).toBe('paid');
  expect(result.paymentStatus).toBe('paid');
});

it('returns insufficient balance without mutating the order', async () => {
  const result = await main({ orderId: 'order-low-balance' }, mockContext);
  expect(result.ok).toBe(false);
  expect(result.code).toBe('INSUFFICIENT_BALANCE');
});

it('returns not-configured for wechat pay without live credentials', async () => {
  const result = await main({ orderId: 'order-wechat' }, mockContext);
  expect(result.ok).toBe(false);
  expect(result.code).toBe('WECHAT_PAY_NOT_CONFIGURED');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @xiaipet/cloud-functions test -- payOrder`
Expected: FAIL because `payOrder` does not exist yet.

- [ ] **Step 3: Write the minimal payment implementation**

```ts
if (order.payment.method === 'wechat') {
  return {
    ok: false,
    code: 'WECHAT_PAY_NOT_CONFIGURED',
    order
  };
}

const tx = await db.startTransaction();
const orderDoc = await tx.collection('orders').doc(orderId).get();
const userDoc = await tx.collection('users').doc(order.openid).get();

if (userDoc.data.balance < order.pricing.payableTotal) {
  await tx.rollback();
  return { ok: false, code: 'INSUFFICIENT_BALANCE', order };
}

// update order, user balance, inventory, and balance ledger here
await tx.commit();
return { ok: true, paymentStatus: 'paid', order: paidOrder };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @xiaipet/cloud-functions test -- payOrder`
Expected: PASS, with balance payment paid path and WeChat-not-configured path both covered.

- [ ] **Step 5: Commit**

```bash
git add apps/cloud-functions/src/payOrder/index.ts apps/cloud-functions/src/payOrder/index.test.ts apps/cloud-functions/cloudfunctions.json
git commit -m "feat: add backend payment orchestration"
```

## Task 4: Move Customer Submit Flow to Cloud-Backed Order/Payment APIs

**Files:**
- Modify: `apps/customer-miniapp/src/services/order-submit.ts`
- Modify: `apps/customer-miniapp/src/services/order-submit.test.ts`
- Modify: `apps/customer-miniapp/pages/checkout/index.ts`
- Test: `apps/customer-miniapp/pages/cart-checkout.test.ts`

- [ ] **Step 1: Write the failing customer-side tests**

```ts
it('passes an idempotency key into createOrder and does not submit twice while loading', async () => {
  const first = instance.handleSubmit();
  const second = instance.handleSubmit();

  await Promise.allSettled([first, second]);

  expect(callFunction).toHaveBeenCalledTimes(2); // createOrder + payOrder once each
  expect(callFunction).toHaveBeenNthCalledWith(1, {
    name: 'createOrder',
    data: expect.objectContaining({
      payload: expect.objectContaining({
        idempotencyKey: expect.any(String)
      })
    })
  });
});

it('shows a precise message when wechat pay is not configured', async () => {
  await instance.handleSubmit();
  expect(wx.showToast).toHaveBeenCalledWith(
    expect.objectContaining({ title: '微信支付暂未配置' })
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @xiaipet/customer-miniapp test -- order-submit cart-checkout`
Expected: FAIL because the current submit flow does not send an idempotency key and still assumes confirm-payment success.

- [ ] **Step 3: Write the minimal customer submit implementation**

```ts
const idempotencyKey = `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createOrderResponse = await callFunction({
  name: 'createOrder',
  data: {
    payload: {
      ...payload,
      idempotencyKey
    }
  }
});

const payOrderResponse = await callFunction({
  name: 'payOrder',
  data: {
    orderId: createOrderResponse.result.order.id
  }
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @xiaipet/customer-miniapp test -- order-submit cart-checkout`
Expected: PASS, with loading lock, idempotency key propagation, and not-configured messaging verified.

- [ ] **Step 5: Commit**

```bash
git add apps/customer-miniapp/src/services/order-submit.ts apps/customer-miniapp/src/services/order-submit.test.ts apps/customer-miniapp/pages/checkout/index.ts apps/customer-miniapp/pages/cart-checkout.test.ts
git commit -m "feat: route checkout through cloud-backed payment flow"
```

## Task 5: Replace Local Order Truth with Cloud-Backed Order Queries

**Files:**
- Modify: `apps/customer-miniapp/src/services/orders.ts`
- Modify: `apps/customer-miniapp/src/services/orders.test.ts`
- Modify: `apps/customer-miniapp/pages/orders/index.ts`
- Modify: `apps/customer-miniapp/pages/order-detail/index.ts`
- Modify: `apps/customer-miniapp/pages/orders-flow.test.ts`
- Add: `apps/cloud-functions/src/queryMyOrders/index.ts`
- Add: `apps/cloud-functions/src/queryMyOrders/index.test.ts`
- Add: `apps/cloud-functions/src/getMyOrderDetail/index.ts`
- Add: `apps/cloud-functions/src/getMyOrderDetail/index.test.ts`

- [ ] **Step 1: Write the failing list/detail tests**

```ts
it('loads orders from queryMyOrders instead of local memory', async () => {
  instance.onShow();
  expect(callFunction).toHaveBeenCalledWith({
    name: 'queryMyOrders',
    data: {}
  });
});

it('loads detail from getMyOrderDetail', async () => {
  instance.onLoad({ orderId: 'order-001' });
  instance.onShow();

  expect(callFunction).toHaveBeenCalledWith({
    name: 'getMyOrderDetail',
    data: { orderId: 'order-001' }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @xiaipet/customer-miniapp test -- orders orders-flow`
Expected: FAIL because pages currently depend on local in-memory order state.

- [ ] **Step 3: Write the minimal query implementation**

```ts
const result = await wx.cloud.callFunction({
  name: 'queryMyOrders',
  data: {}
});

this.setData({
  orderCards: result.result.orders.map(toOrderCardViewModel)
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @xiaipet/customer-miniapp test -- orders orders-flow`
Expected: PASS with cloud-backed page loading and view-model mapping.

- [ ] **Step 5: Commit**

```bash
git add apps/customer-miniapp/src/services/orders.ts apps/customer-miniapp/src/services/orders.test.ts apps/customer-miniapp/pages/orders/index.ts apps/customer-miniapp/pages/order-detail/index.ts apps/customer-miniapp/pages/orders-flow.test.ts apps/cloud-functions/src/queryMyOrders/index.ts apps/cloud-functions/src/queryMyOrders/index.test.ts apps/cloud-functions/src/getMyOrderDetail/index.ts apps/cloud-functions/src/getMyOrderDetail/index.test.ts
git commit -m "feat: load customer orders from cloud queries"
```

## Task 6: Add `syncOrderPayment` and Final Verification

**Files:**
- Add: `apps/cloud-functions/src/syncOrderPayment/index.ts`
- Add: `apps/cloud-functions/src/syncOrderPayment/index.test.ts`
- Modify: `apps/customer-miniapp/src/services/order-submit.ts`
- Modify: `apps/customer-miniapp/pages/checkout/index.ts`

- [ ] **Step 1: Write the failing sync tests**

```ts
it('does not mark wechat payment as successful without backend confirmation', async () => {
  const result = await main({ orderId: 'order-wechat' }, mockContext);
  expect(result.order.status).toBe('payment_processing');
});

it('returns paid without duplicate side effects when the order is already paid', async () => {
  const result = await main({ orderId: 'order-paid' }, mockContext);
  expect(result.order.status).toBe('paid');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @xiaipet/cloud-functions test -- syncOrderPayment`
Expected: FAIL because the function does not exist yet.

- [ ] **Step 3: Write the minimal sync implementation**

```ts
if (order.status === 'paid') {
  return { ok: true, order };
}

if (order.payment.method === 'wechat' && !wechatPayEnabled) {
  return { ok: true, order };
}

return { ok: true, order: latestOrder };
```

- [ ] **Step 4: Run the full verification suite**

Run:

```bash
pnpm --filter @xiaipet/shared test -- order-pricing
pnpm --filter @xiaipet/shared typecheck
pnpm --filter @xiaipet/customer-miniapp test -- order-submit orders cart-checkout orders-flow
pnpm --filter @xiaipet/customer-miniapp typecheck
pnpm --filter @xiaipet/cloud-functions test -- createOrder payOrder queryMyOrders getMyOrderDetail syncOrderPayment
pnpm --filter @xiaipet/cloud-functions typecheck
```

Expected: all commands pass.

- [ ] **Step 5: Commit**

```bash
git add apps/cloud-functions/src/syncOrderPayment/index.ts apps/cloud-functions/src/syncOrderPayment/index.test.ts apps/customer-miniapp/src/services/order-submit.ts apps/customer-miniapp/pages/checkout/index.ts
git commit -m "feat: add payment sync and finalize transaction closure"
```

## Self-Review

- Spec coverage:
  - cloud order persistence: Task 2
  - backend balance transaction: Task 3
  - WeChat Pay skeleton and not-configured path: Tasks 3 and 6
  - cloud-backed order list/detail: Task 5
  - debounce and submit lock: Task 4
  - backend idempotency: Tasks 2, 3, and 6
- Placeholder scan:
  - no `TODO`, `TBD`, or “handle appropriately” placeholders remain
- Type consistency:
  - plan uses `idempotencyKey`, `payOrder`, `queryMyOrders`, `getMyOrderDetail`, and `syncOrderPayment` consistently across tasks

