# Alibaba RDS MySQL Runbook

## What This Covers

This document explains how XiAiPet API uses Alibaba Cloud RDS MySQL 8 for the independent Node.js backend in `apps/api`. ECS runs API/Nginx only; RDS hosts MySQL.

## Local MySQL

Start local MySQL 8 with the dev-only compose file:

```bash
docker compose -f docker-compose.dev.yml up -d mysql
```

The local connection string is:

```bash
DATABASE_URL=mysql://xiaipet:xiaipet_local_password@127.0.0.1:3307/xiaipet_dev
```

## RDS Connection String

Production RDS is confirmed as:

| Field | Value |
|-------|-------|
| Internal endpoint | `rm-bp15i4u17t16iwk4t.mysql.rds.aliyuncs.com:3306` |
| Database | `xiaipet_db` |
| Application account | `XiAiPet_db` |

Use this placeholder shape in ECS environment files:

```bash
DATABASE_URL=mysql://XiAiPet_db:<RDS_PASSWORD>@rm-bp15i4u17t16iwk4t.mysql.rds.aliyuncs.com:3306/xiaipet_db?sslaccept=strict
```

Use the application database user, not the RDS root account. Keep the real password out of git and server chat logs.

## Development Commands

```bash
pnpm --filter @xiaipet/api db:generate
pnpm --filter @xiaipet/api db:migrate:dev -- --name init_mysql_data_layer
pnpm --filter @xiaipet/api db:seed
pnpm --filter @xiaipet/api db:verify
```

Development reset commands are only for disposable local databases.

## Production Migration Commands

Never run prisma migrate reset against RDS.

On ECS or CI, run:

```bash
pnpm --filter @xiaipet/api db:generate
pnpm --filter @xiaipet/api db:migrate:deploy
pnpm --filter @xiaipet/api db:verify
```

Run seed/import commands against RDS only when intentionally bootstrapping a new environment.

## Production RDS Smoke Gate

Before running production migrations or data verification:

1. Confirm RDS automatic backups are enabled for `rm-bp15i4u17t16iwk4t.mysql.rds.aliyuncs.com:3306`.
2. Confirm the latest automatic backup completed successfully after the most recent production data change.
3. Confirm the operator has the current `<RDS_PASSWORD>` from the secret manager or ECS-only `.env.production`, not from git.
4. Confirm the command target prints `xiaipet_db` and account `XiAiPet_db` before proceeding.

Then run only the non-destructive production commands:

```bash
pnpm --filter @xiaipet/api db:migrate:deploy
pnpm --filter @xiaipet/api db:verify
```

Expected pass result: Prisma reports migrations applied or already in sync, and `db:verify` exits 0 without modifying orders, balances, ledger rows, inventory or payment status. If verification fails, stop API cutover and inspect the report. Do not reset the RDS schema.

## Backup Expectations

Enable RDS automatic backups and point-in-time recovery before accepting real orders. Before any migration touching order, payment, balance, ledger, or inventory tables, confirm the latest backup succeeded.

## Verification

Required code checks:

```bash
pnpm --filter @xiaipet/api typecheck
pnpm --filter @xiaipet/api test
pnpm --filter @xiaipet/api build
```

Required schema/data checks where MySQL is available:

```bash
pnpm --filter @xiaipet/api db:migrate:deploy
pnpm --filter @xiaipet/api db:verify
```

## Troubleshooting

- Migration cannot connect: check RDS VPC, ECS security group, username, password, and `DATABASE_URL`.
- SSL error: verify the exact RDS SSL mode required by the instance.
- Permission error: grant the API migration user the required schema privileges, then remove unnecessary broad privileges after launch.
- Data verification fails: inspect the JSON report from `db:verify` before restarting API traffic.
