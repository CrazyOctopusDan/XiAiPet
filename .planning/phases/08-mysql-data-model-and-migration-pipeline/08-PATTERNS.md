# Phase 8: MySQL Data Model and Migration Pipeline - Patterns

**Generated:** 2026-05-11
**Status:** Ready for planning

## Target Files and Closest Analogs

| Target | Role | Closest existing analog | Pattern to preserve |
|--------|------|-------------------------|---------------------|
| `apps/api/prisma/schema.prisma` | Prisma source of truth | `packages/shared/src/types/*.ts` | Translate shared business types into durable DB models, using JSON for immutable snapshots |
| `apps/api/prisma.config.ts` | Prisma config | `apps/api/src/config/env.ts` | Read from env, no secrets in source |
| `apps/api/src/config/env.ts` | DB env validation | Existing `ApiConfig` parser | Add exact validation errors for `DATABASE_URL` and optional local DB values |
| `apps/api/src/lib/prisma.ts` | Prisma client singleton | `apps/api/src/app.ts` factory style | Keep DB client importable and testable without starting HTTP server |
| `apps/api/src/repositories/*` | Data access boundary | `apps/cloud-functions/src/shared/order-store.ts`, `payment-store.ts` | Expose methods by business operation, not by raw table |
| `apps/api/src/modules/*` | Transaction services | `apps/cloud-functions/src/shared/payment-store.ts` | Group multi-table writes into one service operation |
| `apps/api/prisma/seed.ts` | Baseline local data | `packages/shared/src/schema/runtime-config.ts` | Seed values should satisfy shared validators |
| `apps/api/scripts/import-cloudbase.ts` | Optional importer | CloudBase collection names in existing functions | Read collection-named JSON exports and upsert idempotently |
| `apps/api/scripts/verify-data.ts` | Verification report | Existing Vitest assertion style | Emit explicit PASS/FAIL checks and non-zero exit on failure |
| `docs/release/alibaba-rds.md` | RDS runbook | `docs/release/alibaba-ecs-api.md` | Frontend-developer-friendly commands and rollback/backup notes |

## Existing Data Shape Notes

### Orders

- `packages/shared/src/types/order.ts` defines order status, payment status, fulfillment modes, pricing, payment records, fulfillment state, receipt print metadata and immutable snapshots.
- `apps/cloud-functions/src/shared/order-store.ts` stores entire `OrderRecord` documents in CloudBase.
- MySQL should split query/transaction fields into columns while preserving `snapshot` as JSON.

### Payments, Balances and Stock

- `apps/cloud-functions/src/shared/payment-store.ts` already shows atomic boundaries:
  - balance payment reads account, updates order, account, ledger and product stock;
  - merchant balance adjustment reads account, updates account and ledger;
  - WeChat config comes from environment variables.
- Prisma transaction services should preserve these operation boundaries instead of scattering them across future route handlers.

### Catalog

- `packages/shared/src/types/catalog-admin.ts` uses core product fields plus structured arrays for specs, formulas, price overrides, fulfillment modes and purchase limits.
- `apps/cloud-functions/src/upsertProduct/index.ts` normalizes editor payloads into `CatalogProductAdminRecord`.
- MySQL should model category/product core fields relationally and keep specs/formulas/overrides/purchaseLimit as JSON until query needs prove otherwise.

### Runtime Config

- `packages/shared/src/types/runtime-config.ts` defines five section IDs: `store-profile`, `delivery-rules`, `membership-tiers`, `banner`, and `custom-notice`.
- Values have different shapes, so one `runtime_config_sections` table with `sectionId` + `value` JSON is the simplest reliable model.

### Users and Merchant Users

- `packages/shared/src/types/user.ts` uses `openid` as the stable identity key.
- MySQL can add internal IDs, but `openid` must remain unique and preserved because mini program auth depends on it.

## Implementation Constraints for Plans

- Do not remove CloudBase functions in Phase 8. They are source references until Phase 9/10 migration is complete.
- Do not add production RDS credentials to `.env.example`; use placeholders only.
- Keep production `docker-compose.yml` from self-hosting MySQL. Use a dev compose profile/service or separate dev compose file for local MySQL.
- Use exact money types: Prisma `Decimal` / MySQL `DECIMAL`.
- Include a blocking DB migration verification task before marking Phase 8 complete.

## Suggested File Layout

```text
apps/api/
  prisma/
    schema.prisma
    seed.ts
  prisma.config.ts
  scripts/
    import-cloudbase.ts
    verify-data.ts
  src/
    lib/prisma.ts
    repositories/
      users.ts
      catalog.ts
      runtime-config.ts
      orders.ts
      payments.ts
      balances.ts
      receipt-print.ts
    modules/
      orders/order-transactions.ts
      payments/payment-transactions.ts
      balances/balance-transactions.ts
```
