# Roadmap: XiAiPet 宠物烘焙

## Overview

这条路线以“先把交易可信边界做对，再把双端功能做完整”为原则推进。先建立微信小程序与 CloudBase 的环境、身份、数据模型和安全边界，再实现商品浏览、购物车、个人资料与地址，随后完成结算、支付和订单闭环，最后补齐商户端运营能力与运行时配置。

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation and Cloud Boundary** - 建立双端小程序基础骨架、CloudBase 环境边界与用户身份入口
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
**Plans**: 3 plans

Plans:
- [ ] 01-01: 搭建 `customerFrontend/`、`merchantFrontend/`、`backend/` 基础工程和共享模型结构
- [ ] 01-02: 设计 CloudBase 集合、索引、权限规则和敏感写操作云函数边界
- [ ] 01-03: 实现用户身份引导、基础页面壳层和安全配置/发布链路约束

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
**Plans**: 3 plans

Plans:
- [ ] 02-01: 实现首页、Banner、提前预定入口和列表页分类联动
- [ ] 02-02: 实现搜索、商品详情、分享和商品长图展示
- [ ] 02-03: 实现库存售罄、会员门槛、规格摘要等浏览态规则

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
**Plans**: 3 plans

Plans:
- [ ] 05-01: 实现确认订单页的三种履约模式、预约时间、地址/电话/宠物/备注交互
- [ ] 05-02: 实现配送费计算、订单快照、微信支付/余额支付和支付回调链路
- [ ] 05-03: 实现我的订单页、订单详情页和支付后跳转闭环

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
**Plans**: 3 plans

Plans:
- [ ] 06-01: 实现商户订单管理与状态流转
- [ ] 06-02: 实现品类、商品和规格定价管理表单
- [ ] 06-03: 实现用户搜索、余额调整与运营配置管理

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation and Cloud Boundary | 0/3 | Not started | - |
| 2. Catalog and Product Discovery | 0/3 | Not started | - |
| 3. Cart State and Product Selection | 0/3 | Not started | - |
| 4. Account, Pets and Address Context | 0/3 | Not started | - |
| 5. Checkout, Payment and Orders | 0/3 | Not started | - |
| 6. Merchant Operations and Runtime Config | 0/3 | Not started | - |
