# XiAiPet 宠物烘焙

## What This Is

XiAiPet 是一个围绕宠物烘焙商品销售与履约的双端微信小程序项目，包含客户端微信小程序、商户端微信小程序，以及基于微信云开发 CloudBase 的云端后端能力。客户端负责商品浏览、购物车、预约下单、支付、订单和个人资料；商户端负责商品、订单、用户与运营配置管理，目标是在微信生态内完成完整闭环。

## Core Value

让宠物家长在微信内以尽可能少的步骤完成“选品-预约-支付-履约”，同时让店主能用同一套云后台稳定管理商品、订单、会员门槛和余额。

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] 交付一个基于微信小程序原生能力的客户端商城，覆盖首页、分类浏览、搜索、商品详情、购物车、下单、支付和订单查询。
- [ ] 交付一个基于微信小程序原生能力的商户端工作台，覆盖订单处理、品类管理、商品管理、用户查询和余额调整。
- [ ] 基于微信云开发 CloudBase 建立共享后端，承载数据库、云函数、云存储、权限规则和环境配置。
- [ ] 将配送、自取、快递三种履约方式、预约时间规则、配送费规则、会员等级门槛和定制提示做成可配置业务能力。
- [ ] 把宠物资料、备注历史、余额流水、会员等级等高频复购能力纳入 v1，而不是后置到运营补丁阶段。
- [ ] 把需求文档中标记“需要调用 ui ux pro max 技能生成”的页面保留为 UI 强约束页面，在后续 phase 中补齐设计契约与实现。

### Out of Scope

- 优惠券、会员中心独立入口、营销活动引擎 — 需求文档明确不做或未列为首发闭环必要能力，避免首版范围膨胀。
- 多门店、多商家 marketplace 模式 — 当前业务是单店宠物烘焙场景，先围绕单店运营闭环设计数据模型。
- H5、Web 管理台、App 三端并行 — 当前明确要求是微信小程序 + 微信云服务，优先保证小程序体验与发布链路。
- 社交评价、UGC 社区、内容订阅 — 与当前交易和履约核心价值无关，留待业务验证后再扩展。

## Context

- 现有需求文档已经拆分出两个小程序：客户端与商户端，并提供了首页、购物列表、购物车、商品详情、确认订单、订单、个人信息、余额流水、商户管理等主要页面说明和参考图。
- 项目当前是 greenfield，没有现有代码或 `.planning/` 资产；目录内已有 `backend/`、`customerFrontend/`、`merchantFrontend/` 空目录，可直接作为后续代码落点。
- 需求文档中包含小程序 `appId`、`appSecret` 与代码上传密钥文件，这些信息属于敏感配置，只应进入安全配置体系、CI 或本地受控环境，不能继续在源码和规划文档中扩散。
- 多个页面被标记为“需要调用 ui ux pro max 技能生成”，说明该项目不是纯 CRUD 面板，后续 phase 需要把设计契约纳入交付，而不是只做功能占位。
- 支付、配送费计算、会员门槛、订单快照、余额调整都属于高风险业务数据，应该通过云函数或受控服务端路径处理，而不是直接从小程序前端写入敏感集合。

## Constraints

- **Tech stack**: 必须使用微信小程序与微信云开发 CloudBase — 这是用户明确指定的平台边界。
- **Topology**: 必须支持客户端小程序、商户端小程序、共享云端后端三部分 — 需求文档已固定产品结构。
- **Security**: `appSecret`、支付凭证、代码上传密钥等敏感信息不得写入客户端代码或普通业务集合 — 需要满足最小泄露面。
- **Business rules**: 必须支持配送、自取、快递三种履约方式，以及预约时间、配送费、会员等级门槛等业务规则 — 这是购买闭环的核心。
- **Data integrity**: 订单、余额、库存、会员等级相关数据必须可追踪、可审计、避免前端直接篡改 — 影响支付和售后准确性。
- **Release path**: 需要保留微信开发者工具与代码上传/发布链路的可落地性 — 需求文档已经提供上传密钥，说明发布能力是项目预期的一部分。

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 使用两个原生微信小程序共享一套 CloudBase 后端 | 双端都深度依赖微信原生能力、支付与地图，原生方案比跨端封装更稳妥 | — Pending |
| 对商品目录等公开读数据使用数据库只读/安全规则，对订单、余额、支付、库存变更统一走云函数 | CloudBase 支持 `_openid` 归属和安全规则，但敏感交易写操作仍需服务端托管 | — Pending |
| 业务规则采用配置驱动 | 店铺位置、配送费、会员阈值、定制提示和 Banner 都来自配置，避免硬编码后难以运营调整 | — Pending |
| 首发只做单店交易闭环，不做营销平台化能力 | 先验证宠物烘焙交易链路，而不是提前引入高复杂度营销系统 | ✓ Good |
| 宠物资料、备注历史、余额流水属于 v1 能力 | 它们直接影响转化、复购和客服负担，不应作为“以后再补”的边缘功能 | — Pending |
| 不在规划文档中复写任何敏感密钥原文 | 需求文档已存在敏感信息，规划层只保留治理要求 | ✓ Good |

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
*Last updated: 2026-04-16 after initialization*
