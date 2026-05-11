# Roadmap: XiAiPet 独立 Node.js 后端迁移

## Overview

这条路线以“先建立可部署的统一独立后端，再迁移可信数据与 API，最后切换小程序调用面和生产域名”为原则推进。迁移目标不是新增业务功能，而是在功能不变的前提下，把 CloudBase 云函数、文档数据库和云存储替换为 `apps/api` 下的一个 Node.js API 项目、RDS MySQL 8 和 OSS。后端内部按身份、商品、订单、支付、余额、配置、存储等业务域分模块，不按客户端/商户端拆分后端项目。

当前 `xiaipet.vip` 正在备案，因此路线分成两条并行事实：备案期间先完成本地/API/开发者工具联调；备案通过后再完成 `https://api.xiaipet.vip`、HTTPS 证书和微信 request 合法域名配置。

## Phases

**Phase Numbering:**
- Integer phases continue from the previous milestone.
- This milestone starts at Phase 7 because Phase 1-6 already cover the CloudBase-era product build.

- [x] **Phase 7: Node API Foundation and ECS Deployment Runway** - 建立独立后端工程、Docker Compose 部署骨架、配置安全和基础运维文档
- [x] **Phase 8: MySQL Data Model and Migration Pipeline** - 用 Prisma/RDS 建立可信数据模型，并提供 CloudBase 数据迁移脚本
- [x] **Phase 9: HTTP API Parity for Unified Backend** - 将现有 CloudBase 云函数能力迁移为统一后端项目内的功能等价 HTTP API
- [x] **Phase 10: Mini Program API Client Migration** - 将客户端与商户端小程序调用面从 CloudBase 切换到 HTTP API
- [x] **Phase 11: OSS Asset Migration and Upload Flow** - 将 CloudBase 文件能力迁移到 OSS，并接入受控上传和访问 URL
- [ ] **Phase 12: Production Cutover, Security and Regression Verification** - 完成域名 HTTPS、微信合法域名、部署验收、安全校验和双端回归

## Phase Details

### Phase 7: Node API Foundation and ECS Deployment Runway

**Goal:** 建立可以本地运行、测试、容器化和部署到 ECS 的 `apps/api` 统一独立 Node.js API 后端基础。
**Depends on:** Milestone v1.1 requirements approval
**Requirements:** [BE-01, BE-02, BE-03, BE-04, BE-05]

**Success Criteria** (what must be TRUE):
1. Developer can run `apps/api` locally and see a successful health check.
2. API project uses one Fastify app with domain modules, not separate customer and merchant backend projects.
3. API project uses TypeScript, structured config and test scaffolding.
4. Docker Compose can start the API stack without installing app dependencies directly on ECS.
5. Secrets are loaded from environment or server-only files and are not committed.
6. Deployment docs explain install, start, stop, logs, restart and rollback for a non-ops developer.

**UI hint:** no
**Plans:** 5 plans

Plans:
- [x] 07-01: Scaffold one unified `apps/api` Fastify TypeScript project with domain modules and shared package integration
- [x] 07-02: Add config, env validation, health checks, error envelope and request logging
- [x] 07-03: Add Dockerfile, Docker Compose and local production-like startup path
- [x] 07-04: Add ECS deployment documentation for Docker install, service startup, logs and rollback
- [x] 07-05: Add baseline tests, typecheck and root workspace scripts for the API

### Phase 8: MySQL Data Model and Migration Pipeline

**Goal:** 把 CloudBase 文档集合语义转成 MySQL 8 RDS schema，并保护订单、余额、库存和支付状态事务一致性。
**Depends on:** Phase 7
**Requirements:** [DB-01, DB-02, DB-03, DB-04]

**Success Criteria** (what must be TRUE):
1. Prisma schema covers users, merchant users, categories, products, runtime config, orders, payments, balance accounts, balance ledgers and receipt print audit records.
2. Order snapshots preserve product, spec, pet, address, fulfillment, remark and amount details without relying on live catalog reads.
3. Balance payment, balance adjustment, stock deduction and payment state changes use MySQL transactions.
4. Migration scripts can import CloudBase exports idempotently and produce a verification report.
5. RDS setup docs describe connection string, migration commands and backup expectations.

