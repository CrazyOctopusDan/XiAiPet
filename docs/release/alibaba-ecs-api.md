# Alibaba ECS API Deployment Runbook

This runbook deploys the unified XiAiPet backend from `apps/api` to Alibaba Cloud ECS with Docker Compose. RDS MySQL and OSS are managed Alibaba Cloud services and are not installed inside ECS containers. ECS runs API/Nginx only while RDS hosts MySQL.

## Architecture

- `apps/api`: one Fastify Node.js API used by both customer and merchant mini programs.
- `docker-compose.yml`: starts the API container.
- `apps/api/.env.production`: server-only production environment file.
- `https://api.xiaipet.vip`: planned production API domain after ICP filing and HTTPS setup.

Phase 7 does not make the mini program production-ready. While `xiaipet.vip` is still under ICP filing, use local testing or WeChat DevTools temporary domain checks only.

## Prerequisites

1. ECS instance with SSH access.
2. Docker and Docker Compose installed on ECS.
3. Project source available on ECS.
4. Alibaba RDS and OSS credentials prepared for later phases.

Read `docs/release/alibaba-rds.md` before configuring `DATABASE_URL`.

Alibaba Cloud Docker reference: `https://help.aliyun.com/zh/ecs/user-guide/install-and-use-docker`

## Directory Layout

Recommended server path:

```bash
/opt/xiaipet
├── apps/api/.env.production
├── docker-compose.yml
└── ...
```

## Production Environment File

Create `apps/api/.env.production` on ECS. Do not commit this file.

```bash
NODE_ENV=production
API_HOST=0.0.0.0
API_PORT=3000
LOG_LEVEL=info
API_PUBLIC_BASE_URL=https://api.xiaipet.vip
DATABASE_URL=mysql://<user>:<password>@<rds-host>:3306/<database>?sslaccept=strict
```

Later phases will add OSS, WeChat and payment variables here. Keep real passwords, AK/SK, app secrets and certificates out of git. RDS setup and migration commands live in `docs/release/alibaba-rds.md`.

## First Start

From the project root on ECS:

```bash
docker compose up -d --build api
```

## Health Check

Check container status:

```bash
docker compose ps
```

Check logs:

```bash
docker compose logs api --tail=100
```

Check the health endpoint:

```bash
curl http://127.0.0.1:3000/health
```

Expected shape:

```json
{"ok":true,"service":"xiaipet-api","uptimeSeconds":1}
```

The response must not include secrets, request headers, RDS credentials, OSS credentials or WeChat credentials.

## Restart

```bash
docker compose restart api
```

## Stop

```bash
docker compose stop api
```

## Update Deployment

Pull or copy the new project source, then rebuild:

```bash
docker compose up -d --build api
docker compose logs api --tail=100
curl http://127.0.0.1:3000/health
```

## Rollback

If the latest deployment fails, return to the previous git revision or previously known-good source directory, then rebuild:

```bash
git log --oneline -5
git checkout <previous-good-commit>
docker compose up -d --build api
curl http://127.0.0.1:3000/health
```

If the server uses uploaded release folders instead of git, switch the `/opt/xiaipet-current` symlink back to the previous release folder and run the same compose command.

## Production Domain Checklist

This checklist belongs to Phase 12, after ICP filing is approved:

1. Point `api.xiaipet.vip` DNS to the ECS public IP.
2. Configure HTTPS certificate and reverse proxy.
3. Verify `https://api.xiaipet.vip/health`.
4. Add `https://api.xiaipet.vip` to the WeChat mini program request legal domain.
5. Switch mini program production base URL to `https://api.xiaipet.vip`.

Do not use IP-only access as the production mini program backend.

## Troubleshooting

- `docker compose ps` shows unhealthy: run `docker compose logs api --tail=100`.
- `curl` cannot connect: check ECS security group, container status and `API_PORT`.
- API exits immediately: check `apps/api/.env.production` values.
- Missing env file: create `apps/api/.env.production` on ECS; do not commit it.
- ICP filing pending: continue local/ECS temporary testing, but do not claim production release readiness.
