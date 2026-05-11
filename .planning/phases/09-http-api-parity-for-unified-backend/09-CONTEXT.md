# Phase 9: HTTP API Parity for Unified Backend - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 9 migrates the existing CloudBase cloud-function capability surface into `apps/api` as functionally equivalent HTTP APIs. It does not change mini program UI, does not migrate OSS asset handling, and does not complete production domain/security cutover. Those remain Phase 10-12 work.

The backend stays one unified Fastify app under `apps/api`. Customer and merchant APIs may be grouped by route namespace, but they must share the same service modules, Prisma data layer, error envelope, auth primitives, and deployment surface.

</domain>

<decisions>
## Implementation Decisions

### API Shape And Compatibility
- **D-01:** Use REST-like HTTP routes under `/api/v1/customer/...`, `/api/v1/merchant/...`, and shared read namespaces where useful. Do not expose a generic `/functions/*` compatibility layer unless a later implementation detail proves it is needed.
- **D-02:** Successful HTTP responses should preserve the old CloudBase function response shapes as much as possible so Phase 10 mini program migration can stay thin. Standardize errors globally, but do not force every success response into `{ ok: true, data }` if that creates extra client churn.
- **D-03:** Keep the existing API error envelope from `apps/api/src/lib/errors.ts`: `{ ok: false, code, message }`. Route handlers should throw typed `ApiError` values rather than leaking raw Prisma, WeChat, or payment errors.
- **D-04:** Map all 23 existing CloudBase functions from `apps/cloud-functions/cloudfunctions.json`; planner may group them into route modules, but no function family should disappear.

### Identity And Auth
- **D-05:** Replace CloudBase implicit `openid` context with backend-controlled HTTP authentication. Customer login starts with `wx.login` code exchange on the server; the backend returns an app session token that mini programs send on subsequent requests.
- **D-06:** Do not trust `openid` directly from mini program request bodies. Tests may inject fake auth context inside Fastify/service test harnesses, but production route contracts should be based on server-issued session identity.
- **D-07:** Merchant-only APIs must check `merchant_users` authorization before accessing sensitive data. Unauthorized merchant requests should fail before order, user, balance, runtime config, product mutation, or print audit data is queried.
- **D-08:** Token/session implementation details are the agent's discretion during planning, but must avoid putting `appSecret`, payment credentials, or long-lived privileged secrets in mini program code.

### Order, Payment, Balance And Inventory
- **D-09:** Order creation remains idempotent by `idempotencyKey` and must preserve the full order snapshot semantics from the CloudBase implementation.
- **D-10:** Balance payment, balance adjustment, payment status update, and stock deduction must reuse the Phase 8 Prisma transaction services or equivalent transaction boundaries.
- **D-11:** WeChat payment in Phase 9 should use a payment provider abstraction plus a clearly separated dev/mock provider. Preserve the existing callable contract at the route response level. Real certificate/callback verification can be wired through production environment variables later and fully verified during Phase 12.
- **D-12:** Payment sync and confirmation routes must be idempotent and safe to retry. They should not double-write balance ledgers, double-deduct stock, or regress paid orders to unpaid states.

### Merchant Operations
- **D-13:** Merchant order query/detail/status routes should keep the merchant-side grouping, status labels, manual settlement, fulfillment status, and receipt print metadata behavior currently covered by CloudBase tests.
- **D-14:** Merchant catalog/category/runtime-config mutation APIs should use shared validators and pricing rules from `packages/shared/src/schema` and `packages/shared/src/rules`.
- **D-15:** Merchant user search and balance adjustment APIs are sensitive. They must return only the fields needed by the existing merchant mini program and must not expose encrypted phone values or internal credential material.

### Testing And Verification
- **D-16:** Phase 9 tests should use Fastify `inject` plus fake service/repository dependencies for route success and error cases. Service-level tests should cover transaction-sensitive behavior separately. DB-backed smoke checks remain a documented manual/integration checklist because local Docker/MySQL is unavailable in this execution environment.
- **D-17:** Reuse existing CloudBase function tests as behavioral references. Tests do not need to preserve CloudBase implementation internals, but the visible outcomes should remain equivalent.
- **D-18:** Keep route files thin. Business behavior belongs in module services/repositories so Phase 10 mini program client migration can depend on stable contracts.

### the agent's Discretion
- Exact HTTP route names and request DTO names, as long as all Phase 9 capability families are covered and the resulting mini program migration stays straightforward.
- Exact session-token mechanism, expiration, and signing implementation, provided route contracts are based on server-issued session identity.
- Exact payment provider interface shape, provided dev/mock behavior is isolated from production WeChat Pay wiring.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope
- `.planning/ROADMAP.md` — Phase 9 goal, success criteria, and six planned work areas.
- `.planning/REQUIREMENTS.md` — API-01 through API-10 requirements and cross-phase boundaries.
- `.planning/PROJECT.md` — unified backend, Alibaba Cloud target, security constraints, and functional parity principle.
- `.planning/phases/08-mysql-data-model-and-migration-pipeline/08-CONTEXT.md` — Phase 8 data-layer decisions that Phase 9 must reuse.

