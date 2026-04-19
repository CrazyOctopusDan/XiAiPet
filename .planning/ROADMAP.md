# Roadmap: XiAiPet 宠物烘焙

## Overview

这条路线以“先把交易可信边界做对，再把双端功能做完整”为原则推进。先建立微信小程序与 CloudBase 的环境、身份、数据模型和安全边界，再实现商品浏览、购物车、个人资料与地址，随后完成结算、支付和订单闭环，最后补齐商户端运营能力与运行时配置。

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation and Cloud Boundary** - 建立双端小程序基础骨架、CloudBase 环境边界与用户身份入口
- [ ] **Phase 2: Catalog and Product Discovery** - 实现首页、分类浏览、搜索、详情和会员/库存展示
- [ ] **Phase 3: Cart State and Product Selection** - 实现购物车、规格加购与跨页面状态同步
- [ ] **Phase 4: Account, Pets and Address Context** - 实现个人中心、资料编辑、宠物、地址与余额流水
- [ ] **Phase 5: Checkout, Payment and Orders** - 实现确认订单、预约履约、支付和订单查询闭环
- [ ] **Phase 6: Merchant Operations and Runtime Config** - 实现商户端订单、商品、用户、运营配置管理

## Phase Details

### Phase 1: Foundation and Cloud Boundary
**Goal**: 搭建客户端/商户端小程序基础工程、CloudBase 数据模型与权限边界，并打通微信身份引导。
**Depends on**: Nothing (first phase)
**Requirements**: [AUTH-01, AUTH-02]
**Success Criteria** (what must be TRUE):
  1. 用户首次进入客户端时，系统能建立或恢复其微信账户身份。
  2. 小程序和云环境已分离出公开读数据与敏感交易写数据的边界。
  3. 双端工程、共享模型与基础发布链路具备继续开发的稳定起点。
  4. 敏感配置不再写入业务代码或规划文档。
**UI hint**: yes
**Plans**: 9 plans

Plans:
- [x] 01-01: 搭建根 workspace、敏感文件忽略规则与 shared Wave 0 测试脚手架
- [x] 01-02: 显式建立客户端、商户端与云函数子工程壳层配置和 workspace manifests
- [x] 01-03: 建立 `packages/shared` 的类型、schema、纯规则和导出边界
- [x] 01-04: 定义 CloudBase `dev/prod` 环境、集合、索引与安全规则
- [x] 01-05: 实现 `bootstrapUser`、`bindPhone`、`assertMerchantAccess` 云函数边界
- [x] 01-06: 实现客户端启动壳层、身份引导与客户页面路由注册
- [x] 01-07: 实现客户端手机号绑定页面与安全持久化链路
- [x] 01-08: 实现商户端白名单入口与商户页面路由注册
- [x] 01-09: 实现手动 `prod` 发布脚本、发布文档与敏感文件忽略规则

### Phase 2: Catalog and Product Discovery
**Goal**: 打通客户端商品发现链路，让用户能从首页进入分类、搜索和商品详情。
**Depends on**: Phase 1
**Requirements**: [CAT-01, CAT-02, CAT-03, CAT-04, CAT-05, CAT-06, CAT-07]
**Success Criteria** (what must be TRUE):
  1. 用户可以从首页进入商品列表并按履约方式与分类浏览商品。
  2. 商品列表支持左侧分类联动、售罄折叠和库存/会员门槛展示。
  3. 用户可以搜索商品并在无结果时看到明确空状态。
  4. 商品详情完整展示图片、规格配方、等级限制和分享能力。
**UI hint**: yes
**Plans**: 5 plans

Plans:
- [x] 02-01: 实现首页、Banner、提前预定入口和列表页分类联动
- [x] 02-02: 实现搜索、商品详情、分享和商品长图展示
- [x] 02-03: 实现库存售罄、会员门槛、规格摘要等浏览态规则
- [ ] 02-04: 恢复微信原生透明导航，并修复 catalog 尾部分类跳转导致的整页位移
- [ ] 02-05: 统一 discovery 卡片 CTA、售罄视觉和详情页底部操作栏表现

### Phase 3: Cart State and Product Selection
**Goal**: 建立可靠的购物车状态中心，支持规格商品快速加购和库存约束。
**Depends on**: Phase 2
**Requirements**: [CART-01, CART-02, CART-03, CART-04]
**Success Criteria** (what must be TRUE):
  1. 用户可以在列表、详情和购物车页面一致地增减商品数量。
  2. 规格配方商品可通过快速购买卡片完成选择后加入购物车。
  3. 库存上限校验在所有加购入口表现一致。
  4. 购物车角标、件数和金额在跨页面切换时保持同步。
**UI hint**: yes
**Plans**: 3 plans

Plans:
- [ ] 03-01: 建立购物车数据模型、跨页面状态同步和库存校验
- [ ] 03-02: 实现规格配方选择弹层和快速加购逻辑
- [ ] 03-03: 实现购物车页、删除/清空逻辑和结算入口

