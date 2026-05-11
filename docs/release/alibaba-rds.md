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

Use a placeholder shape like this in ECS environment files:

```bash
DATABASE_URL=mysql://<user>:<password>@<rds-host>:3306/<database>?sslaccept=strict
```

Use an application database user, not the RDS root account. Keep the real password and host out of git.

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
