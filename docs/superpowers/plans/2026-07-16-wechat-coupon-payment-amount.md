# WeChat Coupon Payment Amount Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make WeChat coupon-funded payments settle against the merchant order total while keeping the customer's post-coupon payment amount separate and preserving strict mismatch protection.

**Architecture:** Replace the ambiguous `paidAmountCents` result with explicit `orderAmountCents` and `payerAmountCents` fields at the WeChat provider boundary. Propagate only `orderAmountCents` into ordinary-order and recharge settlement validation through both active queries and asynchronous notifications. Keep existing transaction, ledger, gift, and idempotency behavior unchanged.

**Tech Stack:** TypeScript 5, Fastify 5, Prisma 6, Vitest, WeChat Pay API v3, pnpm workspace

## Global Constraints

- Validate settlement only against WeChat `amount.total`.
- Never accept `amount.payer_total` as a fallback for a missing or mismatched total.
- Preserve separate `payerAmountCents` for audit-facing semantics without using it to grant entitlement.
- Cover both ordinary orders and recharge transactions, for active sync and asynchronous notification paths.
- Preserve existing mismatch, signature, atomicity, and idempotency protections.
- Do not deploy to ECS, replay callbacks, call production payment-sync, or mutate RDS in this implementation.
- Do not alter the customer balance that the user already adjusted in the merchant app.
- Do not add real phone numbers, transaction IDs, credentials, or production payloads to tests.

---

## File Map

- `apps/api/src/modules/payments/provider.ts`: defines the provider result contract and maps WeChat query fields.
- `apps/api/src/modules/payments/provider.test.ts`: proves query responses keep `total` and `payer_total` distinct.
- `apps/api/src/modules/payments/notification-service.ts`: extracts and validates the order total from decrypted notifications.
- `apps/api/src/modules/payments/notification-service.test.ts`: covers coupon-funded order/recharge notifications and missing-total security behavior.
- `apps/api/src/modules/orders/service.ts`: validates active order sync against `orderAmountCents`.
- `apps/api/src/modules/orders/service.test.ts`: covers coupon-funded active order sync plus missing/mismatched totals.
- `apps/api/src/modules/recharge/service.ts`: validates active and callback recharge settlement against `orderAmountCents`.
- `apps/api/src/modules/recharge/service.test.ts`: covers coupon-funded active recharge sync plus settlement idempotency and mismatch guards.

### Task 1: Split WeChat query order total from payer total

**Files:**
- Modify: `apps/api/src/modules/payments/provider.test.ts`
- Modify: `apps/api/src/modules/payments/provider.ts:23-30,217-223,266-277`

**Interfaces:**
- Produces: `WechatPaymentSyncResult.orderAmountCents?: number`
- Produces: `WechatPaymentSyncResult.payerAmountCents?: number`
- Removes: `WechatPaymentSyncResult.paidAmountCents`

- [ ] **Step 1: Write the failing provider query regression**

Add a test inside `describe('createWechatPayProvider')` that returns a successful WeChat query with a coupon-reduced payer amount:

```ts
it('keeps the WeChat order total separate from the post-coupon payer total', async () => {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

  requestMock.mockImplementation((_, callback) => {
    const request = new EventEmitter() as EventEmitter & {
      write: ReturnType<typeof vi.fn>;
      end: ReturnType<typeof vi.fn>;
    };
    request.write = vi.fn();
    request.end = vi.fn(() => {
      const response = new EventEmitter() as EventEmitter & { statusCode: number };
      response.statusCode = 200;
      callback(response);
      response.emit('data', Buffer.from(JSON.stringify({
        trade_state: 'SUCCESS',
        transaction_id: 'wx-transaction-coupon',
        success_time: '2026-07-16T09:59:05+08:00',
        amount: { total: 50000, payer_total: 38500 }
      })));
      response.emit('end');
    });
    return request;
  });

  const provider = createWechatPayProvider({
    appId: 'wx-test-app',
    mchId: 'test-merchant',
    mchSerialNo: 'test-serial',
    privateKey: privatePem,
    notifyUrl: 'https://api.example.test/api/v1/payments/wechat/notify'
  });

  await expect(provider.syncWechatPayment(
    { id: 'recharge-coupon-case', description: 'Test recharge', amount: 500 },
    { openid: 'openid-test' }
  )).resolves.toMatchObject({
    tradeState: 'SUCCESS',
    orderAmountCents: 50000,
    payerAmountCents: 38500
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
pnpm --filter @xiaipet/api exec vitest run --config vitest.config.ts src/modules/payments/provider.test.ts -t "keeps the WeChat order total separate"
```

