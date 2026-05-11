---
phase: 08
plan: 08-01
status: completed
completed_at: 2026-05-11
commit: pending
---

# 08-01 Summary: Prisma Schema And Database Config

## Outcome

Added Prisma/MySQL tooling, validated `DATABASE_URL`, and created the source-of-truth MySQL schema for the independent API backend.

## Key Changes

- Added Prisma scripts and dependencies to `@xiaipet/api`.
- Added `prisma.config.ts`, `schema.prisma`, and initial generated SQL migration.
- Added models for users, merchant users, runtime config, catalog, orders, payments, balance accounts, balance ledgers, and receipt print audits.
- Added runtime config validation for MySQL `DATABASE_URL`.

## Verification

- `pnpm --filter @xiaipet/api db:generate` passed.
- `pnpm --filter @xiaipet/api exec prisma validate --config prisma.config.ts` passed.
- `pnpm --filter @xiaipet/api typecheck` passed.
- `pnpm --filter @xiaipet/api test` passed.

## Deviations

- `prisma.config.ts` sets the local placeholder `DATABASE_URL` only when no env var exists so Prisma CLI can run in this repo without committing `.env`.

## Self-Check

PASSED
