# Phase 8: MySQL Data Model and Migration Pipeline - Research

**Researched:** 2026-05-11
**Status:** Complete

## Research Question

What does Phase 8 need to know to plan the MySQL 8 + Prisma data layer well?

## Findings

### Prisma and MySQL Baseline

- Use Prisma with the `mysql` datasource provider and `DATABASE_URL` for both local MySQL and Alibaba Cloud RDS.
- Prisma Migrate should be used for schema history, not ad-hoc SQL files only. Development should use `prisma migrate dev`; production/RDS should use `prisma migrate deploy`.
- Prisma `Json` fields are appropriate for immutable checkout snapshots and runtime config values. MySQL JSON filtering exists, but Phase 8 should not rely on complex JSON query paths for core business queries.
- Money fields should use Prisma `Decimal` mapped to MySQL `DECIMAL`, not JavaScript floating numbers stored as `Float`.
- Transaction-sensitive operations should use Prisma `$transaction`, especially interactive transactions for read-modify-write flows such as stock deduction and balance ledger writes.

### MySQL 8 Implications

- MySQL/InnoDB provides row-level locking and ACID transactions; the default isolation level is `REPEATABLE READ`.
- For exact money arithmetic, MySQL `DECIMAL` is the correct storage type.
- JSON columns are available, but frequently filtered values should be normal relational columns. Generated columns/indexes can be considered later if a JSON path becomes query-critical.

### Recommended Schema Shape

Core relational models:

- `User`: openid identity, status, phone binding state, masked contact phone, timestamps.
- `MerchantUser`: merchant access by openid, store name, enabled state, grant timestamp.
- `Category`: category identity, name, icon token, timestamps.
- `Product`: product identity, category relation, image references, member level, status, stock, inventory flag, fulfillment modes JSON, specs/formulas/price overrides JSON, purchase limit JSON, pricing and timestamps.
- `RuntimeConfigSection`: section ID, value JSON, updatedBy JSON or relation-safe JSON, timestamps.
- `Order`: order identity, openid/user relation, idempotency key, status, payment method, pricing decimals, immutable snapshot JSON, fulfillment state fields, timestamps.
- `Payment`: order relation, method, status, provider IDs, failure fields, timestamps.
- `BalanceAccount`: user/openid relation, current balance decimal, timestamps.
- `BalanceLedger`: account/user relation, order relation when applicable, delta/before/after decimals, reason, operator/action metadata JSON, timestamps.
- `ReceiptPrintAudit`: order relation, operator JSON, printer metadata, result/failure, receipt template version, printedAt.

Snapshot JSON fields:

- Order item snapshots, pet snapshots, address snapshots, fulfillment snapshots and remarks should stay JSON on the order so historical orders do not depend on mutable live catalog/user data.
- Runtime config section values should stay JSON because they are low-volume operational configuration with different shapes per section.

### Repository and Transaction Design

Repository modules should live under `apps/api/src/modules/*` or `apps/api/src/repositories/*` and hide Prisma table details from future HTTP routes.

Required transaction-safe operations:

- Create order with idempotency check, order insert, optional stock deduction, payment placeholder and immutable snapshot persistence.
- Finalize balance payment with order update, balance account update, balance ledger insert and stock state consistency.
- Confirm/sync WeChat payment with payment record update and order status update.
- Apply merchant balance adjustment with account update and ledger insert.
- Apply manual order status/settlement with an audit snapshot.
- Record receipt print result with print audit insert and order print metadata update.

### Local Database Path

- Add local MySQL 8 as a development-only Docker Compose service or profile. Do not add MySQL to the production API service path as a self-hosted dependency.
- Add safe placeholder `DATABASE_URL` values to `.env.example`; do not commit real RDS credentials.
- Add scripts for `prisma generate`, `migrate dev`, `migrate deploy`, `db seed`, and a custom verification script.
- Seed data should create enough baseline records for Phase 9: runtime config sections, one merchant user, categories, products, balance account and sample order/payment/ledger fixtures if useful.

### Import and Verification

- CloudBase import should be optional and idempotent. Since the user clarified prior data is not real production history, import should not dominate schema design.
- Import input can be directory-based JSON exports grouped by collection name: `users`, `merchant_users`, `categories`, `products`, `runtime_configs`, `orders`, `balance_accounts`, `balance_ledgers`, and receipt print audits if present.
- Verification should produce a readable report covering row counts, missing required baseline data, idempotency duplicate checks, order snapshot presence, balance-account-vs-ledger consistency, and orphan references.

## Validation Architecture

### Automated Checks

- `pnpm --filter @xiaipet/api typecheck`
- `pnpm --filter @xiaipet/api test`
- `pnpm --filter @xiaipet/api build`
- `pnpm --filter @xiaipet/api db:generate`
- `pnpm --filter @xiaipet/api db:migrate:dev`
- `pnpm --filter @xiaipet/api db:seed`
- `pnpm --filter @xiaipet/api db:verify`

### Required Test Coverage

- Schema/config tests verify `DATABASE_URL` validation and local placeholder behavior.
- Repository tests cover basic CRUD mapping for users, catalog, runtime config, orders, payments, balances and print audit.
- Transaction tests verify stock deduction, balance payment, balance adjustment, and payment state changes are atomic.
- Import tests verify the importer is idempotent and produces a report.
- Verification tests verify the report detects missing snapshots, duplicate idempotency keys, orphan references and balance mismatches.

### Manual Checks

- If Docker is unavailable locally, document that MySQL-dependent commands must be run on a machine with Docker or against a disposable dev database.
- RDS production credentials and backup configuration are documented but not executed in Phase 8.

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Overfitting to CloudBase document shapes | Schema-first rebuild with optional importer only |
| Money rounding drift | Use MySQL `DECIMAL`/Prisma `Decimal` for persisted money |
| Transaction logic spread across route handlers | Repository/service layer exposes transaction-safe operations |
| Real RDS credentials accidentally committed | `.env.example` placeholders only; `.env*` remains ignored |
| Docker not available in local environment | Plans include clear fallback notes and separate verification reporting |

## Sources

- Prisma MySQL connector: https://docs.prisma.io/docs/v6/orm/overview/databases/mysql
- Prisma transactions: https://www.prisma.io/docs/orm/v6/prisma-client/queries/transactions
- Prisma Migrate dev/prod workflow: https://docs.prisma.io/docs/v6/orm/prisma-migrate/workflows/development-and-production
- Prisma seeding: https://docs.prisma.io/docs/orm/prisma-migrate/workflows/seeding
- Prisma JSON fields: https://docs.prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-json-fields
- MySQL InnoDB transaction model: https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-model.html
- MySQL data types and DECIMAL: https://dev.mysql.com/doc/refman/8.0/en/data-types.html
- MySQL generated column indexes: https://dev.mysql.com/doc/refman/8.0/en/generated-column-index-optimizations.html

## RESEARCH COMPLETE