Expected: FAIL because `orderAmountCents` and `payerAmountCents` are absent and the current provider returns only `paidAmountCents: 38500`.

- [ ] **Step 3: Implement the explicit provider contract**

Replace the result amount field:

```ts
export interface WechatPaymentSyncResult {
  tradeState: string;
  transactionId?: string;
  paidAt?: Date;
  orderAmountCents?: number;
  payerAmountCents?: number;
  failureCode?: string;
  failureMessage?: string;
}
```

Return both fields from the mock provider:

```ts
const amountCents = toCents(subject.amount);
return {
  tradeState: 'SUCCESS',
  transactionId: `mock-transaction-${subject.id}-${amountCents}`,
  paidAt: new Date(),
  orderAmountCents: amountCents,
  payerAmountCents: amountCents
};
```

Map the WeChat query response without fallback:

```ts
return {
  tradeState: response.trade_state ?? 'UNKNOWN',
  transactionId: response.transaction_id,
  paidAt: response.success_time ? new Date(response.success_time) : undefined,
  orderAmountCents: response.amount?.total,
  payerAmountCents: response.amount?.payer_total,
  failureCode: response.trade_state && response.trade_state !== 'SUCCESS' ? response.trade_state : undefined,
  failureMessage: response.trade_state_desc
};
```

- [ ] **Step 4: Run the provider tests and verify GREEN**

Run:

```bash
pnpm --filter @xiaipet/api exec vitest run --config vitest.config.ts src/modules/payments/provider.test.ts
```

Expected: all provider tests PASS with no unhandled errors.

- [ ] **Step 5: Commit the provider contract**

```bash
git add apps/api/src/modules/payments/provider.ts apps/api/src/modules/payments/provider.test.ts
git commit -m "fix(api): separate wechat order and payer amounts"
```

### Task 2: Use order total for asynchronous payment notifications

**Files:**
- Modify: `apps/api/src/modules/payments/notification-service.test.ts`
- Modify: `apps/api/src/modules/payments/notification-service.ts:68-76,92-108,135-147`

**Interfaces:**
- Consumes: decrypted WeChat `amount.total?: number` and `amount.payer_total?: number`
- Produces: recharge settlement input `{ transactionId, paidAt, orderAmountCents }`
- Produces: ordinary-order validation against `orderAmountCents`

- [ ] **Step 1: Write failing coupon-notification regressions**

Change the recharge notification success fixture to represent a coupon-funded CNY 500 recharge and assert the total reaches settlement:

```ts
amount: {
  total: 50000,
  payer_total: 38500
}
```

```ts
expect(rechargeSettlementMock).toHaveBeenCalledWith('recharge-coupon-case', {
  transactionId: 'wx-recharge-transaction-1',
  paidAt: new Date('2026-06-10T17:02:03.000Z'),
  orderAmountCents: 50000
});
```

Add this complete ordinary-order coupon test:

