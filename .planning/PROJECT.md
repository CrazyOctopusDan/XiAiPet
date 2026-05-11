# XiAiPet 宠物烘焙

## What This Is

XiAiPet 是一个围绕宠物烘焙商品销售与履约的双端微信小程序项目，包含客户端微信小程序、商户端微信小程序，以及 `apps/api` 下的统一独立 Node.js 后端服务。客户端负责商品浏览、购物车、预约下单、支付、订单和个人资料；商户端负责商品、订单、用户与运营配置管理；后端不按端拆分项目，而是统一负责身份、数据、支付、订单、余额、库存、对象存储和审计。

## Core Value

让宠物家长在微信内以尽可能少的步骤完成“选品-预约-支付-履约”，同时让店主能用同一套云后台稳定管理商品、订单、会员门槛和余额。

## Current Milestone: v1.1 独立 Node.js 后端迁移

**Goal:** 在功能不变的前提下，把当前 CloudBase 云函数后端迁移为部署在阿里云 ECS 上的独立 Node.js API 服务，以 MySQL 8 RDS 作为可信数据源，以 OSS 承载对象存储。

**Target features:**
- 建立 `apps/api` 统一独立后端项目：Fastify + Prisma + MySQL 8 + Docker Compose；内部按业务域组织模块，不拆成客户端后端和商户端后端。
- 把现有 23 个 CloudBase 云函数能力迁移为 HTTP API，包括登录、商品、运行时配置、订单、支付、余额、商户管理和打印审计。
- 把客户端与商户端小程序的 `wx.cloud.callFunction` 调用逐步替换为统一 HTTP API client。
- 用 RDS 事务保护订单、余额、库存、支付状态、余额流水等敏感写操作。
- 用 OSS 替代 CloudBase 存储，图片上传和访问走后端签名或受控路径。
- 准备 `https://api.xiaipet.vip` 的正式 HTTPS 链路；备案期间支持开发者工具临时联调。
- 提供适合前端开发者执行的 ECS 部署文档：Docker 安装、环境变量、启动、日志、回滚。

## Requirements

### Validated

- ✓ 商品浏览、搜索、详情、会员/库存展示已经形成可运行客户端能力 — Phase 2
- ✓ 购物车、规格选择、订单前上下文、订单快照、商户端运营能力已在当前代码中推进到可迁移状态 — Phase 3-6 implementation history
- ✓ 商户端订单、品类、商品、用户、运行时配置和小票打印能力已经有 CloudBase 云函数调用面 — Phase 6
- ✓ `apps/api` 已提供覆盖当前 CloudBase 函数 manifest 的 `/api/v1` HTTP API parity 表面 — Phase 9

### Active

- [ ] 建立 `apps/api` 统一独立 Node.js API 后端，使当前小程序业务功能不再依赖 Tencent CloudBase 云函数。
- [ ] 将现有 CloudBase 文档集合迁移为 MySQL 8 RDS schema，并保留订单、余额、库存、支付状态的事务一致性。
- [ ] 将 CloudBase 云存储迁移为阿里云 OSS，图片上传与访问不暴露长期 AK/SK 到小程序端。
- [ ] 将客户端和商户端调用面从 `wx.cloud.callFunction` 切换为 HTTPS API client，保持页面行为和业务结果不变。
- [ ] 在备案完成后支持 `https://api.xiaipet.vip` 作为微信小程序 request 合法域名。
- [ ] 交付前端开发者可执行的 ECS Docker Compose 部署、日志查看和回滚文档。

### Out of Scope

- 新增营销、优惠券、评价、社区、多门店 marketplace 能力 — 本里程碑是平台迁移，功能范围保持不变。
- Kubernetes、微服务拆分、复杂 CI/CD 平台 — 当前是单店小程序项目，ECS 单机 Docker Compose 足以支撑首版迁移。
- 将 RDS、Redis 或 OSS 自建在 ECS 上 — 用户已经开通阿里云托管 RDS 和 OSS，ECS 只承载 Node API 与反向代理。
- 备案未完成前的正式小程序发布 — 开发者工具可以临时联调，但生产发布必须使用 HTTPS 合法域名。

## Context

