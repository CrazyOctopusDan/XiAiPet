# Requirements: XiAiPet 独立 Node.js 后端迁移

**Defined:** 2026-05-11
**Core Value:** 让宠物家长在微信内以尽可能少的步骤完成“选品-预约-支付-履约”，同时让店主能用同一套云后台稳定管理商品、订单、会员门槛和余额。

## v1.1 Requirements

### Backend Foundation

- [x] **BE-01**: Developer can run an independent `apps/api` Node.js backend locally with TypeScript, Fastify, structured config and health checks.
- [x] **BE-02**: Developer can start the production backend stack on ECS with Docker Compose without manually installing app dependencies on the server.
- [x] **BE-03**: Operator can configure backend secrets through environment variables or server-only files without committing RDS, OSS, WeChat or payment credentials.
- [x] **BE-04**: Operator can view backend logs, restart services and roll back to the previous deployment using documented commands.
- [x] **BE-05**: Backend is implemented as one unified `apps/api` project with domain modules, not separate customer-backend and merchant-backend projects.

### Database and Migration

- [x] **DB-01**: Developer can create and migrate the MySQL 8 RDS schema with Prisma for users, merchant users, categories, products, runtime config, orders, payments, balance accounts, balance ledgers and receipt print audit records.
- [x] **DB-02**: Backend can preserve existing order snapshot semantics when writing orders to MySQL.
- [x] **DB-03**: Backend can execute balance payment, balance adjustment, order payment state updates and stock deduction inside MySQL transactions.
- [x] **DB-04**: Developer can migrate existing CloudBase collection data into MySQL with an idempotent script and verification report.

### API Parity

- [x] **API-01**: Customer mini program can bootstrap or restore user identity through the new HTTP API.
- [x] **API-02**: Customer mini program can bind or update phone data through the new HTTP API.
- [x] **API-03**: Customer mini program can query categories, products and runtime config through the new HTTP API.
- [x] **API-04**: Customer mini program can create orders, start payment, sync payment state, query order list and query order detail through the new HTTP API.
- [x] **API-05**: Merchant mini program can verify merchant access through the new HTTP API.
- [x] **API-06**: Merchant mini program can query and update merchant orders through the new HTTP API.
- [x] **API-07**: Merchant mini program can create, update, delete and query categories and products through the new HTTP API.
- [x] **API-08**: Merchant mini program can search users, adjust balances and query balance-impacting records through the new HTTP API.
- [x] **API-09**: Merchant mini program can read and update runtime config sections through the new HTTP API.
- [x] **API-10**: Merchant mini program can prepare receipt print jobs and record receipt print results through the new HTTP API.

### Mini Program Integration

- [ ] **MP-01**: Customer mini program uses a shared HTTP API client instead of direct `wx.cloud.callFunction` for migrated backend operations.
- [ ] **MP-02**: Merchant mini program uses a shared HTTP API client instead of `wx.cloud.Cloud` or direct CloudBase function calls for migrated backend operations.
- [ ] **MP-03**: Mini program API client supports development base URL, production `https://api.xiaipet.vip`, request timeout handling and consistent error messages.
- [ ] **MP-04**: Existing customer workflows for catalog, cart, checkout, payment and order viewing continue to behave the same after API migration.
- [ ] **MP-05**: Existing merchant workflows for orders, catalog management, users, balances, runtime config and printing continue to behave the same after API migration.

### Storage and Assets

- [ ] **OSS-01**: Backend can upload product and runtime config assets to OSS without exposing long-lived OSS credentials to mini programs.
- [ ] **OSS-02**: Mini programs can display migrated OSS-backed images through signed or otherwise approved access URLs.
- [ ] **OSS-03**: Developer can migrate existing CloudBase file references to OSS references with an idempotent script and verification report.

### Domain, Security and Deployment

