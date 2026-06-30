# Merchant New Order Subscription Push Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send WeChat subscription-message new-order alerts to every enabled receiver under active merchant accounts.

**Architecture:** Store merchant notification subscribers separately from merchant login accounts so shared `admin` login can have multiple WeChat receivers. The merchant miniapp lets an authenticated merchant request the subscription template and bind their current WeChat openid; order creation invokes a non-blocking notifier after the order is persisted.

**Tech Stack:** Fastify API, Prisma/MySQL, native WeChat miniapp APIs, Vitest, TypeScript.

## Global Constraints

- Template ID: `tTJBDAEzr5FVXraGKu75bwi5RqMD3ewsmpYqE926u8M`.
- Template fields: `订单号、客户名称、订货数量、货款总计、付款时间`.
- Notify all enabled receivers under active merchant accounts.
- Push failure must not block order creation.
- Do not store app secrets in miniapp code.

---

### Task 1: Backend Subscription Records And Routes

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/202606300001_add_merchant_order_notification_subscribers/migration.sql`
- Create: `apps/api/src/modules/merchant-notifications/service.ts`
- Create: `apps/api/src/modules/merchant-notifications/service.test.ts`
- Modify: `apps/api/src/routes/merchant/auth.ts`
- Modify: `apps/api/src/routes/dependencies.ts`

**Interfaces:**
- `merchantNotificationService.enableNewOrderSubscription(account, { code, templateId })`
- `merchantNotificationService.listActiveNewOrderSubscribers()`
- `POST /api/v1/merchant/notifications/new-order-subscription`

- [ ] Write failing service and route tests for multi-openid subscriptions under one merchant account.
- [ ] Add Prisma model and SQL migration.
- [ ] Implement service methods and route wiring.
- [ ] Run API targeted tests.

### Task 2: WeChat Message Sender And Order Trigger

**Files:**
- Create: `apps/api/src/modules/merchant-notifications/wechat-sender.ts`
- Modify: `apps/api/src/modules/orders/service.ts`
- Modify: `apps/api/src/modules/orders/service.test.ts`
- Modify: `apps/api/src/routes/dependencies.ts`

**Interfaces:**
- `merchantNotificationService.notifyNewOrder(order)`
- WeChat send API uses `/cgi-bin/message/subscribe/send` with access token.

- [ ] Write failing order-service test proving persisted orders invoke notification and failures are swallowed.
- [ ] Implement template data mapping for order id, customer name, item quantity, payable total, and payment/creation time.
- [ ] Wire notifier into order creation after `createPendingOrder`.
- [ ] Run API targeted tests.

### Task 3: Merchant Miniapp Enable Reminder Entry

**Files:**
- Create: `apps/merchant-miniapp/src/services/notifications.ts`
- Create: `apps/merchant-miniapp/src/services/notifications.test.ts`
- Modify: `apps/merchant-miniapp/pages/workspace/index.ts`
- Modify: `apps/merchant-miniapp/pages/workspace/index.wxml`
- Modify: `apps/merchant-miniapp/pages/workspace/index.wxss`

**Interfaces:**
- `enableNewOrderSubscription()` calls `wx.requestSubscribeMessage`, `wx.login`, then backend bind route.

- [ ] Write failing miniapp service test for accept/reject paths.
- [ ] Implement service wrapper.
- [ ] Add workbench button and toast feedback.
- [ ] Run merchant miniapp targeted tests/build.

### Task 4: Verification And GSD Summary

**Files:**
- Modify: `.planning/STATE.md`
- Create: `.planning/quick/260630-rfd-merchant-new-order-subscription-push-not/SUMMARY.md`

- [ ] Run API tests/typecheck.
- [ ] Run merchant miniapp tests/typecheck/build.
- [ ] Update quick summary and state table.
