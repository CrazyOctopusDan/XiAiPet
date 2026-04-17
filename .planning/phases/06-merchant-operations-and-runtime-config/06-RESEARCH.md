# Phase 06: Merchant Operations and Runtime Config - Research

**Researched:** 2026-04-17
**Domain:** WeChat merchant mini program operations on CloudBase
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Merchant workspace structure
- **D-01:** 商户端首页采用“管理卡片入口”结构，不做固定 tab 栏或五段式后台导航。
- **D-02:** 首页卡片至少承接 `订单管理`、`品类/商品管理`、`用户管理`、`运营配置` 这几类运营入口；具体视觉可由 planning 细化。
- **D-03:** `运营配置` 保持单一入口，进入后按分区编辑，而不是首页继续拆成多个独立配置卡片。

### Order operations and status governance
- **D-04:** 商户订单列表默认按履约进度分组，而不是按支付结果分组。
- **D-05:** 已支付订单的履约流转按履约方式细分，不使用所有模式共享的一套极简状态。
- **D-06:** 三种履约方式的状态链固定为：
  - `delivery=待处理 > 制作中 > 配送中 > 已完成`
  - `pickup=待处理 > 制作中 > 待自取 > 已完成`
  - `express=待处理 > 制作中 > 待发货 > 已完成`
- **D-07:** 未支付订单首版允许商户人工标记为“已支付/已处理”，不只做只读查看。
- **D-08:** 人工兜底把未支付单改成“已支付/已处理”时，审计必须记录操作人、时间、前后状态、原因备注，以及调整方式（如线下收款、人工兜底）。
- **D-09:** 商户端内部允许非终态之间灵活切换，但 `已完成` 与 `已取消` 这类终态一旦进入即锁死，不再允许回退或改写。
- **D-10:** 客户端订单列表和订单详情直接展示与商户端一致的细分状态文案，不另做一套简化用户态映射。

### Category and product editing model
- **D-11:** 一级品类与商品首版继续分开管理，但信息架构上通过首页卡片进入，不强制放进固定 tab。
- **D-12:** 商品首版只挂一个一级品类，不支持多品类挂载。
- **D-13:** 商品编辑采用“先列表，再进入详情后分步骤编辑”的工作流，不做单页超长表单。
- **D-14:** 商品编辑步骤固定为 `基础信息 → 规格配方与价格 → 上架设置`。
- **D-15:** 商品列表默认按品类浏览，不以“最近修改”或“状态看板”作为首页主视角。
- **D-16:** 规格和配方都作为独立可编辑行项建模，允许组合出最终价格。
- **D-17:** 组合价格首版默认按“基准价 + 规格加价 + 配方加价”自动计算，但允许少数组合手动覆盖最终价。
- **D-18:** 删除一级品类前必须先把该品类下商品迁走，不允许删除后自动变成未分类或自动下架。

### User search and balance adjustment rules
- **D-19:** 用户搜索结果页默认展示轻量列表：头像、昵称、手机号遮罩、会员等级、当前余额；进入详情后再做操作。
- **D-20:** 余额调整首版同时支持增加、扣减，以及“直接改为指定余额”三种动作。
- **D-21:** “直接改为指定余额”不是仅限纠错的隐藏动作，而是与加减余额同级的日常运营能力。
- **D-22:** 每次余额调整都必须完整落账：原因类型、备注、操作人、时间、调整前余额、调整后余额都不可缺失。
- **D-23:** 原因类型首版固定为预置枚举：`充值`、`补偿`、`人工纠错`、`线下收款`、`其他`，不开放商户自定义类型。
- **D-24:** 提交余额调整前必须二次确认。
- **D-25:** 用户侧余额流水对商户操作展示“规范化标题 + 简短备注”，不是只展示内部标题，也不是完整暴露后台长备注。
- **D-26:** 余额不允许被直接改成负数。

### Operations config model
- **D-27:** `运营配置` 入口内部分区独立保存，每个分区单独提交，不采用整页统一保存。
- **D-28:** 店铺信息首版只开放 `地址`、`地图坐标`、`联系电话` 给商户修改，不开放店名编辑。
- **D-29:** 会员等级阈值首版支持同时配置“累计消费门槛 + 等级名称 + 等级说明文案”。
- **D-30:** 定制提示首版采用“单条长文本 + 开关启用”的模型，不做多条提示项排序。
- **D-31:** Banner 管理首版只支持替换首页单张主 Banner，不做多图排序、上下架与多跳转位。
- **D-32:** 配送费规则沿用需求图中的说明弹层思路，按距离和价格阶梯录入，而不是隐藏成不可见算法。
- **D-33:** 配送费规则录入文案固定为以下阶梯：
  - `5.0 公里内 98 元起送，配送费 0 元`
  - `10.0 公里内 98 元起送，配送费 15 元`
  - `15.0 公里内，配送费 25 元`
  - `20.0 公里内，配送费 40 元`
  - `25.0 公里内，配送费 50 元`
  - `30.0 公里内，配送费 60 元`
  - `35.0 公里内，配送费 65 元`
  - `40.0 公里内，配送费 70 元`
  - `45.0 公里内，配送费 75 元`
  - `50.0 公里内，配送费 80 元`

### Claude's Discretion
- 商户端首页卡片的具体排布、插图和信息密度
- 订单列表分组下的筛选器、搜索框和默认排序细节
- 商品编辑步骤内每一步的字段编排、批量校验和空态文案
- 用户详情页的块状布局与余额调整弹层视觉
- `运营配置` 分区的内部命名、表单组件和保存成功反馈样式