### Phase 4: Account, Pets and Address Context
**Goal**: 补齐订单前必需的用户上下文，包括资料、宠物、地址和余额流水。
**Depends on**: Phase 3
**Requirements**: [PROF-01, PROF-02, PROF-03, PROF-04, PET-01, ADDR-01, ADDR-02, ADDR-03, BAL-01]
**Success Criteria** (what must be TRUE):
  1. 用户可以在个人中心查看个人信息、余额、会员等级并进入相关管理页面。
  2. 用户可以新增和编辑宠物资料，以及同城/快递地址。
  3. 地址选择后能回填到订单确认链路，不需要重复录入。
  4. 用户可以查看按月份汇总的余额流水。
**UI hint**: yes
**Plans**: 3 plans

Plans:
- [ ] 04-01: 实现个人中心、个人信息页与生日一次性设置规则
- [ ] 04-02: 实现同城/快递地址管理与回填链路
- [ ] 04-03: 实现宠物资料管理和余额流水页面

### Phase 5: Checkout, Payment and Orders
**Goal**: 完成确认订单、预约履约、支付与订单查询闭环，并确保金额/库存一致性。
**Depends on**: Phase 4
**Requirements**: [PET-02, CHK-01, CHK-02, CHK-03, CHK-04, CHK-05, CHK-06, CHK-07, CHK-08, ORD-01, ORD-02, ORD-03]
**Success Criteria** (what must be TRUE):
  1. 用户可以按配送、自取、快递三种模式完成订单确认和预约选择。
  2. 系统能正确计算配送费、处理备注历史、校验已阅读提示并生成订单快照。
  3. 用户可以通过微信支付或余额支付完成下单，并在支付后进入订单列表。
  4. 订单列表与订单详情能准确反映订单状态、商品和金额信息。
**UI hint**: yes
**Plans**: 4 plans

Plans:
- [ ] 05-01: 实现确认订单页的三种履约模式、预约时间、地址/电话/宠物/备注交互
- [ ] 05-02: 实现配送费计算、订单快照、微信支付/余额支付和支付回调链路
- [ ] 05-03: 实现我的订单页、订单详情页和支付后跳转闭环
- [ ] 05-04: 把 mock 订单/支付闭环修正为云端订单持久化、后端余额支付事务和微信支付正式骨架

### Phase 6: Merchant Operations and Runtime Config
**Goal**: 完成商户端订单、商品、用户和运营配置管理，使店主可以独立运营业务。
**Depends on**: Phase 5
**Requirements**: [MORD-01, MORD-02, MCAT-01, MPRD-01, MPRD-02, MUSR-01, MUSR-02, OPS-01]
**Success Criteria** (what must be TRUE):
  1. 商户可以查看订单并手动推进订单状态。
  2. 商户可以管理品类、商品基础信息、规格定价和履约方式。
  3. 商户可以搜索用户、调整余额并留下可追踪流水。
  4. 店铺位置、Banner、配送费规则、会员阈值和定制提示可以在运行时调整。
**UI hint**: yes
**Plans**: 12 plans

Plans:
- [ ] 06-01-PLAN.md — 建立商户订单履约 contract、手工结算审计模型与 merchant miniapp 测试基线
- [ ] 06-02-PLAN.md — 建立品类/商品共享 contract，显式纳入 `iconToken` 与组合定价规则
- [ ] 06-03-PLAN.md — 建立用户管理与运行时配置分区共享 contract
- [ ] 06-04-PLAN.md — 实现商户订单查询、详情与状态流转云函数
- [ ] 06-05-PLAN.md — 实现品类/商品云函数与集合/索引/安全配置
- [ ] 06-06-PLAN.md — 实现用户搜索、余额调整与运行时配置云函数
- [ ] 06-07-PLAN.md — 实现商户订单列表/详情 UI
- [ ] 06-08-PLAN.md — 实现品类管理、商品列表与三步商品编辑 UI
- [ ] 06-09-PLAN.md — 实现用户搜索与余额调整 UI
- [ ] 06-10-PLAN.md — 实现商户运营配置管理页与分区保存 UI
- [ ] 06-11-PLAN.md — 把保存的运营配置与余额调整文案接入客户端展示
- [ ] 06-12-PLAN.md — 完成商户工作台入口、页面注册与云函数注册整合

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation and Cloud Boundary | 9/9 | Complete | 2026-04-16 |
| 2. Catalog and Product Discovery | 3/5 | Gap fixes planned | - |
| 3. Cart State and Product Selection | 0/3 | Not started | - |
| 4. Account, Pets and Address Context | 0/3 | Not started | - |
| 5. Checkout, Payment and Orders | 0/3 | Not started | - |
| 6. Merchant Operations and Runtime Config | 0/12 | Not started | - |

## Backlog

### Phase 999.1: Follow-up — Phase 2 incomplete plans (BACKLOG)

**Goal:** Resolve plans that ran without producing summaries during Phase 2 execution
**Source phase:** 2
**Deferred at:** 2026-04-19 during `$gsd-next` advancement to Phase 6
**Plans:**
- [ ] 02-04: 恢复微信原生透明导航，并修复 catalog 尾部分类跳转导致的整页位移 (ran, no SUMMARY.md)
- [ ] 02-05: 统一 discovery 卡片 CTA、售罄视觉和详情页底部操作栏表现 (ran, no SUMMARY.md)
