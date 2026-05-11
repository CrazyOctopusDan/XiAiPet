# Phase 8: MySQL Data Model and Migration Pipeline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-11
**Phase:** 08-mysql-data-model-and-migration-pipeline
**Areas discussed:** Migration scope, Schema shape, Transaction and audit boundaries, Local database and migration verification

---

## Migration Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Full migration | Migrate products, categories, runtime config, users, merchant users, orders, balance accounts, balance ledgers and receipt print audit while preserving `openid`, legacy IDs, timestamps and order snapshots. | |
| Operational baseline only | Only migrate catalog/config/merchant baseline data; users, orders and balance history are manual or later work. | |
| Start fresh | Build clean MySQL schema and seed data; do not treat CloudBase history as production truth. | ✓ |

**User's choice:** Started with full migration, then clarified the prior backend had not really connected to production data and should be treated as a new refactor.

**Notes:** Final decision is schema-first rebuild with optional/idempotent CloudBase export importer for mock, test, or old exported data.

---

## Schema Shape

| Option | Description | Selected |
|--------|-------------|----------|
| Core relational tables + JSON snapshots | Model transaction/query/audit entities relationally; keep immutable order checkout context and naturally structured config values as JSON. | ✓ |
| Highly relational | Split specs, formulas, overrides, order items, pet snapshots, address snapshots and runtime config substructures into many tables. | |
| Mostly JSON document model | Keep a small number of tables and store most business data as JSON documents. | |

**User's choice:** Core relational tables + necessary JSON snapshots.

**Notes:** This preserves clean MySQL design without overfitting to old CloudBase document shapes.

---

## Transaction and Audit Boundaries

| Option | Description | Selected |
|--------|-------------|----------|
| All transaction-sensitive paths | Use MySQL transactions for order creation with stock deduction, balance payment, WeChat payment confirmation, merchant balance adjustment and manual order status changes; write ledgers/payments/audits. | ✓ |
| Only balance and payment | Protect balance and payment paths first; leave stock and order status simpler for now. | |
| Defer transaction design | Build schema/repository first and leave full transaction coordination to Phase 9 APIs. | |

**User's choice:** All transaction-sensitive paths.

**Notes:** Phase 8 should create repository/service operations that future API routes can call safely.

---

## Local Database and Migration Verification

| Option | Description | Selected |
|--------|-------------|----------|
| Local Docker MySQL + Prisma migrate/seed/verify | Provide local MySQL, Prisma migrations, seed data and verification scripts before touching Alibaba Cloud RDS. | ✓ |
| Direct RDS dev database | Develop directly against Alibaba Cloud RDS dev database. | |
| Mock-only tests | Use Prisma schema and mocked repositories without starting a real MySQL database. | |

**User's choice:** Local Docker MySQL + Prisma migrate/seed/verify.

**Notes:** This matches the user's frontend background and avoids making RDS/network setup a blocker for local development.

---

## the agent's Discretion

- Exact Prisma model names and table names may be chosen during planning.
- Local MySQL compose layout may be root compose profile/service or a separate dev compose file, provided production does not self-host MySQL.
- Verification script output format may be chosen during implementation if it is clear for a non-ops developer.

## Deferred Ideas

- None beyond existing roadmap phase boundaries.
