# Project Research Summary

**Project:** XiAiPet 宠物烘焙
**Domain:** 双端微信小程序宠物烘焙电商
**Researched:** 2026-04-16
**Confidence:** HIGH

## Executive Summary

这是一个典型的“微信内完成交易闭环”的单店电商项目，但相比普通食品商城，它还叠加了宠物信息、规格配方、会员门槛、预约履约、配送费规则和余额账本等更高复杂度业务约束。最稳妥的路线不是先追求前端复用，而是先把双端共享的数据模型、敏感写操作边界和配置驱动能力建立起来。

基于官方 CloudBase 文档，可以确认小程序端直接初始化云环境、读取数据库和配置规则是可行路径；同时数据库权限、安全规则和云函数边界足以承载商品公开读取与订单/余额/库存等敏感写操作的分层设计。推荐用两个原生微信小程序共享一套 CloudBase 环境与业务模型，把发布、支付、地图、分享和微信原生能力都留在最短链路上。

最大的风险不是功能不够，而是把交易逻辑散落到前端页面中，导致订单金额、库存、余额和运营配置失控。路线图必须优先解决环境、安全、模型和配置边界，再推进商品浏览、购物车、结算与商户运营。

## Key Findings

### Recommended Stack

推荐栈是“原生微信小程序 + CloudBase 文档型数据库 + 云函数 + 云存储 + 标准微信发布链路”。

**Core technologies:**
- 原生微信小程序：承接分享、支付、手机号、地图与双端页面交互 — 最适合微信生态重场景项目
- CloudBase：统一数据库、函数、权限和环境配置 — 适合 greenfield 小程序后端
- TypeScript + shared schema：统一客户端、商户端和云函数的数据结构 — 降低订单/商品字段漂移

### Expected Features

**Must have (table stakes):**
- 商品浏览、搜索、详情、购物车、订单确认、支付、订单查询
- 地址管理、预约时间、履约方式切换、个人中心
- 商户订单处理、商品管理、用户查询和余额调整

**Should have (competitive):**
- 宠物资料与订单关联
- 规格配方快速加购
- 会员等级门槛控制可购商品
- 余额体系和流水可视化

**Defer (v2+):**
- 优惠券/促销引擎
- 用户评价与晒单
- 多门店与 Web 后台

### Architecture Approach

架构上应分成客户端小程序、商户端小程序、CloudBase 数据层与云函数服务层四个边界。公开商品和只读配置可直接读取；订单、支付、余额、库存和商户敏感写操作一律进入云函数；配置与业务数据分集合管理。

**Major components:**
1. 客户端小程序 — 负责交易前台与个人资料
2. 商户端小程序 — 负责订单、商品、用户和配置管理
3. CloudBase 数据与函数层 — 负责持久化、鉴权、交易写入与配置治理

### Critical Pitfalls

1. **敏感密钥继续留在仓库或客户端** — 第一阶段就建立安全配置体系
2. **前端直接写订单/余额/库存集合** — 所有敏感写操作统一收口到云函数
3. **没有订单快照导致金额和规格漂移** — 在结算和下单阶段冻结订单快照
4. **索引缺失导致列表与搜索劣化** — 在建模阶段同步设计查询索引
5. **履约规则硬编码在页面里** — 店铺配置、配送费和会员阈值全部配置化

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation and Cloud Boundary
**Rationale:** 先建立登录、环境、数据模型、权限边界与共享规则，后续 phase 才不会反复推倒重来。
**Delivers:** 双端脚手架、CloudBase 环境、用户引导、安全与配置边界。
**Addresses:** 基础账号入口和平台约束。
**Avoids:** 敏感写操作直接暴露、密钥泄露。

### Phase 2: Catalog and Product Discovery
**Rationale:** 商品浏览与详情是最核心转化路径，应尽快落地验证。
**Delivers:** 首页、分类、搜索、详情、会员门槛与库存展示。
**Uses:** 商品、分类、Banner 与只读配置集合。
**Implements:** 客户端展示层与商品查询层。

### Phase 3: Cart State and Order Preparation
**Rationale:** 购物车是下单前的状态中心，需要在结算前稳定成型。
**Delivers:** 规格商品建模、快速加购、库存校验、购物车同步。
**Implements:** 购物车状态与商品选项规则。

### Phase 4: Account Context
**Rationale:** 地址、宠物、余额与个人资料决定结算是否顺畅。
**Delivers:** 个人中心、资料编辑、地址管理、宠物资料、余额流水。
**Uses:** 私有数据权限与按 `_openid` 隔离的数据集合。

### Phase 5: Checkout, Payment and Orders
**Rationale:** 这是交易闭环与业务正确性的核心 phase。
**Delivers:** 订单确认、预约、配送费、支付、订单列表与详情。
**Addresses:** 订单快照、支付回调、金额一致性。
**Avoids:** 金额漂移与库存错扣。

### Phase 6: Merchant Operations and Runtime Config
**Rationale:** 在前台闭环稳定后补齐商户侧，能减少双端并发返工。
**Delivers:** 商户订单管理、品类/商品管理、用户余额调整和运营配置。
**Uses:** 统一商品 schema、订单状态机和配置集合。
**Implements:** 商户端核心工作台。

### Phase Ordering Rationale

- 先做环境、安全与模型，再做交易前台，最后做商户运营，可以最大化降低返工成本。
- 配置驱动能力虽然服务于结算和运营，但底层集合和规则边界要在早期定好。
- 订单与支付必须在地址、宠物、备注、会员门槛等上下文能力之后落地，才能一次做对。

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 5:** 微信支付接入、支付回调、库存与余额一致性都属于高风险集成点
- **Phase 6:** 商户复杂表单、运营配置与权限隔离需要严格 schema 设计

Phases with standard patterns (skip research-phase):
- **Phase 2:** 商品列表、详情、搜索和库存展示模式较稳定
- **Phase 3:** 购物车状态管理模式成熟，主要是规格商品建模细节

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | 基于 CloudBase 官方文档与平台约束推导 |
| Features | HIGH | 直接来自需求文档，边界清晰 |
| Architecture | HIGH | 双端小程序 + CloudBase 是平台最短路径 |
| Pitfalls | HIGH | 与 CloudBase 权限模型和交易场景直接相关 |

**Overall confidence:** HIGH

### Gaps to Address

- 微信支付具体证书、商户号、回调部署流程需在 Phase 5 规划时单独校验
- 配送费按距离计算涉及地图/地理编码方案，需在 Phase 5 规划时验证具体实现
- 后续若商户端表单复杂度过高，可能需要追加 UI 合同或拆分子 phase

## Sources

### Primary (HIGH confidence)
- https://docs.cloudbase.net/cms/usage/use-data — 小程序端初始化与数据库访问方式
- https://docs.cloudbase.net/database/introduce — 文档型数据库、事务、索引、数据模型
- https://docs.cloudbase.net/database/data-permission — `_openid` 与基础权限模型
- https://docs.cloudbase.net/database/security-rules — 安全规则与文档级权限控制
- https://cloud.tencent.com/document/product/876/67083 — CloudBase Open API 和服务边界

### Secondary (HIGH confidence)
- `req/需求文档.md` — 产品边界、页面清单与业务规则

---
*Research completed: 2026-04-16*
*Ready for roadmap: yes*
