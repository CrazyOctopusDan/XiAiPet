# Phase 8: MySQL Data Model and Migration Pipeline - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 8 establishes the MySQL 8 data layer for the new unified `apps/api` backend. It covers Prisma schema, repository boundaries, transaction design, local MySQL development setup, seed data, optional CloudBase export import, and verification scripts. It does not implement HTTP business routes, mini program client migration, OSS asset migration, or production HTTPS cutover.

</domain>

<decisions>
## Implementation Decisions

### Migration Scope
- **D-01:** Treat Phase 8 as a clean backend data-layer rebuild, not a production-history rescue migration.
- **D-02:** MySQL becomes the new source of truth. CloudBase export import should still exist, but its purpose is optional/idempotent import of old mock, test, or previously exported CloudBase data.
- **D-03:** The importer should preserve legacy IDs, `openid`, timestamps, order snapshots, and audit-like data when present, but schema design should not be compromised just to mimic CloudBase document shapes.

### Schema Shape
- **D-04:** Use core relational tables plus necessary JSON snapshots.
- **D-05:** Model users, merchant users, categories, products, orders, payments, balance accounts, balance ledgers, runtime config sections, and receipt print audits as first-class MySQL/Prisma models.
- **D-06:** Preserve order snapshot semantics with JSON fields for product/item snapshots, pet snapshots, address snapshots, fulfillment snapshots, remarks, and other immutable checkout context.
- **D-07:** Runtime config values may use JSON where the section payload is naturally structured and low-volume, while metadata such as section ID, updater, and timestamps remains queryable.

### Transactions and Audit
- **D-08:** All transaction-sensitive paths must be designed for MySQL transactions before Phase 9 route migration begins.
- **D-09:** Order creation with stock deduction, balance payment, WeChat payment confirmation/sync, merchant balance adjustment, and manual order status changes must be atomic at the repository/service layer.
- **D-10:** Balance changes must write `balance_ledgers`; payment state changes must write `payments`; order status/manual settlement and receipt printing must remain traceable through audit records or audit metadata.
- **D-11:** The repository layer should expose transaction-safe operations rather than leaving each future route handler to coordinate multi-table writes manually.

### Local Database and Verification
- **D-12:** Provide a local Docker MySQL 8 path for development and verification.
- **D-13:** Add Prisma migrate/seed/verify commands so the user can create schema, load baseline data, and check key invariants without touching Alibaba Cloud RDS.
- **D-14:** RDS remains the production target, but Phase 8 verification should run locally first to reduce operations risk.
- **D-15:** Seed data should be enough to support later API and mini program testing: runtime config, at least one merchant user, catalog baseline, and transaction fixtures where useful.

### the agent's Discretion
- The planner may choose exact table names and Prisma model names if they are clear, conventional, and aligned with existing shared TypeScript types.
- The planner may decide whether local MySQL lives in root `docker-compose.yml` as a profile/service or in a separate dev compose file, as long as production compose does not accidentally self-host MySQL on ECS.
- The planner may choose verification script output format, but it must be readable and explicit for a frontend developer.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and Phase Scope
- `.planning/PROJECT.md` — platform migration goal, non-negotiable constraints, and user operations context
- `.planning/REQUIREMENTS.md` — DB-01 through DB-04 and related verification requirements
- `.planning/ROADMAP.md` — Phase 8 goal, success criteria, and plan outline
- `.planning/STATE.md` — current phase status and known blockers
- `.planning/phases/07-node-api-foundation-and-ecs-deployment-runway/07-CONTEXT.md` — locked decisions from API foundation phase

### Current API Foundation
- `apps/api/package.json` — API package scripts and dependency boundary
- `apps/api/src/app.ts` — Fastify app factory pattern
- `apps/api/src/config/env.ts` — environment configuration pattern to extend with database settings
- `apps/api/.env.example` — safe config documentation pattern
- `docker-compose.yml` — current production-oriented API compose baseline
- `docs/release/alibaba-ecs-api.md` — ECS deployment runbook to extend with RDS notes later

### Existing CloudBase Data Shapes
- `packages/shared/src/types/order.ts` — order, payment, fulfillment, snapshot, and receipt print types
- `packages/shared/src/types/catalog-admin.ts` — category/product/admin catalog shapes
- `packages/shared/src/types/user.ts` — user and merchant user shapes
- `packages/shared/src/types/runtime-config.ts` — runtime config section IDs and value shapes
- `packages/shared/src/types/user-admin.ts` — merchant user search and balance adjustment shapes
- `apps/cloud-functions/src/shared/order-store.ts` — current order store access pattern
- `apps/cloud-functions/src/shared/payment-store.ts` — current balance/payment transaction semantics
- `apps/cloud-functions/src/upsertProduct/index.ts` — product normalization and validation behavior
- `apps/cloud-functions/src/bootstrapUser/index.ts` — user bootstrap behavior

### External References
- Prisma MySQL documentation — use current official docs during research/planning for datasource, migrations, JSON fields, relations, and transactions
- MySQL 8 documentation — use current official docs during research/planning for JSON support, indexes, constraints, transaction behavior, and decimal money handling

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/shared/src/types/*` already captures most business object shapes and should guide Prisma model boundaries and JSON snapshot field typing.
- `packages/shared/src/schema/*` contains validators that can be reused or mirrored around migration input and seed data.
- `packages/shared/src/rules/product-pricing.ts`, `order-pricing.ts`, and `order-fulfillment.ts` preserve business calculations that repository tests should not duplicate.

### Established Patterns
- Existing CloudBase stores use `openid` as the customer identity key. MySQL should retain `openid` as an external identity field even if it introduces internal numeric/string primary keys.
- Current order writes save immutable snapshots inside the order record. MySQL should keep that invariant rather than resolving historical orders from live product/user records.
- Current balance payment and merchant adjustment code already describes the sensitive transaction boundary: order, balance account, ledger, and stock changes must stay consistent.

### Integration Points
- `apps/api/src/config/env.ts` is the place to add `DATABASE_URL` and local/prod DB config validation.
- `apps/api` should own Prisma schema, generated client usage, repository modules, migration scripts, and verification scripts.
- Later Phase 9 HTTP routes should call repository/service operations created in Phase 8 instead of re-implementing SQL writes in route handlers.

</code_context>

<specifics>
## Specific Ideas

- Create Prisma schema for the new backend rather than trying to mirror CloudBase collections one-to-one.
- Use MySQL decimal-safe handling for money fields such as prices, payable totals, balance amounts, and ledger deltas.
- Add unique constraints for idempotency-sensitive data, including order idempotency per user and stable ledger/payment identifiers.
- Add verification that balance account totals agree with ledger history for seeded/imported users.
- Add verification that imported or seeded orders retain snapshots even if related products are later changed.
- Keep local seed data intentionally small but complete enough for Phase 9 API parity work.

</specifics>

<deferred>
## Deferred Ideas

- HTTP route implementation for customer/merchant APIs is Phase 9.
- Mini program HTTP client migration is Phase 10.
- OSS-backed product/config asset migration is Phase 11.
- Production RDS credential provisioning and ECS post-deploy smoke checks continue in later deployment/cutover phases.

</deferred>

---

*Phase: 08-mysql-data-model-and-migration-pipeline*
*Context gathered: 2026-05-11 via `$gsd-next` → `$gsd-discuss-phase 8`*