- [ ] **DEP-01**: Production deployment is prepared for `https://api.xiaipet.vip` with Nginx reverse proxy and HTTPS certificate configuration.
- [ ] **DEP-02**: Project documentation tells the user how to finish WeChat request legal domain configuration after ICP filing is approved.
- [ ] **DEP-03**: Backend validates WeChat mini program identity tokens or login codes server-side before trusting user or merchant actions.
- [ ] **DEP-04**: Backend protects merchant-only APIs with merchant authorization checks equivalent to or stricter than the current CloudBase implementation.
- [ ] **DEP-05**: Backend exposes health checks and safe diagnostics that do not leak secrets.

### Verification

- [ ] **VER-01**: Automated tests cover migrated business rules for order creation, payment state, balance transactions, catalog admin, runtime config and merchant authorization.
- [ ] **VER-02**: Developer can run an integration test or smoke checklist against local API + MySQL-compatible test database before deploying.
- [ ] **VER-03**: Developer can run a post-deploy smoke checklist against ECS API without modifying production data unexpectedly.
- [ ] **VER-04**: Migration is not considered complete until both customer and merchant mini programs pass the existing critical workflow regression checklist.

## v2 Requirements

### Operations

- **OPS2-01**: System can deploy through a hosted CI/CD pipeline instead of manual ECS commands.
- **OPS2-02**: System can add monitoring dashboards, alerting and centralized log search.
- **OPS2-03**: System can add Redis or job queue infrastructure if order/payment scale requires asynchronous processing.

### Product Expansion

- **PROD2-01**: System can add Web merchant admin after the mini program migration is stable.
- **PROD2-02**: System can add marketing features such as coupons, promotions and customer engagement notifications.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Kubernetes or multi-node orchestration | Current project is a single-store mini program business; Docker Compose on ECS is easier to operate and sufficient for this milestone |
| New marketing or coupon features | This milestone preserves existing functionality and changes backend platform only |
| Rebuilding mini program UI | UI behavior should remain stable while backend calls are migrated |
| Self-hosting MySQL or object storage on ECS | User already has managed RDS and OSS; self-hosting would increase operations burden |
| Production release before ICP filing completes | WeChat production request domain requires a valid HTTPS legal domain |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BE-01 | Phase 7 | Complete |
| BE-02 | Phase 7 | Complete |
| BE-03 | Phase 7 | Complete |
| BE-04 | Phase 7 | Complete |
| BE-05 | Phase 7 | Complete |
| DB-01 | Phase 8 | Complete |
| DB-02 | Phase 8 | Complete |
| DB-03 | Phase 8 | Complete |
| DB-04 | Phase 8 | Complete |
| API-01 | Phase 9 | Complete |
| API-02 | Phase 9 | Complete |
| API-03 | Phase 9 | Complete |
| API-04 | Phase 9 | Complete |
| API-05 | Phase 9 | Complete |
| API-06 | Phase 9 | Complete |
| API-07 | Phase 9 | Complete |
| API-08 | Phase 9 | Complete |
| API-09 | Phase 9 | Complete |
| API-10 | Phase 9 | Complete |
| MP-01 | Phase 10 | Pending |
| MP-02 | Phase 10 | Pending |
| MP-03 | Phase 10 | Pending |
| MP-04 | Phase 10 | Pending |
| MP-05 | Phase 10 | Pending |
| OSS-01 | Phase 11 | Pending |
| OSS-02 | Phase 11 | Pending |
| OSS-03 | Phase 11 | Pending |
| DEP-01 | Phase 12 | Pending |
| DEP-02 | Phase 12 | Pending |
| DEP-03 | Phase 12 | Pending |
| DEP-04 | Phase 12 | Pending |
| DEP-05 | Phase 12 | Pending |
| VER-01 | Phase 12 | Pending |
| VER-02 | Phase 12 | Pending |
| VER-03 | Phase 12 | Pending |
| VER-04 | Phase 12 | Pending |

**Coverage:**
- v1.1 requirements: 36 total
- Mapped to phases: 36
- Unmapped: 0

---
*Requirements defined: 2026-05-11*
*Last updated: 2026-05-11 after Phase 9 execution*
