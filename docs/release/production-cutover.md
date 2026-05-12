# Production Cutover Guide

This guide is the final Phase 12 operator checklist for moving XiAiPet mini program traffic from the historical CloudBase backend dependency to the independent `apps/api` service on Alibaba ECS, RDS MySQL and OSS.

Do not treat this document as proof that production launch is complete. The `api.xiaipet.vip` DNS record points to ECS, but ICP approval, WeChat legal-domain configuration and real WeChat Pay production activation remain release gates until verified.

## Preflight

Complete every item before production cutover:

- [ ] RDS backup confirmed: automatic backups are enabled for `rm-bp15i4u17t16iwk4t.mysql.rds.aliyuncs.com:3306`, and the latest backup completed after the most recent production data change.
- [ ] RDS migration and verification pass with non-destructive commands: `pnpm --filter @xiaipet/api db:migrate:deploy` and `pnpm --filter @xiaipet/api db:verify`.
- [ ] `apps/api/.env.production` exists on ECS under `/opt/xiaipet/repo` and contains only server-side production values for RDS, OSS, session secret, customer WeChat credentials and merchant WeChat credentials.
- [ ] Docker, Docker Compose, Nginx and `acme.sh` are installed and verified on ECS according to `docs/release/alibaba-ecs-api.md`.
- [ ] Docker publishes the API only on `127.0.0.1:3000`; public traffic reaches the service through Nginx HTTPS on `api.xiaipet.vip`.
- [ ] `api.xiaipet.vip` DNS points to ECS and `curl https://api.xiaipet.vip/health` returns safe health JSON with `ok`, `service` and `uptimeSeconds`.
- [ ] OSS bucket/CORS ready: `xiaipet-assets-prod` uses the expected Hangzhou endpoint, merchant upload policy works, `wx.uploadFile` succeeds, and customer/merchant image display works from the OSS public URL.
- [ ] Miniapp legal domains are ready after ICP approval: `https://api.xiaipet.vip` is configured as the request legal domain, and `https://xiaipet-assets-prod.oss-cn-hangzhou.aliyuncs.com` is configured wherever WeChat requires image/download legal domains.
- [ ] API tests pass: `pnpm --filter @xiaipet/api test`.
- [ ] Customer miniapp regression checklist passes according to `docs/release/miniapp-regression.md`.
- [ ] Merchant miniapp regression checklist passes according to `docs/release/miniapp-regression.md`.
- [ ] Real payment launch decision is recorded: either WeChat Pay production activation, API v3 key, merchant cert/private key handling and callback verification are complete, or production payment launch is explicitly blocked while non-payment cutover work continues.
- [ ] CloudBase Backend Retirement Gate is satisfied according to `docs/release/cloudbase-and-miniapp.md`.

## Deploy

Run the deployment from ECS after preflight passes:

```bash
cd /opt/xiaipet/repo
git pull
docker compose up -d --build api
docker compose ps
docker compose logs api --tail=100
```

Do not deploy from a working tree with uncommitted production code changes. Do not copy local `.env` files or payment certificates into git.

## Verify

Run these checks immediately after deployment:

```bash
curl http://127.0.0.1:3000/health
curl https://api.xiaipet.vip/health
nginx -t
docker compose logs api --tail=100
```

Expected health response shape:

```json
{"ok":true,"service":"xiaipet-api","uptimeSeconds":1}
```

Then verify the application gates:

- customer login succeeds from the customer mini program against the intended API base URL.
- merchant login succeeds from the merchant mini program through `/api/v1/merchant/auth/login`.
- Customer catalog, cart, checkout, mock/dev payment path, payment sync and order views pass the regression checklist.
- Merchant order, catalog/product, OSS upload, user search, balance safeguard, runtime config and receipt workflows pass the regression checklist.
- API logs do not contain RDS passwords, OSS AccessKeySecret values, WeChat AppSecrets, payment keys, request headers or raw customer credentials.

## Rollback

Default rollback is limited to application source and container runtime state. It does not reset, truncate or recreate production RDS.

Use the previous known-good commit when the latest API deployment fails:

```bash
cd /opt/xiaipet/repo
git log --oneline -5
git checkout <previous-good-commit>
docker compose up -d --build api
docker compose logs api --tail=100
curl https://api.xiaipet.vip/health
```

After rollback, repeat the `## Verify` checks and inspect API logs before sending mini program traffic back to the API.

### Database Rollback Policy

Do not run prisma migrate reset against RDS.

RDS rollback is a separate manual decision only if forward fixes cannot recover the system. Prefer forward migrations, targeted data correction scripts with audit records, or application rollback first. If point-in-time restore or backup restore is required, stop cutover, name the exact backup/restore target, preserve the current RDS instance for forensic review where possible, and get explicit operator approval before changing production data.

## CloudBase Backend Retirement Gate

CloudBase backend dependency is retired only after these checks pass. Deleting old CloudBase source remains a separate cleanup action after rollback risk is acceptable.

- API HTTPS health pass: `curl https://api.xiaipet.vip/health` returns safe health JSON from the independent API.
- RDS migration and verification pass after backup confirmation.
- OSS upload and display pass for merchant upload and customer/merchant image rendering.
- customer regression pass.
- merchant regression pass.
- Security hardening tests pass for auth separation, merchant authorization and safe diagnostics.
- WeChat legal domains are configured after ICP approval.
- payment gate is either passed for real WeChat Pay production launch or explicitly blocked from production payment launch.

Current status: DNS for `api.xiaipet.vip` points to ECS, but ICP/legal-domain approval is still pending. Real WeChat Pay remains blocked until the customer miniapp subject/payment activation, API v3 key, cert/private key handling and callback verification are ready.

## No-Go Criteria

Stop the production cutover if any item is true:

- ICP approval is not complete, or WeChat legal-domain configuration cannot be completed for `https://api.xiaipet.vip` and the OSS asset domain.
- `curl https://api.xiaipet.vip/health` fails, returns unsafe fields or does not match the expected health response shape.
- RDS migration or `db:verify` fails.
- RDS backup confirmation is missing before migration or cutover.
- OSS image domain is not configured for the required WeChat image/download legal-domain settings.
- OSS upload or OSS-backed image display fails in either mini program.
- Merchant login fails or non-whitelisted merchant access is not rejected.
- Customer login fails or customer session restore is unstable.
- API tests, customer miniapp tests or merchant miniapp tests fail.
- Miniapp regression checklist is incomplete for critical customer or merchant workflows.
- Real payment is not activated if production payment acceptance is required for this launch.
- API logs expose secrets, raw credentials, request headers or production payment material.

## Sign-Off

Record sign-off only after all preflight and verification gates pass:

| Area | Owner | Evidence | Status |
|------|-------|----------|--------|
| ECS API deployment | Operator | `docker compose ps`, API logs, local health | Pending |
| HTTPS API domain | Operator | `curl https://api.xiaipet.vip/health` | Pending |
| RDS migration/verification | Operator | backup confirmation, `db:migrate:deploy`, `db:verify` | Pending |
| OSS upload/display | Operator | upload policy, `wx.uploadFile`, image display | Pending |
| Customer regression | Product/operator | `docs/release/miniapp-regression.md` customer rows | Pending |
| Merchant regression | Product/operator | `docs/release/miniapp-regression.md` merchant rows | Pending |
| WeChat legal domains | Product/operator | WeChat console request/download/image domains after ICP approval | Blocked until ICP approval |
| Payment readiness | Product/operator | payment activation, API v3 key/certs/callback verification | Blocked until payment activation |