**UI hint:** no
**Plans:** 5 plans

Plans:
- [x] 08-01: Design Prisma schema and map existing CloudBase collection shapes to MySQL tables
- [x] 08-02: Implement repository layer for users, catalog, runtime config, orders, payments, balances and print audit
- [x] 08-03: Implement transaction boundaries for order creation, payment, stock and balance ledger changes
- [x] 08-04: Build idempotent CloudBase-to-MySQL migration scripts with verification output
- [x] 08-05: Add RDS setup, migration, backup and local test database documentation

### Phase 9: HTTP API Parity for Unified Backend

**Goal:** 将现有 23 个 CloudBase 云函数能力迁移为 `apps/api` 统一项目内功能等价的 HTTP API，并保持统一鉴权、错误和响应格式。
**Depends on:** Phase 8
**Requirements:** [API-01, API-02, API-03, API-04, API-05, API-06, API-07, API-08, API-09, API-10]

**Success Criteria** (what must be TRUE):
1. Customer API covers login/bootstrap, phone binding, catalog, runtime config, checkout, payment and order query flows.
2. Merchant API covers access verification, order management, catalog admin, user search, balance adjustment, runtime config and print audit.
3. API handlers reuse shared schemas and backend service modules instead of duplicating business rules in route files.
4. Merchant-only routes reject unauthorized users before accessing sensitive data.
5. Tests cover both success and failure cases for transaction-sensitive APIs.

**UI hint:** no
**Plans:** 6 plans

Plans:
- [x] 09-01: Implement auth, WeChat login code exchange and customer identity APIs
- [x] 09-02: Implement catalog and runtime config read APIs
- [x] 09-03: Implement order creation, payment start, payment sync and customer order query APIs
- [x] 09-04: Implement merchant access, merchant order query/detail/status APIs
- [x] 09-05: Implement merchant category/product/user/balance/runtime config APIs
- [x] 09-06: Implement receipt print preparation/result APIs and API parity test coverage

### Phase 10: Mini Program API Client Migration

**Goal:** 将客户端和商户端小程序从 `wx.cloud.callFunction` / `wx.cloud.Cloud` 调用面切换到统一 HTTP API client，同时保持现有页面行为不变。
**Depends on:** Phase 9
**Requirements:** [MP-01, MP-02, MP-03, MP-04, MP-05]

**Success Criteria** (what must be TRUE):
1. Customer mini program has a shared request client with dev and production base URL support.
2. Merchant mini program has a shared request client and no longer depends on cross-environment CloudBase function calls for migrated operations.
3. User-facing error messages remain stable or clearer when backend requests fail.
4. Existing customer workflows for catalog, checkout, payment and orders pass regression tests.
5. Existing merchant workflows for orders, catalog, users, balances, runtime config and printing pass regression tests.

**UI hint:** no
**Plans:** 5 plans

Plans:
- [x] 10-01: Add customer miniapp HTTP API client and migrate auth/catalog/runtime config services
- [x] 10-02: Migrate customer checkout, payment and order services to HTTP API
- [x] 10-03: Add merchant miniapp HTTP API client and migrate access/order services
- [x] 10-04: Migrate merchant catalog/user/balance/runtime config/print services to HTTP API
- [x] 10-05: Update miniapp tests and development configuration for API base URLs

### Phase 11: OSS Asset Migration and Upload Flow

**Goal:** 用阿里云 OSS 替代 CloudBase 存储，并保证商品图片、配置图片和详情资源在小程序中可展示、可迁移、可审计。
**Depends on:** Phase 10
**Requirements:** [OSS-01, OSS-02, OSS-03]