### Deferred Ideas (OUT OF SCOPE)
- 多图 Banner 排序、上下架和跳转配置增强版
- 多品类挂载商品
- 商户自定义余额调整原因类型
- 更复杂的退款、售后和多门店运营能力
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MORD-01 | 商户可以查看全部订单列表并进入订单详情页。 [VERIFIED: .planning/REQUIREMENTS.md] | 新增商户订单查询云函数、履约态扩展、按履约组筛选索引、merchant miniapp list/detail 页面。 [VERIFIED: .planning/phases/06-merchant-operations-and-runtime-config/06-CONTEXT.md][VERIFIED: apps/cloud-functions/src/shared/order-store.ts] |
| MORD-02 | 商户可以在订单详情中手动修改订单状态。 [VERIFIED: .planning/REQUIREMENTS.md] | 在订单模型中新增 fulfillment 状态机、终态锁、手工兜底支付审计字段与操作日志。 [VERIFIED: .planning/phases/06-merchant-operations-and-runtime-config/06-CONTEXT.md][VERIFIED: packages/shared/src/types/order.ts] |
| MCAT-01 | 商户可以新增和删除商品一级品类，并维护品类名称和 icon。 [VERIFIED: .planning/REQUIREMENTS.md] | 新增独立 `categories` 集合与迁移保护规则，避免把一级品类塞进 `runtime_configs` 或 `products`。 [VERIFIED: req/需求文档.md][VERIFIED: apps/customer-miniapp/src/types/catalog.ts] |
| MPRD-01 | 商户可以创建和编辑商品基础信息，包括图片、名称、描述、等级限制、状态、库存和可用履约方式。 [VERIFIED: .planning/REQUIREMENTS.md] | 扩展 `products` schema、CloudBase storage 图片文件流、商品列表/编辑云函数和后台索引。 [VERIFIED: apps/cloud-functions/config/collections/products.json][CITED: https://docs.cloudbase.net/storage/upload-file] |
| MPRD-02 | 商户可以维护商品定价和销售规则，包括基准价格、配方标题、配方及配方加价、可选规格、限购数量和商品详情内容。 [VERIFIED: .planning/REQUIREMENTS.md] | 使用 shared 类型建模 base price/spec/formula/override price，云函数负责组合校验与局部更新。 [VERIFIED: .planning/phases/06-merchant-operations-and-runtime-config/06-CONTEXT.md][CITED: https://docs.cloudbase.net/database/update] |
| MUSR-01 | 商户可以按手机号或用户名搜索用户。 [VERIFIED: .planning/REQUIREMENTS.md] | 商户搜索必须走云函数服务端查询；前端不应直接开放 `users` 集合读取。 [VERIFIED: apps/cloud-functions/config/security/database.rules.json][CITED: https://docs.cloudbase.net/en/database/read] |
| MUSR-02 | 商户可以为用户调整余额，并自动生成可追踪的余额流水记录。 [VERIFIED: .planning/REQUIREMENTS.md] | 复用 `balance_accounts` + `balance_ledgers` 账本模式，以服务端事务同时更新账户余额与流水。 [VERIFIED: apps/cloud-functions/src/shared/payment-store.ts][CITED: https://docs.cloudbase.net/database/access/flexdb/transaction] |
| OPS-01 | 商户或运营可以维护店铺位置、配送费规则、会员等级阈值、首页 Banner 和定制提示等运行时配置。 [VERIFIED: .planning/REQUIREMENTS.md] | 推荐 `runtime_configs` 固定 key 分区文档 + `banner.fileID` 存储模型 + 地图位置选点。 [VERIFIED: apps/cloud-functions/config/collections/runtime_configs.json][CITED: https://docs.cloudbase.net/storage/upload-file][CITED: https://developers.weixin.qq.com/miniprogram/dev/api/location/wx.chooseLocation.html] |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- 必须继续使用微信小程序 + 微信云开发 CloudBase；Phase 6 不能引入脱离该拓扑的后台技术路线。 [VERIFIED: AGENTS.md]
- 必须同时考虑客户端小程序、商户端小程序、共享云端后端三部分的一致性，尤其是订单状态与运行时配置。 [VERIFIED: AGENTS.md]
- `appSecret`、支付凭证、代码上传密钥等敏感信息不得进入客户端代码或普通业务集合。 [VERIFIED: AGENTS.md]
- 配送、自取、快递三种履约方式与预约/配送费/会员门槛规则仍然是闭环刚需，Phase 6 的运营配置不能破坏这些约束。 [VERIFIED: AGENTS.md]
- 订单、余额、库存、会员等级相关数据必须可追踪、可审计，避免前端直接篡改。 [VERIFIED: AGENTS.md]
- 需要保留微信开发者工具与代码上传/发布链路的可落地性。 [VERIFIED: AGENTS.md]
- 在本仓库内执行实现前仍需通过 GSD 工作流入口，而不是绕开 planning artifact 直接改仓库。 [VERIFIED: AGENTS.md]

## Summary

Phase 6 is not primarily a UI phase; it is a contract-and-governance phase that happens to surface through the merchant miniapp. The existing repo already has the correct security direction: merchant access is gated by a whitelist cloud function, orders and balances are backend-owned, and `runtime_configs` / `products` are backend-only collections. What is missing is the operational domain model on top of those primitives: merchant fulfillment state, searchable product/category records, auditable balance adjustments, and a runtime config document scheme that supports section-by-section saves. [VERIFIED: apps/cloud-functions/src/assertMerchantAccess/index.ts][VERIFIED: apps/cloud-functions/config/security/database.rules.json][VERIFIED: packages/shared/src/types/order.ts]

The planner should treat Phase 6 as four bounded backend surfaces sharing one merchant shell: `orders`, `catalog`, `users/balance`, and `runtime config`. Each surface should get shared types in `packages/shared`, merchant-only cloud functions in `apps/cloud-functions`, and thin page/service consumers in `apps/merchant-miniapp`. This matches the repo’s current service-first pattern and avoids pushing privileged data access into the mini program. [VERIFIED: packages/shared/src/index.ts][VERIFIED: apps/merchant-miniapp/pages/access-gate/index.ts][VERIFIED: apps/cloud-functions/src/shared/payment-store.ts]

CloudBase documentation reinforces the same shape: transactions are server-side only, security rules are document-scoped and query-subset-sensitive, storage uploads return stable `fileID`s while temporary URLs can expire, and `wx.chooseLocation` / `wx.openLocation` already provide the correct location UX for store config and storefront display. [CITED: https://docs.cloudbase.net/database/access/flexdb/transaction][CITED: https://docs.cloudbase.net/database/configuration/permission/security-rules][CITED: https://docs.cloudbase.net/storage/upload-file][CITED: https://docs.cloudbase.net/storage/get-temp-url][CITED: https://developers.weixin.qq.com/miniprogram/dev/api/location/wx.chooseLocation.html][CITED: https://developers.weixin.qq.com/miniprogram/dev/api/location/wx.openLocation.html]

**Primary recommendation:** Keep merchant reads and all merchant mutations behind new Cloud Functions, split fulfillment state from payment state, introduce a dedicated `categories` collection, and model `runtime_configs` as fixed-key section documents with file-backed banner assets. [VERIFIED: packages/shared/src/types/order.ts][VERIFIED: apps/cloud-functions/config/security/database.rules.json][CITED: https://docs.cloudbase.net/storage/upload-file][CITED: https://docs.cloudbase.net/database/introduce]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Merchant identity gating | API / Backend | Browser / Client | `merchant_users` is backend-only and current allow/deny logic already lives in `assertMerchantAccess`; the merchant app should only present the result. [VERIFIED: apps/cloud-functions/src/assertMerchantAccess/index.ts][VERIFIED: apps/cloud-functions/config/security/database.rules.json] |
| Order listing, detail, and fulfillment transitions | API / Backend | Browser / Client | Merchant order queries need privileged access and fulfillment mutations must stay auditable; the client should render grouped states and invoke explicit actions. [VERIFIED: .planning/phases/06-merchant-operations-and-runtime-config/06-CONTEXT.md][VERIFIED: apps/cloud-functions/src/shared/order-store.ts] |
| Product/category CRUD and validation | API / Backend | Database / Storage | Product images belong in CloudBase storage, while category/product writes need schema validation and indexed persistence. [VERIFIED: req/需求文档.md][CITED: https://docs.cloudbase.net/storage/upload-file][CITED: https://docs.cloudbase.net/database/data-index] |
| Store location selection and preview | Browser / Client | API / Backend | The merchant miniapp should use WeChat native map APIs for selecting and previewing coordinates, then persist the chosen payload through cloud functions. [CITED: https://developers.weixin.qq.com/miniprogram/dev/api/location/wx.chooseLocation.html][CITED: https://developers.weixin.qq.com/miniprogram/dev/api/location/wx.openLocation.html] |
| Balance adjustment and ledgering | API / Backend | Database / Storage | Balance writes must update account state and append a ledger atomically; this is exactly the server-transaction boundary already used for balance payment. [VERIFIED: apps/cloud-functions/src/shared/payment-store.ts][CITED: https://docs.cloudbase.net/database/access/flexdb/transaction] |
| Runtime config section persistence | API / Backend | Database / Storage | Section-level save semantics map best to fixed-key config docs plus optional storage-backed assets; frontend should not own config merge logic. [VERIFIED: apps/cloud-functions/config/collections/runtime_configs.json][CITED: https://docs.cloudbase.net/database/update][CITED: https://docs.cloudbase.net/storage/get-temp-url] |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Native WeChat Mini Program + `wx.cloud` | Base library `>= 2.2.3` for cloud capability | Merchant client shell, native map/location, cloud calls | CloudBase quick start requires `wx.cloud.init` and a base library at least `2.2.3`; location APIs are already native WeChat capabilities. [CITED: https://docs.cloudbase.net/quick-start/mini-program/introduce][CITED: https://developers.weixin.qq.com/miniprogram/dev/api/location/wx.chooseLocation.html] |
| CloudBase document database | Current official capability | Orders, categories, products, users, balances, runtime config | CloudBase documents support flexible JSON structures, indexes, and transactions, which matches the mixed config + commerce data in this phase. [CITED: https://docs.cloudbase.net/database/introduce][CITED: https://docs.cloudbase.net/database/data-index] |
| CloudBase Cloud Functions | Current official capability | Merchant queries, privileged mutations, audits, config writes | Transactions are server-side only and merchant-sensitive writes already belong on the backend in this repo. [CITED: https://docs.cloudbase.net/database/access/flexdb/transaction][VERIFIED: apps/cloud-functions/config/security/database.rules.json] |
| CloudBase storage | Current official capability | Product images, single homepage banner asset | Upload returns stable `fileID`; temporary URLs can be derived on read without storing expiring links in config documents. [CITED: https://docs.cloudbase.net/storage/upload-file][CITED: https://docs.cloudbase.net/storage/get-temp-url] |
| TypeScript | 5.8.3 (workspace pinned) | Shared contracts across merchant app, cloud functions, and customer-facing status mapping | The repo already standardizes cross-package typing with shared exports; Phase 6 adds more shared domain models, not less. [VERIFIED: package.json][VERIFIED: packages/shared/src/index.ts] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `miniprogram-api-typings` | 2.1.31 (`latest` dist-tag on npm as observed in this environment) | Typed `wx.*` APIs, including location and cloud calls | Add to merchant miniapp if page/service type coverage becomes noisy or duplicated. [VERIFIED: npm registry] |
| `dayjs` | 1.11.20 | Format merchant order timestamps and config update metadata consistently | Use in merchant list/detail view models and audit display; avoid ad hoc date string manipulation in pages. [VERIFIED: npm registry] |
| `miniprogram-ci` | 6.0.3 | Standard upload/release automation for both miniapps | Keep the release path compatible with the project’s required WeChat deploy chain. [VERIFIED: npm registry][VERIFIED: AGENTS.md] |
| Vitest | 3.1.2 (workspace pinned) | Cloud function, shared model, and merchant view-model tests | Use for all new shared/cloud-function coverage; merchant miniapp currently needs a Wave 0 test harness. [VERIFIED: package.json][VERIFIED: apps/cloud-functions/vitest.config.ts][VERIFIED: packages/shared/vitest.config.ts] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Dedicated `categories` collection | Store categories inside `runtime_configs` | Simpler CRUD at first, but weak referential integrity and awkward “move products before delete” enforcement. [VERIFIED: req/需求文档.md][VERIFIED: .planning/phases/06-merchant-operations-and-runtime-config/06-CONTEXT.md] |
| Fixed-key section docs in `runtime_configs` | One monolithic config document | One document reduces read count, but separate section docs align with D-27 and avoid whole-document overwrite conflicts. [VERIFIED: .planning/phases/06-merchant-operations-and-runtime-config/06-CONTEXT.md][CITED: https://docs.cloudbase.net/database/update] |
| Merchant cloud functions for reads and writes | Direct merchant-miniapp DB access with security rules | Security rules create query-subset constraints and are a poor fit for admin-wide search/list surfaces; cloud functions keep admin ACL explicit. [CITED: https://docs.cloudbase.net/database/configuration/permission/security-rules][VERIFIED: apps/cloud-functions/config/security/database.rules.json] |

**Installation:**
```bash
pnpm add -Dw miniprogram-api-typings dayjs miniprogram-ci
```

**Version verification:** [VERIFIED: npm registry][VERIFIED: package.json]
- `miniprogram-api-typings`: `2.1.31` latest dist-tag observed on npm; publish time `2026-03-12T04:00:45.778Z`. [VERIFIED: npm registry]
- `miniprogram-ci`: `6.0.3`; publish time `2026-04-16T23:38:27.905Z`. [VERIFIED: npm registry]
- `dayjs`: `1.11.20`; publish time `2026-03-12T11:30:39.315Z`. [VERIFIED: npm registry]
- `vitest`: npm latest is `4.1.4` published `2026-04-09T07:36:52.741Z`, but this workspace currently pins `3.1.2`; planning should follow the workspace pin unless a dedicated upgrade task is created. [VERIFIED: npm registry][VERIFIED: package.json]
- `TypeScript`: workspace pin is `5.8.3`; planning should follow the workspace pin. [VERIFIED: package.json]

## Architecture Patterns

### System Architecture Diagram

```text
Merchant Operator
  -> Merchant Miniapp Shell
    -> Access Gate
      -> assertMerchantAccess()
        -> merchant_users
    -> Dashboard Cards
      -> Orders pages
        -> queryMerchantOrders() / getMerchantOrderDetail()
          -> orders + merchant indexes
        -> updateMerchantOrderStatus()
          -> orders
          -> order status audit log
      -> Category/Product pages
        -> queryCategories() / upsertCategory()
          -> categories
        -> queryProducts() / upsertProduct()
          -> products
          -> Cloud Storage (images)
      -> User pages
        -> searchMerchantUsers()
          -> users + balance_accounts
        -> adjustUserBalance()
          -> transaction(balance_accounts -> balance_ledgers)
      -> Runtime Config pages
        -> getRuntimeConfigSections() / upsertRuntimeConfigSection()
          -> runtime_configs
          -> Cloud Storage (banner fileID)

Customer Miniapp
  -> catalog / checkout / orders services
    -> readRuntimeConfig()
      -> runtime_configs
    -> readOrderStatusView()
      -> orders(payment + fulfillment state)
```

### Recommended Project Structure
```text
apps/
├── merchant-miniapp/
│   ├── pages/
│   │   ├── access-gate/          # Existing merchant allow/deny shell
│   │   ├── workspace/            # Dashboard card entry page
│   │   ├── orders/               # Merchant order list
│   │   ├── order-detail/         # Status transitions + audit view
│   │   ├── categories/           # Category list/form
│   │   ├── products/             # Product list
│   │   ├── product-editor/       # 3-step editor
│   │   ├── users/                # Merchant user search
│   │   ├── user-detail/          # Balance actions + ledger summary
│   │   └── runtime-config/       # Sectioned runtime config editor
│   └── src/services/             # Thin cloud-function callers + view-model mappers
├── cloud-functions/
│   └── src/
│       ├── queryMerchantOrders/
│       ├── getMerchantOrderDetail/
│       ├── updateMerchantOrderStatus/
│       ├── queryCategories/
│       ├── upsertCategory/
│       ├── queryProducts/
│       ├── upsertProduct/
│       ├── searchMerchantUsers/
│       ├── adjustUserBalance/
│       ├── getRuntimeConfigSections/
│       ├── upsertRuntimeConfigSection/
│       └── shared/               # Reusable store/auth helpers
packages/
└── shared/
    ├── src/types/                # Order, product, category, balance, runtime config
    ├── src/schema/               # Type guards / validators
    └── src/rules/                # Derived pricing / status labeling helpers
```

### Pattern 1: Contract-First Shared Domain Models
**What:** Define merchant-facing order/category/product/runtime-config/balance types and validators in `packages/shared` before building pages or cloud functions. [VERIFIED: packages/shared/src/index.ts]
**When to use:** Use for every new cross-tier record in Phase 6, especially anything rendered in both merchant and customer surfaces. [VERIFIED: packages/shared/src/types/order.ts][VERIFIED: apps/customer-miniapp/src/services/orders.ts]
**Example:**
```typescript
// Source: repo pattern from packages/shared exports + existing order types
export interface MerchantOrderFulfillmentState {
  mode: 'delivery' | 'pickup' | 'express';
  status: 'pending' | 'in_production' | 'out_for_delivery' | 'ready_for_pickup' | 'ready_to_ship' | 'completed' | 'cancelled';
  timeline: Array<{
    fromStatus: string;
    toStatus: string;
    operatorOpenid: string;
    operatorName: string;
    reason?: string;
    changedAt: string;
  }>;
}
```

### Pattern 2: Merchant Writes Stay Server-Owned
**What:** Merchant miniapp pages call dedicated cloud functions; cloud functions validate access, load current state, perform partial updates or transactions, and write audit metadata. [VERIFIED: apps/cloud-functions/src/shared/payment-store.ts][VERIFIED: apps/cloud-functions/src/assertMerchantAccess/index.ts]
**When to use:** Use for order transitions, category/product edits, balance adjustments, and runtime config saves. [VERIFIED: apps/cloud-functions/config/security/database.rules.json]
**Example:**
```typescript
// Source: adapted from CloudBase update/transaction docs and repo payment-store pattern
const db = app.database();
const _ = db.command;

await db.collection('balance_accounts').doc(openid).update({
  balance: _.inc(delta)
});
```

### Pattern 3: Fixed-Key Runtime Config Sections
**What:** Store each editable section in `runtime_configs` as one document with a stable `_id`, typed payload, and metadata, for example `store-profile`, `delivery-rules`, `membership-tiers`, `banner`, `custom-notice`. [VERIFIED: .planning/phases/06-merchant-operations-and-runtime-config/06-CONTEXT.md][VERIFIED: apps/cloud-functions/config/collections/runtime_configs.json]
**When to use:** Use whenever a section is independently editable and independently saveable under D-27. [VERIFIED: .planning/phases/06-merchant-operations-and-runtime-config/06-CONTEXT.md]
**Example:**
```typescript
// Source: repo collection shape + CloudBase partial update capability
export interface RuntimeConfigSectionDoc<TPayload> {
  _id: 'store-profile' | 'delivery-rules' | 'membership-tiers' | 'banner' | 'custom-notice';
  section: string;
  payload: TPayload;
  updatedAt: string;
  updatedBy: {
    openid: string;
    merchantId: string;
  };
}
```

### Pattern 4: Append-Only Audit for Financial and Final-State Operations
**What:** Any merchant balance action or irreversible order transition writes both the new state and an append-only audit row/timeline entry. [VERIFIED: apps/cloud-functions/src/shared/payment-store.ts][VERIFIED: .planning/phases/06-merchant-operations-and-runtime-config/06-CONTEXT.md]
**When to use:** Use for `MORD-02` and `MUSR-02`; do not settle for “updatedAt only”. [VERIFIED: .planning/REQUIREMENTS.md]
**Example:**
```typescript
// Source: adapted from existing balance ledger pattern in payment-store
await ledgers.doc(ledgerId).set({
  data: {
    id: ledgerId,
    openid,
    operatorOpenid,
    reason,
    amountDelta,
    beforeBalance,
    afterBalance,
    createdAt: now
  }
});
```

### Anti-Patterns to Avoid
- **Overloading `order.status` with every merchant state:** Keep payment and fulfillment concerns separate so Phase 5 payment flows do not collapse into Phase 6 fulfillment flows. [VERIFIED: packages/shared/src/types/order.ts]
- **Putting categories inside `runtime_configs`:** D-18 needs product/category referential behavior that belongs in first-class records, not anonymous config arrays. [VERIFIED: .planning/phases/06-merchant-operations-and-runtime-config/06-CONTEXT.md]
- **Persisting banner temp URLs:** Temporary URLs can expire; persist `fileID`, derive URLs on read when necessary. [CITED: https://docs.cloudbase.net/storage/upload-file][CITED: https://docs.cloudbase.net/storage/get-temp-url]
- **Using front-end `doc()` access under security rules for admin queries:** CloudBase security rules require query conditions to be a subset of the rule; admin-wide search/list pages are cleaner through cloud functions. [CITED: https://docs.cloudbase.net/database/configuration/permission/security-rules]
- **Replacing whole config documents with `set()` for small edits:** Prefer section docs or partial `update` to reduce overwrite races. [CITED: https://docs.cloudbase.net/database/update]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Store location selection | Custom coordinate text entry or embedded map webview | `wx.chooseLocation` + `wx.openLocation` | The native APIs already return `name`/`address`/`latitude`/`longitude` and fit the WeChat runtime and permission model. [CITED: https://developers.weixin.qq.com/miniprogram/dev/api/location/wx.chooseLocation.html][CITED: https://developers.weixin.qq.com/miniprogram/dev/api/location/wx.openLocation.html] |
| Banner/product image persistence | Base64 blobs or permanent signed URLs in DB | CloudBase storage `fileID` + optional `getTempFileURL` on read | Upload returns a stable `fileID`; temp URLs can expire and should not be the durable record. [CITED: https://docs.cloudbase.net/storage/upload-file][CITED: https://docs.cloudbase.net/storage/get-temp-url] |
| Balance mutation logic | Read-modify-write in page code | Cloud function transaction + append-only `balance_ledgers` | This phase needs before/after balances and audit safety under concurrency. [VERIFIED: apps/cloud-functions/src/shared/payment-store.ts][CITED: https://docs.cloudbase.net/database/access/flexdb/transaction] |
| Merchant authorization | Local boolean flags in miniapp storage | `merchant_users` whitelist + backend assertion | The repo already has this boundary; duplicating auth in page code would be security theater. [VERIFIED: apps/cloud-functions/src/assertMerchantAccess/index.ts] |
| Order status label mapping | A second customer-only status taxonomy | Shared derived label helper from payment + fulfillment state | D-10 explicitly requires customer and merchant to show the same detailed status copy. [VERIFIED: .planning/phases/06-merchant-operations-and-runtime-config/06-CONTEXT.md] |
| Admin search performance fixes | Client full-scan then filter in JS | Server-side `where`/`orderBy`/`limit` + proper indexes | Mini program reads have tighter limits and admin-wide search should not depend on client-visible collection reads. [CITED: https://docs.cloudbase.net/en/database/read][CITED: https://docs.cloudbase.net/database/data-index] |

**Key insight:** Phase 6 succeeds when the merchant miniapp remains a thin operator console over backend-owned commerce state; almost every tempting “quick frontend shortcut” here creates an audit, permission, or data-race bug later. [VERIFIED: apps/cloud-functions/config/security/database.rules.json][VERIFIED: apps/cloud-functions/src/shared/payment-store.ts]

## Common Pitfalls

### Pitfall 1: Payment Status and Fulfillment Status Get Mixed Together
**What goes wrong:** “已支付” becomes the only persisted status, leaving no clean place to represent `制作中` / `配送中` / `待自取` / `待发货`. [VERIFIED: packages/shared/src/types/order.ts]
**Why it happens:** The current order contract only models payment lifecycle at top level. [VERIFIED: packages/shared/src/types/order.ts]
**How to avoid:** Keep `payment.status` for settlement and introduce a separate fulfillment state object plus timeline. [VERIFIED: packages/shared/src/types/order.ts][VERIFIED: .planning/phases/06-merchant-operations-and-runtime-config/06-CONTEXT.md]
**Warning signs:** UI copy branches on `paymentMethod` or `status === 'paid'` to infer operational progress. [VERIFIED: apps/customer-miniapp/src/services/orders.ts]

### Pitfall 2: Admin Reads Are Implemented as Direct Mini Program DB Queries
**What goes wrong:** Queries fail under security rules, or the rules become too permissive to support merchant-wide search/list screens. [CITED: https://docs.cloudbase.net/database/configuration/permission/security-rules]
**Why it happens:** CloudBase security rules are document-scoped and require query conditions to be a subset of the rule; `doc()` access frequently fails that requirement. [CITED: https://docs.cloudbase.net/database/configuration/permission/security-rules]
**How to avoid:** Use cloud functions for all merchant-wide reads and all writes. [VERIFIED: apps/cloud-functions/config/security/database.rules.json]
**Warning signs:** Planning proposes `wx.cloud.database().collection('orders')` in merchant pages. [VERIFIED: apps/merchant-miniapp/pages/access-gate/index.ts]

### Pitfall 3: Banner Links Expire in Production
**What goes wrong:** The homepage banner works after save, then disappears later because the stored URL was only a temporary URL. [CITED: https://docs.cloudbase.net/storage/get-temp-url]
**Why it happens:** Temporary links for private files are intentionally time-bounded. [CITED: https://docs.cloudbase.net/storage/get-temp-url]
**How to avoid:** Persist `fileID`, not signed URL; resolve a temp URL at read time only when a consumer requires HTTPS. [CITED: https://docs.cloudbase.net/storage/upload-file][CITED: https://docs.cloudbase.net/storage/get-temp-url]
**Warning signs:** Config schema includes `bannerUrl` but no `bannerFileId`. [VERIFIED: apps/cloud-functions/config/collections/runtime_configs.json]

### Pitfall 4: Balance Adjustments Skip Ledger Completeness
**What goes wrong:** The user balance changes, but operations cannot later explain who changed it, why, and what the before/after values were. [VERIFIED: .planning/phases/06-merchant-operations-and-runtime-config/06-CONTEXT.md]
**Why it happens:** Teams update only the balance account document and treat `updatedAt` as enough audit trail. [VERIFIED: apps/cloud-functions/src/shared/payment-store.ts]
**How to avoid:** Transactionally update `balance_accounts` and append a fully populated `balance_ledgers` record on every merchant adjustment. [VERIFIED: apps/cloud-functions/src/shared/payment-store.ts][CITED: https://docs.cloudbase.net/database/access/flexdb/transaction]
**Warning signs:** Design has no ledger reason enum, no operator fields, or no secondary confirmation step. [VERIFIED: .planning/phases/06-merchant-operations-and-runtime-config/06-CONTEXT.md]

### Pitfall 5: Category Delete Ignores Attached Products
**What goes wrong:** Deleting a category silently strands product records or forces an unplanned “uncategorized” state. [VERIFIED: .planning/phases/06-merchant-operations-and-runtime-config/06-CONTEXT.md]
**Why it happens:** Category data is treated as a UI list, not a referenced business entity. [VERIFIED: req/需求文档.md]
**How to avoid:** Store categories independently, require a move/reassign workflow before delete, and block deletion in the backend if products still reference the category. [VERIFIED: .planning/phases/06-merchant-operations-and-runtime-config/06-CONTEXT.md]
**Warning signs:** Delete flow has no preflight count of linked products. [VERIFIED: .planning/phases/06-merchant-operations-and-runtime-config/06-CONTEXT.md]

### Pitfall 6: Transactions Are Written Like General Queries
**What goes wrong:** Developers try `where()` inside a transaction flow or keep a long-running transaction open across too many edits. [CITED: https://docs.cloudbase.net/database/access/flexdb/transaction]
**Why it happens:** CloudBase transactions are server-side and the current implementation pattern in this repo uses `doc()`-level reads/writes. [VERIFIED: apps/cloud-functions/src/shared/payment-store.ts][CITED: https://docs.cloudbase.net/database/access/flexdb/transaction]
**How to avoid:** Keep transactions short, doc-addressed, and limited to the minimal account/order/ledger/product records that must change together. [CITED: https://docs.cloudbase.net/database/access/flexdb/transaction]
**Warning signs:** One transaction tries to scan products, compute search results, and mutate state in one pass. [CITED: https://docs.cloudbase.net/database/access/flexdb/transaction]

## Code Examples

Verified patterns from official sources:

### Merchant Banner Upload and Durable Storage
```typescript
// Source: https://docs.cloudbase.net/storage/upload-file
async function uploadBanner(tempFilePath: string) {
  const { fileID } = await wx.cloud.uploadFile({
    cloudPath: `merchant/banner/${Date.now()}.png`,
    filePath: tempFilePath
  });

  return fileID;
}
```

### Resolve a Temporary URL Only When Needed
```typescript
// Source: https://docs.cloudbase.net/storage/get-temp-url
async function resolveBannerPreview(fileID: string) {
  const res = await wx.cloud.getTempFileURL({
    fileList: [fileID]
  });

  return res.fileList?.[0]?.tempFileURL ?? '';
}
```

### Use Native Map APIs for Store Location Editing and Preview
```typescript
// Sources:
// https://developers.weixin.qq.com/miniprogram/dev/api/location/wx.chooseLocation.html
// https://developers.weixin.qq.com/miniprogram/dev/api/location/wx.openLocation.html
async function pickStoreLocation() {
  const picked = await wx.chooseLocation();

  return {
    name: picked.name,
    address: picked.address,
    latitude: picked.latitude,
    longitude: picked.longitude
  };
}

function previewStoreLocation(location: { latitude: number; longitude: number; name: string; address: string }) {
  wx.openLocation({
    latitude: location.latitude,
    longitude: location.longitude,
    name: location.name,
    address: location.address
  });
}
```

### Atomic Balance Mutation in Cloud Function
```typescript
// Source: https://docs.cloudbase.net/database/update
const db = app.database();
const _ = db.command;

await db.collection('balance_accounts').doc(openid).update({
  balance: _.inc(delta)
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Frontend owns sensitive order/balance/product writes | Cloud functions own privileged writes; frontend submits intent only | Current repo architecture and official CloudBase transaction model as of 2026-04-17. [VERIFIED: apps/cloud-functions/config/security/database.rules.json][CITED: https://docs.cloudbase.net/database/access/flexdb/transaction] | Phase 6 should add merchant cloud functions, not direct DB pages. |
| Store operational progress in one coarse order field | Split payment state from fulfillment state and derive shared labels from both | Phase 6 recommendation driven by current repo gap. [VERIFIED: packages/shared/src/types/order.ts][VERIFIED: .planning/phases/06-merchant-operations-and-runtime-config/06-CONTEXT.md] | Avoids breaking Phase 5 payment behavior while enabling D-06 detailed statuses. |
| Save image URLs directly in config docs | Save CloudBase `fileID`, resolve URL only when needed | Current CloudBase storage model. [CITED: https://docs.cloudbase.net/storage/upload-file][CITED: https://docs.cloudbase.net/storage/get-temp-url] | Prevents expired Banner links and keeps assets environment-local. |
| One mutable config blob | Fixed-key section docs with independent save metadata | Phase 6 recommendation driven by D-27. [VERIFIED: .planning/phases/06-merchant-operations-and-runtime-config/06-CONTEXT.md] | Makes section-specific saves, audits, and rollbacks tractable. |

**Deprecated/outdated:**
- Using direct merchant miniapp reads/writes for backend-only collections is outdated for this phase because the repo security rules already define `orders`, `products`, `runtime_configs`, `balance_accounts`, and `balance_ledgers` as backend-only. [VERIFIED: apps/cloud-functions/config/security/database.rules.json]

## Assumptions Log

All recommendations in this research are grounded in the current repo, locked decisions, or official documentation. No factual claim is intentionally left as `[ASSUMED]`. [VERIFIED: this document]

## Open Questions

1. **How should manual payment settlement be represented without corrupting checkout payment semantics?**
   - What we know: Customer checkout only offers `wechat` and `balance`, but Phase 6 requires merchant-side manual “已支付/已处理” handling with method and reason audit. [VERIFIED: .planning/REQUIREMENTS.md][VERIFIED: .planning/phases/06-merchant-operations-and-runtime-config/06-CONTEXT.md][VERIFIED: packages/shared/src/types/order.ts]
   - What's unclear: Whether reports should keep the original customer-selected `paymentMethod` untouched and store merchant override data separately, or whether a new settlement enum should be first-class. [VERIFIED: packages/shared/src/types/order.ts]
   - Recommendation: Keep `paymentMethod` as the original checkout intent and add a dedicated `manualSettlement` / `merchantOverride` subrecord with method, note, operator, and timestamp. [VERIFIED: packages/shared/src/types/order.ts][VERIFIED: .planning/phases/06-merchant-operations-and-runtime-config/06-CONTEXT.md]

2. **Should category icon remain text-based in v1?**
   - What we know: The existing customer catalog model uses `iconText`, while the requirement only says “icon”. [VERIFIED: apps/customer-miniapp/src/types/catalog.ts][VERIFIED: req/需求文档.md]
   - What's unclear: Whether the merchant should upload image icons now or stay compatible with the current text/emoji-style customer category rail. [VERIFIED: apps/customer-miniapp/src/types/catalog.ts]
   - Recommendation: Keep category icon as short text/emoji token in Phase 6 unless the planner explicitly adds a customer-side icon asset migration task. [VERIFIED: apps/customer-miniapp/src/types/catalog.ts]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | TypeScript build, Vitest, scripts | ✓ | `v24.13.1` | — [VERIFIED: local command] |
| pnpm | Monorepo scripts | ✓ | `10.8.1` | npm workspaces would be a workaround, but repo is already pinned to pnpm. [VERIFIED: package.json][VERIFIED: local command] |
| npm | Package metadata / install | ✓ | `11.12.1` | — [VERIFIED: local command] |
| CloudBase CLI (`tcb`) | Manual deploy/debug of cloud functions and env resources | ✓ | `3.2.2` | Some actions can be done in DevTools/console, but CLI remains the best scripted path. [VERIFIED: local command] |
| WeChat DevTools | Merchant miniapp manual run and upload | ✓ | `2.01.2510290` | No real fallback for miniapp verification. [VERIFIED: local command] |

**Missing dependencies with no fallback:**
- None found. [VERIFIED: local command]

**Missing dependencies with fallback:**
- None found. [VERIFIED: local command]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest `3.1.2` in workspace packages; merchant-miniapp test harness missing. [VERIFIED: package.json][VERIFIED: apps/customer-miniapp/vitest.config.ts][VERIFIED: apps/cloud-functions/vitest.config.ts][VERIFIED: packages/shared/vitest.config.ts] |
| Config file | `apps/customer-miniapp/vitest.config.ts`, `apps/cloud-functions/vitest.config.ts`, `packages/shared/vitest.config.ts`; none yet for merchant miniapp. [VERIFIED: apps/customer-miniapp/vitest.config.ts][VERIFIED: apps/cloud-functions/vitest.config.ts][VERIFIED: packages/shared/vitest.config.ts][VERIFIED: apps/merchant-miniapp/package.json] |
| Quick run command | `pnpm --filter @xiaipet/cloud-functions test` [VERIFIED: apps/cloud-functions/package.json] |
| Full suite command | `pnpm test` [VERIFIED: package.json] |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MORD-01 | Merchant can query grouped order list and detail | integration | `pnpm --filter @xiaipet/cloud-functions test` | ❌ Wave 0 |
| MORD-02 | Merchant can advance fulfillment state with terminal locks and audit | integration | `pnpm --filter @xiaipet/cloud-functions test` | ❌ Wave 0 |
| MCAT-01 | Category CRUD enforces move-before-delete | unit + integration | `pnpm --filter @xiaipet/cloud-functions test` | ❌ Wave 0 |
| MPRD-01 | Product base info saves validate fields and assets | unit + integration | `pnpm --filter @xiaipet/shared test` | ❌ Wave 0 |
| MPRD-02 | Product pricing/spec rules validate combinations and overrides | unit + integration | `pnpm --filter @xiaipet/shared test` | ❌ Wave 0 |
| MUSR-01 | Merchant user search by masked phone/name | integration | `pnpm --filter @xiaipet/cloud-functions test` | ❌ Wave 0 |
| MUSR-02 | Balance adjustment writes both account and ledger safely | integration | `pnpm --filter @xiaipet/cloud-functions test` | ❌ Wave 0 |
| OPS-01 | Runtime config section saves/readbacks drive storefront data correctly | integration + view-model | `pnpm --filter @xiaipet/shared test` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm --filter @xiaipet/shared test` or `pnpm --filter @xiaipet/cloud-functions test`, whichever package changed. [VERIFIED: package.json]
- **Per wave merge:** `pnpm test` plus targeted merchant miniapp page tests once the merchant harness exists. [VERIFIED: package.json][VERIFIED: apps/merchant-miniapp/package.json]
- **Phase gate:** Full suite green plus manual merchant-miniapp verification in WeChat DevTools before `/gsd-verify-work`. [VERIFIED: AGENTS.md][VERIFIED: local command]

### Wave 0 Gaps
- [ ] `apps/merchant-miniapp/vitest.config.ts` — merchant page/view-model test harness does not exist yet. [VERIFIED: apps/merchant-miniapp/package.json]
- [ ] `apps/cloud-functions/src/queryMerchantOrders/index.test.ts` — covers MORD-01. [VERIFIED: apps/cloud-functions/vitest.config.ts]
- [ ] `apps/cloud-functions/src/updateMerchantOrderStatus/index.test.ts` — covers MORD-02. [VERIFIED: apps/cloud-functions/vitest.config.ts]
- [ ] `apps/cloud-functions/src/queryCategories/index.test.ts` and `upsertCategory/index.test.ts` — cover MCAT-01. [VERIFIED: apps/cloud-functions/vitest.config.ts]
- [ ] `apps/cloud-functions/src/queryProducts/index.test.ts` and `upsertProduct/index.test.ts` — cover MPRD-01/MPRD-02. [VERIFIED: apps/cloud-functions/vitest.config.ts]
- [ ] `apps/cloud-functions/src/searchMerchantUsers/index.test.ts` — covers MUSR-01. [VERIFIED: apps/cloud-functions/vitest.config.ts]
- [ ] `apps/cloud-functions/src/adjustUserBalance/index.test.ts` — covers MUSR-02. [VERIFIED: apps/cloud-functions/vitest.config.ts]
- [ ] `apps/cloud-functions/src/getRuntimeConfigSections/index.test.ts` and `upsertRuntimeConfigSection/index.test.ts` — cover OPS-01. [VERIFIED: apps/cloud-functions/vitest.config.ts]
- [ ] `packages/shared/src/schema/merchant-order.test.ts`, `product-admin.test.ts`, `runtime-config-section.test.ts` — schema/rule coverage for new shared contracts. [VERIFIED: packages/shared/vitest.config.ts]
- [ ] `apps/customer-miniapp/src/services/orders.test.ts` extension — verify customer-facing labels reflect new merchant fulfillment state. [VERIFIED: apps/customer-miniapp/src/services/orders.test.ts]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Reuse CloudBase auth context and merchant whitelist assertion before any merchant function logic. [VERIFIED: apps/cloud-functions/src/assertMerchantAccess/index.ts] |
| V3 Session Management | yes | Continue to rely on WeChat login + `wx.cloud.init({ traceUser: true })` session model rather than custom token storage. [CITED: https://docs.cloudbase.net/quick-start/mini-program/introduce][VERIFIED: apps/merchant-miniapp/app.ts] |
| V4 Access Control | yes | Backend-only collections plus explicit merchant cloud functions and `merchant_users` membership check. [VERIFIED: apps/cloud-functions/config/security/database.rules.json][VERIFIED: apps/cloud-functions/src/assertMerchantAccess/index.ts] |
| V5 Input Validation | yes | Add shared schema/type-guard validation for all merchant payloads before persistence. [VERIFIED: packages/shared/src/schema/user-record.ts][VERIFIED: packages/shared/src/schema/merchant-user.ts] |
| V6 Cryptography | no direct custom crypto | Do not hand-roll crypto; rely on WeChat Pay / CloudBase managed credentials and keep secrets out of repo and business collections. [VERIFIED: AGENTS.md] |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Forged merchant action from non-whitelisted account | Elevation of Privilege | Re-run whitelist assertion in every merchant cloud function, not only on app entry. [VERIFIED: apps/cloud-functions/src/assertMerchantAccess/index.ts] |
| Balance tampering via client payloads | Tampering | Server-owned transaction updates + append-only ledger + non-negative guard. [VERIFIED: apps/cloud-functions/src/shared/payment-store.ts][VERIFIED: .planning/phases/06-merchant-operations-and-runtime-config/06-CONTEXT.md] |
| Unauthorized broad reads under permissive security rules | Information Disclosure | Keep admin collections backend-only and avoid loosening rules for convenience. [VERIFIED: apps/cloud-functions/config/security/database.rules.json] |
| Lost updates on status/config edits | Tampering | Use partial updates, metadata, and backend transition validation; avoid whole-document blind overwrites. [CITED: https://docs.cloudbase.net/database/update] |
| Expired or leaked banner asset links | Information Disclosure | Persist `fileID`, generate temp URL only when needed, and keep storage permissions intentional. [CITED: https://docs.cloudbase.net/storage/upload-file][CITED: https://docs.cloudbase.net/storage/get-temp-url] |
| Missing query indexes on admin search/list surfaces | Denial of Service | Add compound indexes for merchant filters and search keys before shipping. [CITED: https://docs.cloudbase.net/database/data-index][VERIFIED: apps/cloud-functions/config/indexes/orders.index.json] |

## Sources

### Primary (HIGH confidence)
- `.planning/phases/06-merchant-operations-and-runtime-config/06-CONTEXT.md` - locked decisions, scope boundaries, canonical refs. [VERIFIED: local file]
- `.planning/REQUIREMENTS.md` - requirement IDs and acceptance text. [VERIFIED: local file]
- `.planning/STATE.md` - phase readiness and carry-forward risks. [VERIFIED: local file]
- `req/需求文档.md` - merchant-side business requirements and original UI/business language. [VERIFIED: local file]
- `packages/shared/src/types/order.ts` - current order contract gap: payment-only status model. [VERIFIED: local file]
- `apps/cloud-functions/src/shared/payment-store.ts` - existing transaction, ledger, and stock deduction patterns. [VERIFIED: local file]
- `apps/cloud-functions/config/security/database.rules.json` - backend-only collection boundary. [VERIFIED: local file]
- `https://docs.cloudbase.net/database/introduce` - document DB capabilities and model/data/index/transaction positioning. [CITED: https://docs.cloudbase.net/database/introduce]
- `https://docs.cloudbase.net/database/access/flexdb/transaction` - server-only transaction support, API set, limitations, and best practices. [CITED: https://docs.cloudbase.net/database/access/flexdb/transaction]
- `https://docs.cloudbase.net/database/configuration/permission/security-rules` - query subset rules and `doc()` caveats under security rules. [CITED: https://docs.cloudbase.net/database/configuration/permission/security-rules]
- `https://docs.cloudbase.net/database/update` - partial updates and atomic `inc` semantics. [CITED: https://docs.cloudbase.net/database/update]
- `https://docs.cloudbase.net/database/data-index` - index management and geo index pattern. [CITED: https://docs.cloudbase.net/database/data-index]
- `https://docs.cloudbase.net/storage/upload-file` - `uploadFile`, `fileID`, and storage permissions. [CITED: https://docs.cloudbase.net/storage/upload-file]
- `https://docs.cloudbase.net/storage/get-temp-url` - `getTempFileURL` and expiring temporary links. [CITED: https://docs.cloudbase.net/storage/get-temp-url]
- `https://docs.cloudbase.net/quick-start/mini-program/introduce` - `wx.cloud.init` and minimum base library guidance. [CITED: https://docs.cloudbase.net/quick-start/mini-program/introduce]
- `https://developers.weixin.qq.com/miniprogram/dev/api/location/wx.chooseLocation.html` - location picker requirements and return fields. [CITED: https://developers.weixin.qq.com/miniprogram/dev/api/location/wx.chooseLocation.html]
- `https://developers.weixin.qq.com/miniprogram/dev/api/location/wx.openLocation.html` - location preview parameters. [CITED: https://developers.weixin.qq.com/miniprogram/dev/api/location/wx.openLocation.html]

### Secondary (MEDIUM confidence)
- npm registry metadata for `miniprogram-api-typings`, `miniprogram-ci`, `dayjs`, and `vitest` version/publish dates. [VERIFIED: npm registry]
- Local environment probes for `node`, `pnpm`, `npm`, `tcb`, and WeChat DevTools installation/version. [VERIFIED: local command]

### Tertiary (LOW confidence)
- None. [VERIFIED: this document]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - platform choices are already locked by project constraints and reinforced by official docs. [VERIFIED: AGENTS.md][CITED: https://docs.cloudbase.net/quick-start/mini-program/introduce]
- Architecture: MEDIUM - the recommended section-doc config model and fulfillment split are prescriptive design choices inferred from the repo gap plus locked decisions, not official framework mandates. [VERIFIED: packages/shared/src/types/order.ts][VERIFIED: .planning/phases/06-merchant-operations-and-runtime-config/06-CONTEXT.md]
- Pitfalls: HIGH - risks are directly evidenced by current repo contracts and CloudBase behavior docs. [VERIFIED: packages/shared/src/types/order.ts][CITED: https://docs.cloudbase.net/database/configuration/permission/security-rules][CITED: https://docs.cloudbase.net/storage/get-temp-url]

**Research date:** 2026-04-17
**Valid until:** 2026-05-17 for repo-specific findings; re-check npm and CloudBase docs sooner if package or platform decisions change.
