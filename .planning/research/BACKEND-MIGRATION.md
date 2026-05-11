# Backend Migration Research: CloudBase to Alibaba Cloud Node API

**Project:** XiAiPet 宠物烘焙
**Milestone:** v1.1 独立 Node.js 后端迁移
**Researched:** 2026-05-11
**Confidence:** MEDIUM-HIGH

## Decision Summary

The backend should move from Tencent CloudBase cloud functions to one independent Node.js HTTP API project under `apps/api`, deployed on Alibaba Cloud ECS. The recommended implementation stack is Fastify + TypeScript + Prisma + MySQL 8 RDS + OSS, packaged with Docker Compose for ECS.

This migration is not a product expansion. Its success condition is functional parity with the current customer and merchant mini programs, while moving the trusted backend boundary to Alibaba Cloud. The backend should not be split into separate customer and merchant backend projects; one API app should expose domain modules used by both mini programs.

## Recommended Stack

| Area | Choice | Reason |
|------|--------|--------|
| API framework | Fastify | Lightweight TypeScript-friendly HTTP API framework with a small operational footprint |
| Database access | Prisma | Schema/migration tooling and typed MySQL access reduce drift during CloudBase-to-RDS migration |
| Database | Alibaba Cloud RDS MySQL 8 | User has already provisioned it; order, balance, payment and stock updates need SQL transactions |
| Object storage | Alibaba Cloud OSS | User has already provisioned it; replaces CloudBase file storage |
| Deployment | Docker Compose on ECS | Easier for a frontend developer to operate than Kubernetes; more reproducible than manual PM2 setup |
| Public API domain | `https://api.xiaipet.vip` | WeChat production mini program requests need a configured HTTPS legal domain |

## Migration Implications

### Current CloudBase Functions to Migrate

The repo currently has 23 CloudBase function entry points:

- Identity and auth: `bootstrapUser`, `bindPhone`, `assertMerchantAccess`
- Catalog: `queryCategories`, `queryProducts`, `upsertCategory`, `upsertProduct`
- Runtime config: `readRuntimeConfig`, `getRuntimeConfigSections`, `upsertRuntimeConfigSection`
- Orders and payment: `createOrder`, `createPayment`, `payOrder`, `confirmPayment`, `syncOrderPayment`, `queryMyOrders`, `getMyOrderDetail`, `queryMerchantOrders`, `getMerchantOrderDetail`, `updateMerchantOrderStatus`
- Users and balance: `searchMerchantUsers`, `adjustUserBalance`
- Printing: `prepareOrderReceiptPrint`, `recordOrderReceiptPrintResult`

These should become HTTP routes grouped by business domain rather than copied one-route-per-function without service boundaries. Customer-facing and merchant-facing routes can have different authorization policies, but they should live in the same `apps/api` deployment.

### Data Model Changes

CloudBase document collections should map to relational tables with JSON columns only where the data is naturally snapshot-like:

- Use normalized tables for users, merchant users, categories, products, runtime config sections, balance accounts, ledgers, orders, payments and print audit.
- Preserve order line items, fulfillment snapshot, pet snapshot, address snapshot and pricing breakdown as structured order-owned records or JSON snapshots.
- Use transactions for order creation, payment settlement, stock deduction, balance payment and balance adjustment.

### Mini Program Changes

Both mini programs should call a shared HTTP request client:

- Development base URL can point to local/ECS temporary endpoint while ICP filing is in progress.
- Production base URL should be `https://api.xiaipet.vip`.
- Errors should map to stable mini program messages instead of leaking raw backend exceptions.
- Existing service modules should migrate behind their current function boundaries where possible to reduce page churn.

### Deployment Changes

ECS should run the API and reverse proxy only. RDS and OSS remain managed Alibaba Cloud services.

Minimum deployment deliverables:

- `.env.example` and production env variable list
- Dockerfile and Docker Compose file
- Nginx reverse proxy config for `api.xiaipet.vip`
- Health endpoint
- Log viewing commands
- Restart and rollback commands
- Post-deploy smoke checklist

## Risks and Controls

| Risk | Control |
|------|---------|
| ICP filing blocks production mini program requests | Build and test locally first; mark production cutover blocked until `api.xiaipet.vip` is configured |
| User has no ops background | Keep deployment to Docker Compose and document commands explicitly |
| CloudBase document data does not fit relational schema cleanly | Use migration scripts with verification report and preserve order snapshots |
| Payment and balance logic regresses during migration | Put payment, balance and stock changes behind MySQL transactions with automated tests |
| Long-lived OSS credentials leak to mini programs | Use backend-signed upload/access flows; never put AK/SK in client code |
| Merchant APIs expose sensitive operations | Enforce merchant authorization server-side on every merchant route |

## Sources

- Fastify official documentation: https://fastify.dev/docs/latest/
- Prisma MySQL connector documentation: https://www.prisma.io/docs/orm/overview/databases/mysql
- Alibaba Cloud ECS Docker documentation: https://help.aliyun.com/zh/ecs/user-guide/install-and-use-docker
- Alibaba Cloud OSS Node.js SDK documentation: https://help.aliyun.com/zh/oss/developer-reference/node-js
- WeChat Mini Program network documentation: https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html

---
*Research added: 2026-05-11*