```ts
it('settles coupon-funded order notifications against the order total', async () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const orderUpdate = vi.fn(async ({ where }: { where: { id: string } }) => createOrderRow(where.id));
  const client = {
    payment: { upsert: vi.fn(async () => ({})) },
    order: {
      findUnique: vi.fn(async () => createOrderRow('order-coupon', {
        paymentStatus: 'PROCESSING',
        status: 'PAYMENT_PROCESSING',
        payableTotal: { toNumber: () => 100 }
      })),
      update: orderUpdate
    },
    userGift: { updateMany: vi.fn(async () => ({ count: 0 })) }
  } as unknown as DbClient;
  const rawBody = JSON.stringify({
    id: 'notice-coupon',
    resource: encryptResource({
      out_trade_no: 'order-coupon',
      transaction_id: 'wx-order-coupon',
      trade_state: 'SUCCESS',
      success_time: '2026-07-16T09:59:05+08:00',
      amount: { total: 10000, payer_total: 7700 }
    })
  });
  const timestamp = '1700000000';
  const nonce = randomBytes(12).toString('hex');
  const service = createPaymentNotifyService({
    mchId: '1113847744',
    mchSerialNo: 'merchant-serial',
    privateKey: privatePem,
    notifyUrl: 'https://api.example.test/api/v1/payments/wechat/notify',
    apiV3Key: API_V3_KEY,
    platformPublicKey: publicPem
  }, client);

  await expect(service.handleWechatPayNotification({
    rawBody,
    headers: {
      timestamp,
      nonce,
      serial: 'platform-serial',
      signature: signBody(privatePem, timestamp, nonce, rawBody)
    }
  })).resolves.toEqual({ ok: true });

  expect(orderUpdate).toHaveBeenCalledWith(expect.objectContaining({
    where: { id: 'order-coupon' },
    data: expect.objectContaining({ status: 'PAID', paymentStatus: 'PAID' })
  }));
});
```

Strengthen the missing-total test so `payer_total` is present but `total` is absent:

```ts
amount: {
  payer_total: 38500
}
```

Keep the existing signed-notification call and assertion:

```ts
await expect(service.handleWechatPayNotification({
  rawBody,
  headers: {
    timestamp,
    nonce,
    serial: 'platform-serial',
    signature: signBody(privatePem, timestamp, nonce, rawBody)
  }
})).rejects.toMatchObject({
  code: 'WECHAT_PAY_NOTIFY_AMOUNT_MISSING',
  statusCode: 400
});
```

- [ ] **Step 2: Run notification tests and verify RED**

Run:

```bash
pnpm --filter @xiaipet/api exec vitest run --config vitest.config.ts src/modules/payments/notification-service.test.ts
```

Expected: FAIL because coupon cases pass `payer_total`, and a missing `total` with present `payer_total` is currently accepted.

- [ ] **Step 3: Require and propagate `amount.total`**

Replace the ambiguous extractor:

```ts
function requireOrderAmountCents(resource: WechatPayTransactionResource) {
  const amount = resource.amount?.total;
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    throw new ApiError('WECHAT_PAY_NOTIFY_AMOUNT_MISSING', 'WeChat Pay notification missing order amount', 400);
  }
  return amount;
}
```

Rename the ordinary-order validation parameter to `orderAmountCents` and compare it with the persisted payable total:

```ts
async function assertOrderPaymentAmountMatches(client: DbClient, orderId: string, orderAmountCents: number) {
  const order = await client.order.findUnique({
    where: { id: orderId },
    select: { payableTotal: true }
  });
  if (!order) {
    throw new ApiError('ORDER_NOT_FOUND', 'Order not found', 404);
  }
  if (toCents(decimalToNumber(order.payableTotal)) !== orderAmountCents) {
    throw new ApiError('ORDER_PAYMENT_AMOUNT_MISMATCH', 'Order payment amount does not match order total', 409);
  }
}
```

Use the extracted total in routing:

```ts
const orderAmountCents = requireOrderAmountCents(resource);
if (resource.out_trade_no.startsWith('recharge-')) {
  await createRechargeService(client as never).settleWechatRechargePayment(resource.out_trade_no, {
    transactionId: resource.transaction_id,
    paidAt,
    orderAmountCents
  });
} else {
  await assertOrderPaymentAmountMatches(client, resource.out_trade_no, orderAmountCents);
  // Preserve the existing order settlement call.
}
```

