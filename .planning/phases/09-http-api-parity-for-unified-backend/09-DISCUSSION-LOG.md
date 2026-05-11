# Phase 9: HTTP API Parity for Unified Backend - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-11
**Phase:** 09-http-api-parity-for-unified-backend
**Areas discussed:** API shape and compatibility, identity and auth, order/payment/balance/inventory, merchant operations, testing and verification

---

## Workflow Fallback And User Selection

Interactive `request_user_input` was unavailable in Default mode, so the first pass created a conservative default context. The user then chose to update it and selected all five decision areas.

| Option | Description | Selected |
|--------|-------------|----------|
| 全部讨论 | 覆盖 API 形态、鉴权、支付订单、商户权限和测试边界，最适合这次大迁移 | ✓ |
| 交易优先 | 先锁订单、支付、余额、库存这些最容易出事故的接口语义 | |
| 自动默认 | 按保守工程默认值写 CONTEXT，之后仍可修改 | |

**User's choice:** Discuss all areas, then lock `1A,2B,3A,4A,5A,6A`.
**Notes:** Phase 9 context uses prior user decisions: unified backend, functional parity, no new business scope, Alibaba ECS/RDS/OSS target, and frontend-developer-friendly deployment.

---

## API Shape And Compatibility

| Option | Description | Selected |
|--------|-------------|----------|
| REST `/api/v1/customer/...` and `/api/v1/merchant/...` | Clear audience grouping and straightforward mini program HTTP client migration | ✓ |
| One-to-one RPC endpoint per function | Maximum CloudBase naming parity, but less idiomatic HTTP structure | |
| Mixed REST plus function-name compatibility layer | Useful only if Phase 10 shows a real need | |

**User's choice:** `1A` — REST `/api/v1/customer/...` and `/api/v1/merchant/...`.
**Notes:** This keeps Phase 10 client migration straightforward without forcing route files to duplicate business logic.

---

## Response Format

| Option | Description | Selected |
|--------|-------------|----------|
| Unified `{ ok, data }` success wrapper | Consistent, but creates more client adapter churn | |
| Keep old CloudBase success shapes and standardize errors | Best functional parity with lower Phase 10 risk | ✓ |
| Design each response independently | Flexible but risks drift | |

**User's choice:** `2B` — success responses should stay close to old CloudBase function shapes; errors use the unified envelope.
**Notes:** Route planning should compare each endpoint against its CloudBase test expectations before reshaping response bodies.

---

## Identity And Auth

| Option | Description | Selected |
|--------|-------------|----------|
| Backend session token after `wx.login` code exchange | Keeps `openid` server-owned and avoids trusting request bodies | ✓ |
| Development request-body `openid` bypass | Convenient but not selected as an API contract | |
| Re-exchange login code on every request | Secure but slow and awkward for mini program client code | |

**User's choice:** `3A` — mini program sends `wx.login` code, backend exchanges it and issues a session token.
**Notes:** Tests can inject fake auth context internally, but route contracts should not rely on client-submitted `openid`.

---

## Order Payment Balance Inventory

| Option | Description | Selected |
|--------|-------------|----------|
| Provider abstraction plus dev mock for WeChat Pay | Lets Phase 9 define route/service contract without requiring production certificates locally | ✓ |
| Direct real WeChat Pay integration in Phase 9 | Higher confidence but blocked if credentials/certificates are unavailable | |
| Balance-only payment in Phase 9 | Simpler but loses parity | |

**User's choice:** `4A` — payment provider abstraction plus dev mock; real certificate/callback verification is finalized later.
**Notes:** Order/payment/balance/inventory mutations still need to reuse Phase 8 transaction services.

---

## Merchant Operations

| Option | Description | Selected |
|--------|-------------|----------|
| Strict merchant authorization before sensitive reads/writes | Matches security requirement and avoids accidental data exposure | ✓ |
| Check authorization inside each service opportunistically | Easier to forget and harder to audit | |
| Trust merchant mini program client state | Not acceptable for balance, orders, users, or runtime config | |

**User's choice:** `5A` — all `/merchant` routes verify session, then check `merchant_users` whitelist before sensitive access.
**Notes:** Merchant routes should not query sensitive data before the merchant user check passes.

---

## Testing And Verification

| Option | Description | Selected |
|--------|-------------|----------|
| Route tests plus service transaction tests | Gives API parity confidence without requiring Docker locally | ✓ |
| Only unit test helpers | Too weak for HTTP migration | |
| Require live MySQL for all tests | Stronger but currently blocked by local Docker absence | |

**User's choice:** `6A` — Fastify `inject` plus fake services/repositories for route and error tests; DB smoke checks documented separately.
**Notes:** DB-backed smoke checks remain documented for a Docker-capable machine or ECS/RDS.

---

## the agent's Discretion

- Exact route names and DTO names.
- Exact session token implementation.
- Exact payment provider interface shape.

## Deferred Ideas

- Mini program HTTP client migration — Phase 10.
- OSS upload/signing and asset URL migration — Phase 11.
- HTTPS/legal domain/production cutover — Phase 12.
