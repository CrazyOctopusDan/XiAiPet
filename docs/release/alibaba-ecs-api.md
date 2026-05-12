# Alibaba ECS API Deployment Runbook

This runbook deploys the unified XiAiPet backend from `apps/api` to Alibaba Cloud ECS with Docker Compose. RDS MySQL and OSS are managed Alibaba Cloud services and are not installed inside ECS containers. ECS runs API/Nginx only while RDS hosts MySQL.

## Architecture

- `apps/api`: one Fastify Node.js API used by both customer and merchant mini programs.
- `docker-compose.yml`: starts the API container. On ECS, run only the Compose service named `api`.
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

## Alibaba Cloud Linux 3 First-Time Setup

These commands target Alibaba Cloud Linux 3.2104 on ECS. Run them as `root` or with `sudo`.

```bash
dnf makecache
dnf install -y git docker docker-compose-plugin nginx curl socat cronie
systemctl enable --now docker
systemctl enable --now nginx
systemctl enable --now crond
docker compose version
nginx -v
```

If `docker-compose-plugin` is not available from the enabled package repositories, install Docker using the Alibaba Cloud ECS Docker guide linked above, then re-run `docker compose version` before continuing.

Create the ACME challenge webroot and Nginx TLS directory:

```bash
mkdir -p /var/www/acme/.well-known/acme-challenge
mkdir -p /etc/nginx/ssl/api.xiaipet.vip
chown -R nginx:nginx /var/www/acme
chmod 755 /var/www/acme
```

Create `/etc/nginx/conf.d/api.xiaipet.vip.conf`:

```nginx
server {
    listen 80;
    server_name api.xiaipet.vip;

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/acme;
        default_type "text/plain";
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name api.xiaipet.vip;

    ssl_certificate /etc/nginx/ssl/api.xiaipet.vip/fullchain.cer;
    ssl_certificate_key /etc/nginx/ssl/api.xiaipet.vip/api.xiaipet.vip.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Before the first certificate exists, keep only the port 80 server block enabled or temporarily comment out the 443 server block, then test and reload Nginx:

```bash
nginx -t
systemctl reload nginx
```

Install `acme.sh`, issue the `api.xiaipet.vip` certificate with webroot mode, and install the certificate files into the stable Nginx path:

```bash
curl https://get.acme.sh | sh -s email=<operator email>
~/.acme.sh/acme.sh --set-default-ca --server letsencrypt
~/.acme.sh/acme.sh --issue -d api.xiaipet.vip -w /var/www/acme
~/.acme.sh/acme.sh --install-cert -d api.xiaipet.vip \
  --fullchain-file /etc/nginx/ssl/api.xiaipet.vip/fullchain.cer \
  --key-file /etc/nginx/ssl/api.xiaipet.vip/api.xiaipet.vip.key \
  --reloadcmd "systemctl reload nginx"
nginx -t
systemctl reload nginx
```

The `api.xiaipet.vip` DNS A record already points to ECS public IP `118.178.173.241`; certificate issuance still requires ports 80 and 443 to be reachable from the public internet.

## Directory Layout

Recommended server layout:

```bash
/opt/xiaipet
├── repo
│   ├── apps/api/.env.production
│   ├── apps/api
│   ├── packages/shared
│   ├── docker-compose.yml
│   ├── package.json
│   ├── pnpm-workspace.yaml
│   └── tsconfig.base.json
├── releases
└── backups
```

Use `/opt/xiaipet/repo` for the full Git monorepo, `/opt/xiaipet/releases` for optional future release snapshots, and `/opt/xiaipet/backups` for deployment or configuration backups. The server clones the whole repository because `apps/api/Dockerfile` builds from root workspace files and `packages/shared`. Mini program and historical CloudBase source files may exist in the checkout as inert source files, but only the `api` Docker Compose service runs on ECS.

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
cd /opt/xiaipet/repo
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

Pull the new project source, then rebuild only the API service:

```bash
cd /opt/xiaipet/repo
git pull
docker compose up -d --build api
docker compose ps
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