- [ ] **Step 4: Run notification tests and verify GREEN**

Run:

```bash
pnpm --filter @xiaipet/api exec vitest run --config vitest.config.ts src/modules/payments/notification-service.test.ts
```

Expected: all notification tests PASS, including coupon-funded order/recharge and missing-total guards.

- [ ] **Step 5: Commit notification handling**

```bash
git add apps/api/src/modules/payments/notification-service.ts apps/api/src/modules/payments/notification-service.test.ts
git commit -m "fix(api): validate wechat notifications by order total"
```

### Task 3: Propagate the explicit amount contract through active order and recharge sync

**Files:**
- Modify: `apps/api/src/modules/orders/service.test.ts`
- Modify: `apps/api/src/modules/orders/service.ts:683-690,840-850`
- Modify: `apps/api/src/modules/recharge/service.test.ts`
- Modify: `apps/api/src/modules/recharge/service.ts:74-79,315-324,335-352`

**Interfaces:**
- Consumes: `WechatPaymentSyncResult.orderAmountCents?: number`
- Consumes: `WechatPaymentSyncResult.payerAmountCents?: number`
- Produces: `settleWechatRechargePayment(outTradeNo, { transactionId?, paidAt?, orderAmountCents? })`

- [ ] **Step 1: Write failing active-sync coupon regressions**

In the existing successful ordinary-order active-sync test, replace its provider result with a matching total and lower payer amount:

```ts
syncWechatPayment: vi.fn(async () => ({
  tradeState: 'SUCCESS',
  transactionId: 'wx-transaction-coupon',
  paidAt: new Date('2026-07-16T01:59:05.000Z'),
  orderAmountCents: 6800,
  payerAmountCents: 5300
}))
```

Keep the existing assertion that `syncCustomerPayment` marks the order paid. In `rejects WeChat payment sync success when the paid amount does not match the order total`, replace the provider amount fields with:

```ts
orderAmountCents: 6700,
payerAmountCents: 6800
```

The existing `ORDER_PAYMENT_AMOUNT_MISMATCH` assertion must remain unchanged.

In `syncs a customer recharge payment and settles successful WeChat payments`, replace its provider result with:

```ts
syncWechatPayment: vi.fn(async () => ({
  tradeState: 'SUCCESS',
  transactionId: 'wx-recharge-coupon',
  paidAt,
  orderAmountCents: 10000,
  payerAmountCents: 7700
}))
```

Keep the existing assertions that two balance ledgers are created. In the recharge mismatch test, replace the amount fields with:

```ts
orderAmountCents: 9900,
payerAmountCents: 10000
```

The existing `RECHARGE_PAYMENT_AMOUNT_MISMATCH` assertion must remain unchanged.

- [ ] **Step 2: Run focused service tests and verify RED**

Run:

```bash
pnpm --filter @xiaipet/api exec vitest run --config vitest.config.ts src/modules/orders/service.test.ts src/modules/recharge/service.test.ts
```

Expected: coupon success tests fail with amount-missing errors because current consumers still read `paidAmountCents`.

- [ ] **Step 3: Update ordinary-order active sync**

Rename and use the explicit total:

```ts
function assertSyncedPaymentAmountMatchesOrder(order: OrderRecord, orderAmountCents?: number) {
  if (orderAmountCents === undefined) {
    throw new ApiError('ORDER_PAYMENT_AMOUNT_MISSING', 'Order payment amount is required for settlement', 409);
  }
  if (orderAmountCents !== toCents(order.pricing.payableTotal)) {
    throw new ApiError('ORDER_PAYMENT_AMOUNT_MISMATCH', 'Order payment amount does not match order total', 409);
  }
}
```

```ts
assertSyncedPaymentAmountMatchesOrder(order, syncedPayment.orderAmountCents);
```

- [ ] **Step 4: Update recharge sync and settlement**

Rename the settlement payload:

```ts
interface WechatRechargeSettlementPayment {
  transactionId?: string;
  paidAt?: Date;
  orderAmountCents?: number;
}
```

