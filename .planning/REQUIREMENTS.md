# Requirements: XiAiPet 宠物烘焙

**Defined:** 2026-04-16
**Core Value:** 让宠物家长在微信内以尽可能少的步骤完成“选品-预约-支付-履约”，同时让店主能用同一套云后台稳定管理商品、订单、会员门槛和余额。

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: 用户首次进入客户端小程序时，系统可基于微信登录态建立或恢复账户身份。
- [ ] **AUTH-02**: 用户在需要预留电话的场景下，可以使用微信手机号能力自动填写，或手动补录手机号。

### Profile

- [ ] **PROF-01**: 用户可以在个人中心查看头像、余额、累计消费和会员等级。
- [ ] **PROF-02**: 用户可以编辑昵称和性别信息。
- [ ] **PROF-03**: 用户只能设置一次生日，后续不可重复修改。
- [ ] **PROF-04**: 用户可以从个人中心进入地址管理、余额流水和宠物信息管理页面。

### Pets

- [ ] **PET-01**: 用户可以新增和编辑宠物资料，包括名称、性别、出生日期和过敏源。
- [ ] **PET-02**: 用户在配送订单确认页可以多选宠物，并把选中的宠物信息写入订单快照。

### Address

- [ ] **ADDR-01**: 用户可以新增、编辑和选择同城配送地址。
- [ ] **ADDR-02**: 用户可以新增、编辑和选择快递地址。
- [ ] **ADDR-03**: 用户从订单确认页进入地址列表选择地址后，可以无缝返回订单确认页并带回所选地址。

### Catalog

- [ ] **CAT-01**: 用户可以在首页查看标题、Banner、提前预定入口和入会权益模块。
- [ ] **CAT-02**: 用户可以在购物列表页按自取、配送、快递切换商品视图，并按一级分类/二级分类浏览商品。
- [ ] **CAT-03**: 商品列表滚动时，左侧分类会联动聚焦；售罄商品默认折叠，可展开查看。
- [ ] **CAT-04**: 用户可以通过节流搜索快速查找商品，并在无结果时看到空状态。
- [ ] **CAT-05**: 用户可以查看商品详情，包括轮播图、简介、会员等级限制、规格配方信息和长图详情。
- [ ] **CAT-06**: 用户可以从商品详情页分享商品到微信。
- [ ] **CAT-07**: 商品列表和详情会正确体现库存售罄状态与会员等级可购门槛。

### Cart

- [ ] **CART-01**: 用户可以在列表页、详情页和购物车页对商品进行加入、增减和删除，且数量不能超过库存。
- [ ] **CART-02**: 对于有规格配方信息的商品，用户可以通过快速购买卡片完成规格选择后加入购物车。
- [ ] **CART-03**: 浮动购物车角标会在列表、详情和购物车页面保持同步。
- [ ] **CART-04**: 用户可以清空购物车，并实时看到商品总件数和金额变化。

### Checkout

- [ ] **CHK-01**: 用户在确认订单页可以切换配送、自取和快递三种履约方式。
- [ ] **CHK-02**: 用户可以在确认订单页查看店铺位置，并通过地图能力打开门店位置。
- [ ] **CHK-03**: 用户可以为配送或自取订单选择符合业务规则的预约日期与时间段。
- [ ] **CHK-04**: 用户在自取订单中可以维护预留电话，并通过微信手机号能力自动填写。
- [ ] **CHK-05**: 系统可以基于配送地址与店铺地址的距离，按配置规则计算配送费并展示提示信息。
- [ ] **CHK-06**: 用户可以填写订单备注，系统会为该用户保留最多 10 条历史备注并支持删除历史备注。
- [ ] **CHK-07**: 当存在定制提示时，用户必须勾选“已阅读”后才可下单。
- [ ] **CHK-08**: 用户可以选择微信支付或余额支付完成下单。

### Orders

- [ ] **ORD-01**: 系统会在下单时生成订单快照，保存商品、规格、数量、宠物、备注、联系方式、地址/门店、履约方式和金额明细。
- [ ] **ORD-02**: 用户支付完成后会进入我的订单页；无订单时展示空状态并可跳转回购物列表页。
- [ ] **ORD-03**: 用户可以查看订单详情，看到订单状态、商品信息、金额和履约信息。

### Balance

