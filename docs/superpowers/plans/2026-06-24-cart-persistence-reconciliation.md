# Cart Persistence Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist the customer miniapp cart locally, reconcile persisted cart lines against current product data, and make order creation validate current product/spec/price facts on the backend.

**Architecture:** Add a customer catalog cart resolve operation in the API, then reuse the same resolver from order creation. The customer miniapp cart service owns local storage, hydration, reconciliation state, and mutation persistence; pages call the service before showing badges and before checkout.

**Tech Stack:** TypeScript, WeChat miniapp APIs, Fastify route handlers, Prisma-backed API repositories, Vitest, pnpm workspace scripts.

---

### Task 1: API Cart Resolve

**Files:**
- Modify: `apps/api/src/modules/catalog/service.ts`
- Modify: `apps/api/src/routes/customer/catalog.ts`
- Test: `apps/api/src/modules/catalog/service.test.ts`
- Test: `apps/api/src/routes/customer-catalog.routes.test.ts`

- [ ] **Step 1: Write failing catalog service tests**

Add tests that call `createCatalogService(...).resolveCustomerCartLines({ lines })` and expect:
- products are resolved by `productId`, not pagination
- combined ids like `6-inch__salmon` resolve to the computed override price
- missing specs return `spec_unavailable`
- unpublished or missing products return unavailable statuses

- [ ] **Step 2: Run the focused API catalog tests**

Run: `pnpm --filter @xiaipet/api test -- src/modules/catalog/service.test.ts`

Expected: FAIL because `resolveCustomerCartLines` does not exist.

- [ ] **Step 3: Implement product-line resolution**

Add a resolver that:
- parses `productId`, `specId`, and `quantity`
- loads each product by id
- derives customer specs with the existing `getCustomerSpecs`
- returns one result per input line
- preserves product-level stock behavior
- marks unavailable products and specs without omitting lines

- [ ] **Step 4: Add customer route tests and route**

Add a route test for `POST /api/v1/customer/catalog/cart/resolve`, then add the route in `customerCatalogRoutes`.

- [ ] **Step 5: Verify API catalog tests pass**

Run: `pnpm --filter @xiaipet/api test -- src/modules/catalog/service.test.ts src/routes/customer-catalog.routes.test.ts`

Expected: PASS.

### Task 2: Order Backend Final Validation

**Files:**
- Modify: `apps/api/src/modules/orders/service.ts`
- Test: `apps/api/src/modules/orders/service.test.ts`

- [ ] **Step 1: Write failing order validation tests**

Add tests that create customer orders with stale client prices and expect the persisted order to use server-calculated prices. Add rejection tests for missing product, unavailable spec, insufficient stock, and incompatible fulfillment modes.

- [ ] **Step 2: Run the focused order tests**

Run: `pnpm --filter @xiaipet/api test -- src/modules/orders/service.test.ts`

Expected: FAIL because order creation currently trusts client line prices.

- [ ] **Step 3: Implement final order validation**

In `createCustomerOrder`, resolve submitted lines before `createPendingOrder`. Rebuild `items`, `itemsSubtotal`, and `payableTotal` from server product data. Reject invalid product/spec/quantity/fulfillment states with `ApiError` codes.

- [ ] **Step 4: Verify order tests pass**

Run: `pnpm --filter @xiaipet/api test -- src/modules/orders/service.test.ts`

Expected: PASS.

### Task 3: Customer Cart Persistence Service

**Files:**
- Modify: `apps/customer-miniapp/src/services/cart.ts`
- Modify: `apps/customer-miniapp/src/services/catalog.ts`
- Test: `apps/customer-miniapp/src/services/cart.test.ts`
- Test: `apps/customer-miniapp/src/services/catalog.test.ts`

- [ ] **Step 1: Write failing cart persistence tests**

Add tests for:
- persisting after `addCartItem`
- restoring from `wx.getStorageSync`
- clearing unsupported schema versions
- clearing expired carts
- preserving snapshot rows before reconciliation

- [ ] **Step 2: Run focused cart tests**

Run: `pnpm --filter @xiaipet/customer-miniapp test -- src/services/cart.test.ts`

Expected: FAIL because cart persistence APIs do not exist.

- [ ] **Step 3: Implement local storage persistence**