### Current CloudBase Capability Surface
- `apps/cloud-functions/cloudfunctions.json` — canonical list of existing CloudBase functions to migrate.
- `apps/cloud-functions/src/bootstrapUser/index.ts` — current customer bootstrap behavior.
- `apps/cloud-functions/src/bindPhone/index.ts` — current phone-binding behavior.
- `apps/cloud-functions/src/createOrder/index.ts` — current order creation and idempotency behavior.
- `apps/cloud-functions/src/createPayment/index.ts` — current payment creation contract.
- `apps/cloud-functions/src/syncOrderPayment/index.ts` — current payment sync behavior.
- `apps/cloud-functions/src/assertMerchantAccess/index.ts` — current merchant authorization behavior.
- `apps/cloud-functions/src/updateMerchantOrderStatus/index.ts` — current merchant order mutation behavior.
- `apps/cloud-functions/src/prepareOrderReceiptPrint/index.ts` — current receipt print preparation behavior.
- `apps/cloud-functions/src/recordOrderReceiptPrintResult/index.ts` — current receipt print audit behavior.

### Shared Business Contracts
- `packages/shared/src/types/order.ts` — order, payment, fulfillment, receipt print, and snapshot types.
- `packages/shared/src/types/user.ts` — customer and merchant user types.
- `packages/shared/src/types/catalog-admin.ts` — merchant catalog management types.
- `packages/shared/src/types/runtime-config.ts` — runtime config types.
- `packages/shared/src/schema/catalog-admin.ts` — product/category validation helpers.
- `packages/shared/src/schema/runtime-config.ts` — runtime config validation helpers.
- `packages/shared/src/schema/user-record.ts` — user record validation helpers.
- `packages/shared/src/schema/merchant-user.ts` — merchant user validation helpers.
- `packages/shared/src/schema/phone-binding.ts` — phone binding validation helpers.
- `packages/shared/src/schema/order-receipt-print.ts` — print audit validation helpers.
- `packages/shared/src/rules/order-pricing.ts` — order pricing rules.
- `packages/shared/src/rules/order-fulfillment.ts` — order status and fulfillment descriptors.
- `packages/shared/src/rules/product-pricing.ts` — product pricing rules.

### New API Foundation
- `apps/api/src/app.ts` — Fastify app registration pattern.
- `apps/api/src/routes/health.ts` — current route module pattern.
- `apps/api/src/lib/errors.ts` — canonical HTTP error envelope.
- `apps/api/src/db/prisma.ts` — Prisma client lifecycle.
- `apps/api/src/modules/orders/service.ts` — order transaction service started in Phase 8.
- `apps/api/src/modules/users/balance-service.ts` — balance transaction service started in Phase 8.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/api/src/lib/errors.ts`: existing `ApiError` and `toErrorResponse` should be the common route error contract.
- `apps/api/src/db/prisma.ts`: existing singleton Prisma client should be used by route modules and services.
- `apps/api/src/modules/orders/service.ts`: starting point for order creation transaction semantics.
- `apps/api/src/modules/users/balance-service.ts`: starting point for balance adjustment/payment ledger semantics.
- `packages/shared/src/schema/*`: validators should be reused instead of hand-written route validation where they already match CloudBase payloads.

### Established Patterns
- Fastify routes are registered as `FastifyPluginAsync` modules.
- Tests use Vitest and can inject fake dependencies for deterministic service tests.
- Phase 8 repository code maps Prisma enum names back to existing shared string values.
- Existing CloudBase function tests are valuable behavioral references and should be ported or mirrored.

### Integration Points
- Register new route modules from `apps/api/src/app.ts`.
- Add domain modules under `apps/api/src/modules/*` for auth, catalog, runtime config, orders, payments, merchant operations, users, balances, and printing.
- Phase 10 mini program migration will consume the HTTP contracts created here, so route names and response shapes should be stable before that phase starts.

</code_context>

<specifics>
## Specific Ideas

- Treat CloudBase functions as the source behavior for Phase 9, not as implementation architecture to preserve.
- Keep production security conservative even if development/test paths need local bypasses.
- Favor explicit route grouping and documentation because the user is a frontend developer and will later wire mini program clients to these APIs.

</specifics>

<deferred>
## Deferred Ideas

- Mini program HTTP client replacement belongs to Phase 10.
- OSS upload/signing and image URL migration belong to Phase 11.
- HTTPS certificate, WeChat legal request domain, and full production cutover belong to Phase 12.
- Real WeChat Pay certificate/callback production verification belongs to Phase 12 unless credentials are provided during Phase 9.

</deferred>

---

*Phase: 09-http-api-parity-for-unified-backend*
*Context gathered: 2026-05-11*