- [ ] **BAL-01**: 用户可以按月份查看余额流水列表，并看到该月收入与支出汇总。

### Merchant Orders

- [ ] **MORD-01**: 商户可以查看全部订单列表并进入订单详情页。
- [ ] **MORD-02**: 商户可以在订单详情中手动修改订单状态。

### Merchant Catalog

- [ ] **MCAT-01**: 商户可以新增和删除商品一级品类，并维护品类名称和 icon。
- [ ] **MPRD-01**: 商户可以创建和编辑商品基础信息，包括图片、名称、描述、等级限制、状态、库存和可用履约方式。
- [ ] **MPRD-02**: 商户可以维护商品定价和销售规则，包括基准价格、配方标题、配方及配方加价、可选规格、限购数量和商品详情内容。

### Merchant Users

- [ ] **MUSR-01**: 商户可以按手机号或用户名搜索用户。
- [ ] **MUSR-02**: 商户可以为用户调整余额，并自动生成可追踪的余额流水记录。

### Operations

- [ ] **OPS-01**: 商户或运营可以维护店铺位置、配送费规则、会员等级阈值、首页 Banner 和定制提示等运行时配置。

## v2 Requirements

### Marketing

- **MKT-01**: 用户可以使用优惠券、满减或其他促销权益。
- **MKT-02**: 运营可以配置活动、节日专题或限时营销规则。

### Engagement

- **ENG-01**: 用户可以对订单或商品进行评价与晒单。
- **ENG-02**: 用户可以接收订单状态或履约提醒通知中心消息。

### Expansion

- **EXP-01**: 系统支持多门店或多商家模式。
- **EXP-02**: 系统提供 Web 商户后台和经营分析看板。

## Out of Scope

| Feature | Reason |
|---------|--------|
| 独立会员中心入口 | 需求文档明确不展示该按钮，首发不做 |
| 优惠券展示和管理 | 需求文档明确不展示优惠券，且不属于首发闭环刚需 |
| 社交社区/内容订阅 | 与当前宠物烘焙交易闭环无直接关系 |
| Web/H5/App 三端同步发布 | 当前只要求微信小程序与微信云服务 |
| 多店铺平台化能力 | 当前业务是单店宠物烘焙，提前平台化会导致范围失控 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| CAT-01 | Phase 2 | Pending |
| CAT-02 | Phase 2 | Pending |
| CAT-03 | Phase 2 | Pending |
| CAT-04 | Phase 2 | Pending |
| CAT-05 | Phase 2 | Pending |
| CAT-06 | Phase 2 | Pending |
| CAT-07 | Phase 2 | Pending |
| CART-01 | Phase 3 | Pending |
| CART-02 | Phase 3 | Pending |
| CART-03 | Phase 3 | Pending |
| CART-04 | Phase 3 | Pending |
| PROF-01 | Phase 4 | Pending |
| PROF-02 | Phase 4 | Pending |
| PROF-03 | Phase 4 | Pending |
| PROF-04 | Phase 4 | Pending |
| PET-01 | Phase 4 | Pending |
| ADDR-01 | Phase 4 | Pending |
| ADDR-02 | Phase 4 | Pending |
| ADDR-03 | Phase 4 | Pending |
| BAL-01 | Phase 4 | Pending |
| PET-02 | Phase 5 | Pending |
| CHK-01 | Phase 5 | Pending |
| CHK-02 | Phase 5 | Pending |
| CHK-03 | Phase 5 | Pending |
| CHK-04 | Phase 5 | Pending |
| CHK-05 | Phase 5 | Pending |
| CHK-06 | Phase 5 | Pending |
| CHK-07 | Phase 5 | Pending |
| CHK-08 | Phase 5 | Pending |
| ORD-01 | Phase 5 | Pending |
| ORD-02 | Phase 5 | Pending |
| ORD-03 | Phase 5 | Pending |
| MORD-01 | Phase 6 | Pending |
| MORD-02 | Phase 6 | Pending |
| MCAT-01 | Phase 6 | Pending |
| MPRD-01 | Phase 6 | Pending |
| MPRD-02 | Phase 6 | Pending |
| MUSR-01 | Phase 6 | Pending |
| MUSR-02 | Phase 6 | Pending |
| OPS-01 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 42 total
- Mapped to phases: 42
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-16*
*Last updated: 2026-04-16 after initial definition*
