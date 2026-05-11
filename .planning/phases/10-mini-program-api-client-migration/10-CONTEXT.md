# Phase 10: Mini Program API Client Migration - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 10 migrates the customer and merchant mini programs from CloudBase function calls to the unified `apps/api` HTTP API delivered in Phase 9. The target is service-layer migration with stable page behavior: catalog, checkout, payment/order viewing, merchant access, order operations, catalog admin, users/balances, runtime config and printing should keep their current user-facing workflows while using the new backend.

This phase is a new backend integration refactor, not a compatibility preservation exercise. The previous CloudBase implementation was not validated end to end and did not complete real data flows, so it should not constrain the new HTTP client design beyond preserving intended product behavior.

</domain>

<decisions>
## Implementation Decisions

### Migration Strategy
- **D-01:** Use HTTP-only defaults for migrated operations. Do not keep CloudBase as a production fallback.
- **D-02:** Treat existing CloudBase service calls as replaceable scaffolding. The implementation may boldly reshape service internals where needed, as long as the mini program pages keep their intended workflows and business behavior.
- **D-03:** Keep the migration at the mini program service layer where possible. Avoid page rewrites unless a page is tightly coupled to CloudBase-specific behavior.

### API Base URL Configuration
- **D-04:** Add per-miniapp API configuration modules. Development should support a local or temporary backend URL; production should default to `https://api.xiaipet.vip`.
- **D-05:** Do not build a runtime settings screen for manually changing the API URL in this phase.
- **D-06:** Because ICP filing is still pending, production request-domain enablement remains a deployment/configuration follow-up, not a blocker for local migration.

### Session and Token Handling
- **D-07:** Use `wx.login` to obtain a backend API token from `POST /api/v1/customer/auth/login`, then persist the token in mini program storage.
- **D-08:** Authenticated requests should send `Authorization: Bearer <token>`.
- **D-09:** On a 401 response, the client should attempt one automatic re-login and retry the original request once. If that fails, surface a user-friendly failure state instead of leaking technical details.
- **D-10:** Customer and merchant mini programs can use the same token scheme, but storage keys should be namespaced per app to avoid collisions.

### Error Handling
- **D-11:** The HTTP client should centrally parse API failures shaped as `{ ok: false, code, message }`.
- **D-12:** Services/pages should continue showing stable or clearer user-facing messages. Backend technical messages and internal error codes should not be dumped directly to end users.
- **D-13:** Domain services may map specific API codes such as `UNAUTHORIZED`, `MERCHANT_FORBIDDEN`, payment failures, or validation errors to existing page states and toasts.

### Verification Scope
- **D-14:** Verification should focus on the HTTP client, service-to-route mappings, token retry behavior, error normalization, and existing key page regression tests.
- **D-15:** Do not expand this phase into a full new end-to-end mini program testing framework. Keep tests focused enough to complete the backend migration safely.

### the agent's Discretion
- The agent may choose exact module names, helper shapes, and refactoring order based on existing miniapp patterns.
- The agent may remove or bypass CloudBase-specific wrappers for migrated operations.
- The agent should preserve static/local-only miniapp features that are not yet backed by Phase 9 HTTP routes unless the roadmap explicitly includes them.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone Scope
- `.planning/REQUIREMENTS.md` — Defines MP-01 through MP-05 as Phase 10 requirements and records that Phase 9 API parity is complete.
- `.planning/ROADMAP.md` — Defines Phase 10 goal, success criteria, and expected plan breakdown.
- `.planning/STATE.md` — Records current workflow position and resume context.

### API Contract
- `apps/api/docs/api-parity.md` — Maps existing CloudBase function names to `/api/v1` HTTP methods, paths, auth mode, and test groups.
- `apps/api/src/routes/api-v1.ts` — Registers customer and merchant route prefixes.
- `apps/api/src/routes/customer/auth.ts` — Defines login/bootstrap route behavior and session token issuance.
- `apps/api/src/routes/customer/catalog.ts` — Defines customer catalog HTTP routes.
- `apps/api/src/routes/customer/runtime-config.ts` — Defines customer runtime config HTTP route.
- `apps/api/src/routes/customer/orders.ts` — Defines customer order/payment HTTP routes.
- `apps/api/src/routes/customer/profile.ts` — Defines customer phone binding route.
- `apps/api/src/routes/merchant/access.ts` — Defines merchant access verification route.
- `apps/api/src/routes/merchant/orders.ts` — Defines merchant order query/detail/status routes.
- `apps/api/src/routes/merchant/catalog.ts` — Defines merchant category/product routes.
- `apps/api/src/routes/merchant/users.ts` — Defines merchant user search and balance adjustment routes.
- `apps/api/src/routes/merchant/runtime-config.ts` — Defines merchant runtime config routes.
- `apps/api/src/routes/merchant/printing.ts` — Defines receipt print preparation and audit routes.
- `apps/api/src/modules/auth/session.ts` — Defines session token creation and validation.
- `apps/api/src/modules/auth/guards.ts` — Defines customer and merchant authorization expectations.
- `apps/api/src/lib/errors.ts` — Defines API error response shape.