**Success Criteria** (what must be TRUE):
1. Backend can create controlled upload flow for merchant-managed assets without exposing long-lived OSS credentials.
2. Mini programs can display product and runtime config assets through approved URLs.
3. Existing CloudBase file references can be migrated to OSS references idempotently.
4. Migration report identifies missing, failed or unmapped assets.
5. Docs explain OSS bucket policy, CORS expectations and URL expiration behavior.

**UI hint:** no
**Plans:** 4 plans

Plans:
- [x] 11-01: Add OSS service wrapper, bucket config and server-side credential handling
- [x] 11-02: Implement merchant asset upload/signing API and miniapp upload integration
- [x] 11-03: Implement CloudBase file reference to OSS migration script and report
- [x] 11-04: Update product/runtime config image display paths and asset tests

### Phase 12: Production Cutover, Security and Regression Verification

**Goal:** 完成 `api.xiaipet.vip` 生产链路、安全检查、部署验收和双端核心业务回归，确认可以脱离 CloudBase 后端运行。
**Depends on:** Phase 11 and ICP filing approval for production domain tasks
**Requirements:** [DEP-01, DEP-02, DEP-03, DEP-04, DEP-05, VER-01, VER-02, VER-03, VER-04]

**Success Criteria** (what must be TRUE):
1. ECS Nginx/HTTPS reverse proxy is documented and ready for `https://api.xiaipet.vip`.
2. WeChat request legal domain setup is documented and can be completed after ICP approval.
3. Backend health checks and diagnostics work without leaking secrets.
4. Security checks cover user identity, merchant authorization, secret handling and sensitive transaction paths.
5. Automated tests and manual smoke checks pass for customer and merchant critical workflows.
6. Cutover docs explain how to switch environments, verify production, and roll back.

**UI hint:** no
**Plans:** 5 plans

Plans:
- [ ] 12-01: Configure production Nginx/HTTPS plan for `api.xiaipet.vip` and WeChat legal domain checklist
- [ ] 12-02: Add security hardening for identity verification, merchant authorization, CORS/domain policy and diagnostics
- [ ] 12-03: Add local integration and ECS post-deploy smoke test checklist
- [ ] 12-04: Run customer and merchant critical workflow regression after API/OSS migration
- [ ] 12-05: Write production cutover and rollback guide, then mark CloudBase backend dependency retired

## Progress

**Execution Order:**
Phases execute in numeric order: 7 → 8 → 9 → 10 → 11 → 12

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 7. Node API Foundation and ECS Deployment Runway | 5/5 | Complete | 2026-05-11 |
| 8. MySQL Data Model and Migration Pipeline | 5/5 | Complete | 2026-05-11 |
| 9. HTTP API Parity for Unified Backend | 6/6 | Complete | 2026-05-11 |
| 10. Mini Program API Client Migration | 3/5 | In Progress | - |
| 11. OSS Asset Migration and Upload Flow | 0/4 | Not started | - |
| 12. Production Cutover, Security and Regression Verification | 0/5 | Not started | - |

## Backlog

### Phase 999.1: Follow-up — Phase 2 incomplete plans (BACKLOG)

**Goal:** Resolve plans that ran without producing summaries during Phase 2 execution
**Source phase:** 2
**Deferred at:** 2026-04-19 during `$gsd-next` advancement to Phase 6
**Plans:**
- [ ] 02-04: 恢复微信原生透明导航，并修复 catalog 尾部分类跳转导致的整页位移 (ran, no SUMMARY.md)
- [ ] 02-05: 统一 discovery 卡片 CTA、售罄视觉和详情页底部操作栏表现 (ran, no SUMMARY.md)

### Phase 999.2: Future Operations Hardening (BACKLOG)

**Goal:** Add production-grade operations tooling after the first Alibaba Cloud migration is stable.
**Source milestone:** v1.1
**Plans:**
- [ ] Add hosted CI/CD deployment pipeline
- [ ] Add monitoring dashboards, alerting and centralized log search
- [ ] Evaluate Redis/job queue only if payment or print workloads require asynchronous processing
