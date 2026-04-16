# Architecture Research

**Domain:** 双端微信小程序共享 CloudBase 后端
**Researched:** 2026-04-16
**Confidence:** HIGH

## Recommended Architecture

采用“两个原生微信小程序 + 一套 CloudBase 环境能力 + 云函数托管敏感写操作”的结构。

客户端与商户端共享统一的数据模型和业务规则，但保持各自独立的页面、导航和权限入口。公开商品与只读配置可在满足安全规则的前提下直接由小程序读取；订单创建、支付、库存扣减、余额调整、配送费计算和商户级管理操作统一通过云函数执行。

## Major Components

### 1. Customer Mini Program

职责：
- 首页、商品浏览、搜索、商品详情、购物车
- 订单确认、预约、自取/配送/快递切换、支付
- 订单列表/详情、个人中心、地址、宠物、余额流水

### 2. Merchant Mini Program

职责：
- 订单查看与状态推进
- 品类与商品 CRUD
- 用户查询、余额调整
- 运营配置维护：店铺位置、配送费规则、会员等级阈值、定制提示、Banner 等

### 3. CloudBase Database

建议集合：
- `users`
- `user_profiles`
- `pets`
- `addresses_local`
- `addresses_shipping`
- `categories`
- `products`
- `product_options`
- `carts`
- `orders`
- `order_status_logs`
- `balance_ledger`
- `store_configs`
- `delivery_fee_rules`
- `banners`

### 4. Cloud Functions

建议函数边界：
- `bootstrapUser`
- `getCatalog`
- `upsertCart`
- `prepareCheckout`
- `calculateDeliveryFee`
- `createOrder`
- `payOrder`
- `handlePayNotify`
- `updateOrderStatus`
- `adjustBalance`
- `upsertProduct`
- `upsertStoreConfig`

### 5. Cloud Storage

职责：
- 商品主图、轮播图、长图详情
- 品类 icon
- Banner 资源
- 可能的宠物头像/附件（如果后续需要）

## Data Flow

### Public/Low-Risk Reads

1. 小程序启动后 `wx.cloud.init`
2. 客户端读取只读配置、Banner、分类、商品摘要
3. 详情页读取商品详情和规格信息

### Authenticated User Flows

1. 小程序登录态换取用户身份
2. 用户首次进入通过 `bootstrapUser` 建立账户与默认资料
3. 地址、宠物、备注历史等私人数据按 `_openid` 或安全规则隔离

### Sensitive Transaction Flows

1. 用户提交结算信息到 `prepareCheckout`
2. 云函数校验商品状态、库存、会员门槛、履约方式和费用规则
3. `createOrder` 生成订单快照并锁定金额
4. `payOrder` 发起支付参数准备，支付回调由 `handlePayNotify` 更新订单、扣减库存、写入流水

### Merchant Management Flows

1. 商户端登录后读取其可访问的订单、商品、用户数据
2. 商品、库存、余额、状态等操作统一走云函数写入
3. 所有关键写操作同时产生日志或流水记录，便于对账和追踪

## Component Boundaries

- 客户端只负责展示与收集用户输入，不负责金额、库存、会员门槛的最终裁决。
- 商户端只负责业务管理，不应直接持有支付或敏感密钥。
- CloudBase 数据库负责持久化和查询；云函数负责鉴权、校验、原子更新与第三方集成。
- 配置集合与业务数据集合分离，避免把频繁变更的运营参数写进页面逻辑。

## Build Order Implications

1. 先完成环境、数据模型、权限、安全规则和用户引导。
2. 再完成客户侧商品浏览和购物车，以尽早验证核心转化路径。
3. 然后补足资料、地址、宠物和余额等“下单前必要上下文”。
4. 在此基础上做结算、支付与订单闭环。
5. 最后补齐商户侧运营与配置能力，减少前期双端并发复杂度。

## Architecture Risks

- 如果订单快照未冻结商品价格、规格和配送费，后续商品改价会污染历史订单。
- 如果不提前为商品筛选、订单查询、地址和用户检索建索引，列表页性能会很快恶化。
- 如果直接把库存和余额写权限开放给前端，会在首个并发或恶意请求中出问题。

## Sources

- https://docs.cloudbase.net/cms/usage/use-data
- https://docs.cloudbase.net/database/introduce
- https://docs.cloudbase.net/database/data-permission
- https://docs.cloudbase.net/database/security-rules
- `req/需求文档.md`

---
*Architecture research completed: 2026-04-16*