### Mini Program Integration Points
- `apps/customer-miniapp/src/services/auth.ts` — Current customer bootstrap entry point using `wx.login` and CloudBase.
- `apps/customer-miniapp/src/services/phone.ts` — Current phone binding service.
- `apps/customer-miniapp/src/services/catalog.ts` — Current catalog helpers and CloudBase image URL usage.
- `apps/customer-miniapp/src/services/runtime-config.ts` — Current customer runtime config cache and fallback defaults.
- `apps/customer-miniapp/src/services/order-submit.ts` — Current checkout create/pay/sync service flow.
- `apps/customer-miniapp/src/services/orders.ts` — Current customer order list/detail service.
- `apps/merchant-miniapp/src/services/cloud.ts` — Current merchant CloudBase wrapper, to be replaced for migrated operations.
- `apps/merchant-miniapp/src/services/access.ts` — Current merchant access verification service.
- `apps/merchant-miniapp/src/services/orders.ts` — Current merchant order service and status update flow.
- `apps/merchant-miniapp/src/services/catalog-admin.ts` — Current merchant category/product admin service and upload hook.
- `apps/merchant-miniapp/src/services/user-admin.ts` — Current merchant user search and balance adjustment service.
- `apps/merchant-miniapp/src/services/runtime-config-admin.ts` — Current runtime config admin service.
- `apps/merchant-miniapp/src/services/order-receipt-print.ts` — Current receipt print service.

### Prior Phase Evidence
- `.planning/phases/09-http-api-parity-for-unified-backend/09-VERIFICATION.md` — Confirms Phase 9 HTTP API parity passed, and records miniapp migration as the remaining dependency.
- `apps/api/src/routes/api-parity.ts` — Machine-readable CloudBase-to-HTTP parity manifest.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Customer service tests already inject fake `callFunction` implementations in several services. Those tests can be adapted to assert HTTP client calls without rewriting page logic.
- Merchant services use default `getCloudCaller()` helpers with injectable `callFunction` parameters. This creates a natural migration path to replace the default caller while retaining test injection.
- Runtime config services already have local default config merging. Keep this fallback behavior for display resilience while sourcing remote data from HTTP.

### Established Patterns
- The customer and merchant miniapps are TypeScript-first and compile to adjacent `.js` files via their existing build scripts.
- Existing services expose domain-shaped functions used by pages. Preserve these exported function names where practical to reduce page churn.
- Current API responses intentionally stay close to CloudBase function result shapes, so most service return mapping should be shallow.

### Integration Points
- Add customer and merchant HTTP clients under each miniapp service/config area.
- Replace `wx.cloud.callFunction` defaults in customer services: `auth`, `phone`, `runtime-config`, `order-submit`, and `orders`.
- Replace merchant `callCloudFunction` defaults across access, orders, catalog admin, user admin, runtime config admin, and receipt printing.
- Customer catalog currently relies heavily on local catalog data and CloudBase temp file URLs. Phase 10 should migrate catalog fetching where backed by Phase 9 routes, while OSS/image migration remains Phase 11.
- Product image upload in merchant catalog admin still depends on CloudBase storage behavior; OSS upload is Phase 11, so do not overreach unless a minimal placeholder is required for migrated catalog saves.

</code_context>

<specifics>
## Specific Ideas

- The user explicitly selected HTTP-only migration and clarified that the old CloudBase code was not validated, had no real data entered, and never completed the intended links. This phase should favor a clean HTTP integration over preserving old CloudBase behavior.
- Use `https://api.xiaipet.vip` as the production base URL, while supporting local/temporary development URLs until ICP filing and WeChat legal-domain configuration are complete.

</specifics>

<deferred>
## Deferred Ideas

- Production HTTPS, Nginx reverse proxy, certificate setup, and WeChat request legal-domain configuration remain Phase 12.
- OSS-backed product/runtime assets and CloudBase file migration remain Phase 11.
- Full end-to-end mini program automation is not part of Phase 10 unless later promoted into a dedicated verification phase.

</deferred>

---

*Phase: 10-mini-program-api-client-migration*
*Context gathered: 2026-05-11*