- 项目当前代码包含 `apps/cloud-functions` 下的 CloudBase 云函数，以及客户端/商户端大量 `wx.cloud.callFunction` 调用。
- 后端能力已经覆盖身份、手机号绑定、商品/品类查询、订单创建、支付、余额支付、订单查询、商户订单管理、商品维护、用户查询、余额调整、运行时配置和小票打印审计。
- 用户已经在阿里云开通 ECS、RDS MySQL 8 和 OSS，并正在为 `xiaipet.vip` 做 ICP 备案。
- 用户明确要求后端项目建在 `apps` 目录下，作为一个统一项目部署到云端，不区分商户端后端和客户端后端。
- 正式小程序请求需要 HTTPS 合法域名；规划目标域名为 `https://api.xiaipet.vip`。备案完成前只做开发者工具临时联调或本地 API 验证。
- 用户是纯前端开发者，没有运维经验，因此部署方案必须脚本化、文档化，并避免 Kubernetes、复杂网络拓扑和手工服务器漂移。
- 当前工作区存在未提交业务改动；迁移规划和后续实现必须避免误删或回滚已有小程序/云函数改动。

## Constraints

- **Tech stack**: 客户端与商户端继续使用原生微信小程序；后端迁移为 Node.js 独立服务 — 用户已明确不再依赖腾讯云后端。
- **Backend stack**: 独立后端采用 Fastify + Prisma + MySQL 8 + OSS + Docker Compose — 平衡 TypeScript 体验、事务建模和部署可维护性。
- **Infrastructure**: ECS 运行 Node API 与 Nginx/HTTPS 反代；RDS 和 OSS 使用阿里云托管服务 — 降低运维复杂度。
- **Domain**: 正式环境 API 域名为 `api.xiaipet.vip`；备案与 HTTPS 证书完成前不得声称具备正式发布能力。
- **Security**: `appSecret`、微信支付证书、RDS 密码、OSS AK/SK 不得写入客户端代码或仓库普通文件 — 只能通过环境变量、服务器密钥文件或受控部署配置注入。
- **Data integrity**: 订单、余额、库存、会员等级、支付状态和余额流水必须由后端事务和审计记录保护，不能由小程序前端直接篡改。
- **Functional parity**: 迁移目标是功能不变；除必要的 API 形态和存储路径变化外，不主动扩大业务范围。
- **Release path**: 保留微信开发者工具与小程序发布链路；迁移后发布前必须配置微信后台 request 合法域名。

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 后端从 Tencent CloudBase 云函数迁移到 `apps/api` 统一独立 Node.js API | 用户已开通阿里云 ECS/RDS/OSS，并明确不再依赖腾讯云后端 | ✓ Good |
| 后端不拆分客户端项目和商户端项目 | 双端共享同一套身份、商品、订单、余额、配置和存储边界，按端拆分会增加重复逻辑和部署复杂度 | ✓ Good |
| 使用 Fastify + Prisma + MySQL 8 作为后端核心栈 | Fastify 轻量且适合 TypeScript API；Prisma 适合管理 MySQL schema、迁移和事务访问 | ✓ Good |
| 使用 Docker Compose 单机部署，而不是 Kubernetes 或裸 PM2 | 用户没有运维经验，Compose 更容易形成可复制部署、日志和回滚流程 | — Pending |
| RDS MySQL 8 成为订单、余额、库存和支付状态的可信数据源 | 这些数据需要事务、一致性和可审计性，不能继续依赖前端或分散存储 | — Pending |
| OSS 使用后端签名或受控上传/访问路径 | 小程序端不能持有长期 OSS 凭证，图片资源也要能受控迁移和审计 | — Pending |
| 正式 API 域名使用 `https://api.xiaipet.vip` | 微信小程序正式请求需要 HTTPS 合法域名，用户域名 `xiaipet.vip` 正在备案 | — Pending |
| 原 “两个原生微信小程序共享一套 CloudBase 后端” 决策作废 | 平台边界已经从腾讯云后端迁移到阿里云独立服务 | ⚠️ Revisit |
| 对订单、余额、支付、库存变更统一走受控服务端路径 | 无论后端部署在 CloudBase 还是 ECS，交易敏感写操作都必须后端托管 | ✓ Good |
| 业务规则采用配置驱动 | 店铺位置、配送费、会员阈值、定制提示和 Banner 都来自配置，避免硬编码后难以运营调整 | ✓ Good |
| 首发只做单店交易闭环，不做营销平台化能力 | 先验证宠物烘焙交易链路，而不是提前引入高复杂度营销系统 | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-11 after starting milestone v1.1 独立 Node.js 后端迁移*