Add storage helpers and exported methods:
- `hydrateCartFromStorage()`
- `persistCart()`
- `clearCartStorage()`
- persistence calls after every cart mutation

- [ ] **Step 4: Write failing catalog client resolve tests**

Add tests for `resolveCartLines` in `catalog.ts`, using an injected requester to assert the API path and response normalization.

- [ ] **Step 5: Implement customer catalog resolve client**

Add `resolveCartLines(lines, request = customerApiRequest)` that calls `POST /api/v1/customer/catalog/cart/resolve` and normalizes returned lines.

- [ ] **Step 6: Write failing cart reconciliation tests**

Add tests for:
- price and label updates
- quantity reduction on stock changes
- invalid rows becoming deselected
- resolve failure setting unverified state
- combined spec ids remaining intact

- [ ] **Step 7: Implement cart reconciliation**

Add `reconcileCartWithCatalog(resolve = resolveCartLines)` and cart row metadata for invalid/unverified state. Invalid rows must not contribute to selected totals or checkout payloads.

- [ ] **Step 8: Verify focused customer service tests pass**

Run: `pnpm --filter @xiaipet/customer-miniapp test -- src/services/cart.test.ts src/services/catalog.test.ts`

Expected: PASS.

### Task 4: Customer Page and Checkout Flow

**Files:**
- Modify: `apps/customer-miniapp/app.ts`
- Modify: `apps/customer-miniapp/pages/cart/index.ts`
- Modify: `apps/customer-miniapp/pages/catalog/index.ts`
- Modify: `apps/customer-miniapp/pages/search/index.ts`
- Modify: `apps/customer-miniapp/pages/product-detail/index.ts`
- Modify: `apps/customer-miniapp/src/services/order-submit.ts`
- Test: `apps/customer-miniapp/pages/cart-checkout.test.ts`
- Test: `apps/customer-miniapp/src/services/order-submit.test.ts`

- [ ] **Step 1: Write failing page/checkout tests**

Add tests that:
- app launch hydrates cart from local storage
- cart page resolves before checkout
- checkout blocks when resolve fails
- checkout blocks once when selected rows changed
- successful payment removes selected cart rows
- cancelled WeChat payment keeps cart rows

- [ ] **Step 2: Run focused page/checkout tests**

Run: `pnpm --filter @xiaipet/customer-miniapp test -- pages/cart-checkout.test.ts src/services/order-submit.test.ts`

Expected: FAIL because the app and pages do not hydrate or reconcile persisted carts.

- [ ] **Step 3: Wire hydration and reconciliation**

Call `hydrateCartFromStorage` during app startup. Call reconciliation from cart page `onShow` and before checkout. Keep catalog/search/detail badge refresh reading from the hydrated cart service state.

- [ ] **Step 4: Wire checkout cleanup**

After successful balance payment or WeChat payment sync success, remove selected cart rows. On payment cancellation or failure, keep rows.

- [ ] **Step 5: Verify focused page/checkout tests pass**

Run: `pnpm --filter @xiaipet/customer-miniapp test -- pages/cart-checkout.test.ts src/services/order-submit.test.ts`

Expected: PASS.

### Task 5: Build Outputs and Final Verification

**Files:**
- Generated: `apps/customer-miniapp/**/*.js` for changed TypeScript miniapp files

- [ ] **Step 1: Build customer miniapp runtime JS**

Run: `pnpm --filter @xiaipet/customer-miniapp build`

Expected: PASS and generated JS updated for changed TypeScript files.

- [ ] **Step 2: Run focused test suites**

Run:
- `pnpm --filter @xiaipet/api test -- src/modules/catalog/service.test.ts src/routes/customer-catalog.routes.test.ts src/modules/orders/service.test.ts`
- `pnpm --filter @xiaipet/customer-miniapp test -- src/services/cart.test.ts src/services/catalog.test.ts src/services/order-submit.test.ts pages/cart-checkout.test.ts`

Expected: PASS.

- [ ] **Step 3: Run typechecks**

Run:
- `pnpm --filter @xiaipet/api typecheck`
- `pnpm --filter @xiaipet/customer-miniapp typecheck`

Expected: PASS.

- [ ] **Step 4: Review diff and commit**

Stage only files touched for this feature. Do not stage pre-existing merchant catalog changes.

Commit message: `feat: persist and reconcile customer cart`