Pass the total from active sync:

```ts
const settled = await this.settleWechatRechargePayment((transaction as RechargeTransactionRow).outTradeNo, {
  transactionId: syncedPayment.transactionId,
  paidAt: syncedPayment.paidAt ?? new Date(),
  orderAmountCents: syncedPayment.orderAmountCents
});
```

Validate it inside the transaction:

```ts
if (payment.orderAmountCents === undefined) {
  throw new ApiError('RECHARGE_PAYMENT_AMOUNT_MISSING', 'Recharge payment amount is required for settlement', 409);
}
if (payment.orderAmountCents !== toCents(toNumber(existing.paidAmount))) {
  throw new ApiError('RECHARGE_PAYMENT_AMOUNT_MISMATCH', 'Recharge payment amount does not match transaction amount', 409);
}
```

Mechanically replace test-only settlement inputs from `paidAmountCents` to `orderAmountCents`. Do not change principal, bonus, gift, or idempotency assertions.

- [ ] **Step 5: Run service tests and verify GREEN**

Run:

```bash
pnpm --filter @xiaipet/api exec vitest run --config vitest.config.ts src/modules/orders/service.test.ts src/modules/recharge/service.test.ts
```

Expected: all order and recharge service tests PASS; coupon-funded success paths settle and mismatched totals remain blocked.

- [ ] **Step 6: Commit service propagation**

```bash
git add apps/api/src/modules/orders/service.ts apps/api/src/modules/orders/service.test.ts apps/api/src/modules/recharge/service.ts apps/api/src/modules/recharge/service.test.ts
git commit -m "fix(api): settle synced payments by order total"
```

### Task 4: Run complete API verification and record the release boundary

**Files:**
- Verify: all files modified in Tasks 1-3

**Interfaces:**
- Consumes: completed provider, notification, order, and recharge changes
- Produces: release-ready local code with no production deployment or balance mutation

- [ ] **Step 1: Check for stale ambiguous amount fields**

Run:

```bash
rg -n "paidAmountCents|payer_total \?\? .*total" apps/api/src
```

Expected: no remaining settlement contract or fallback uses. References inside historical test descriptions are renamed to order amount where appropriate.

- [ ] **Step 2: Run focused payment regression tests**

Run:

```bash
pnpm --filter @xiaipet/api exec vitest run --config vitest.config.ts src/modules/payments/provider.test.ts src/modules/payments/notification-service.test.ts src/modules/orders/service.test.ts src/modules/recharge/service.test.ts src/routes/recharge.routes.test.ts src/routes/payments.routes.test.ts
```

Expected: all focused suites PASS with zero failed tests.

- [ ] **Step 3: Run the full API test suite**

Run:

```bash
pnpm --filter @xiaipet/api test
```

Expected: Vitest exits 0 with zero failed test files and zero failed tests.

- [ ] **Step 4: Run typecheck**

Run:

```bash
pnpm --filter @xiaipet/api typecheck
```

Expected: TypeScript exits 0 with no diagnostics.

- [ ] **Step 5: Run the production build**

Run:

```bash
pnpm --filter @xiaipet/api build
```

Expected: Prisma generation and TypeScript build exit 0 and refresh `apps/api/dist` without secrets.

- [ ] **Step 6: Inspect the final diff and confirm production exclusion**

Run:

```bash
git diff --check
git status --short
git diff -- apps/api/src/modules/payments apps/api/src/modules/orders/service.ts apps/api/src/modules/orders/service.test.ts apps/api/src/modules/recharge
```

Expected: only intended source/test changes plus any pre-existing unrelated workspace files. No ECS, RDS, production callback, or balance operation has run.

## Production Safety Handoff

Do not deploy this plan directly. The affected production recharge remains `PROCESSING` and the user has already adjusted the balance manually. Before a later deployment, a separately approved reconciliation task must verify the manual ledger amount, bonus/gift handling, and make that transaction non-settleable without changing the balance again. This implementation plan contains no production write step.
