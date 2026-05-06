# Phase 6: Merchant Operations and Runtime Config - Context

**Gathered:** 2026-04-17; updated 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

本 phase 只负责把商户端从“白名单入口”推进到可运营的工作台：商户可以查看并推进订单状态、打印订单小票、维护一级品类与商品销售规则、搜索用户并调整余额，以及在运行时修改店铺信息、配送费、会员等级门槛、Banner 和定制提示。它必须继续遵守前几个 phase 已锁定的 Cloud Functions 安全边界与 config-driven 业务规则，但不扩展到退款售后、多门店、营销活动引擎或更复杂的 Web 后台。除订单小票打印机外，第二个外部设备暂不纳入本 phase 实现，等设备类型和业务动作明确后再单独补充。

</domain>

<decisions>
## Implementation Decisions

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

### Receipt printing and external device integration
- **D-34:** 小票打印作为商户订单详情的履约动作接入，首版在订单详情页提供明确的 `打印小票` 操作，并允许在商户把订单推进到 `制作中` 时提示是否立即打印。
- **D-35:** 首版优先支持微信小程序可直接控制的蓝牙 BLE 热敏小票打印机，要求设备兼容 ESC/POS 指令；不把云打印平台、局域网 Wi-Fi 打印、USB 打印或厂商私有 SDK 作为默认实现。
- **D-36:** 打印内容必须基于后端订单快照生成，不允许页面层临时拼接金额、商品和履约数据；商户端只负责选择设备、发送打印数据和回写打印结果。
- **D-37:** 小票模板首版固定为经营履约小票：店铺名/联系电话、订单号、下单/支付时间、履约方式、预约时间、商品名称、规格/配方、数量、金额明细、宠物信息、收货/自取信息、用户电话、备注、支付方式、订单状态。
- **D-38:** 配送和快递小票可以展示完整履约地址与联系电话；自取小票只展示自取联系人/电话和预约时间，不输出无关地址字段。
- **D-39:** 打印任务需要审计：记录订单号、操作商户、打印时间、打印设备标识、打印模板版本、打印结果、失败原因和累计打印次数。
- **D-40:** 补打允许，但必须在小票上标记 `补打` 与第几次打印，避免后厨或配送重复处理订单。
- **D-41:** 蓝牙传输必须串行分包发送，不并发调用写入；每包按微信 BLE 建议控制在小尺寸数据块内，失败时保留明确重试入口。
- **D-42:** 商户端需要提供打印机设备管理入口：搜索蓝牙设备、连接、打印测试页、查看连接状态、断开/重连；设备绑定信息只能作为本机偏好保存，不作为订单可信状态来源。
- **D-43:** 小程序后台或手机锁屏时不保证自动打印，因此首版不做“客户端下单后商户端自动出纸”的硬承诺；订单到达提醒与自动打印可作为后续设备/通知能力增强。
- **D-44:** 如果后续确认采购的是云打印机或厂商平台设备，则应新增 `printerProvider` 适配层和服务端签名调用方案；这属于替换打印传输层，不改变订单快照、模板和审计模型。
- **D-45:** 用户提到的第二个外部设备当前只记录为待定需求；在设备类型、连接方式和触发业务动作未确认前，不在 Phase 6 中实现具体 UI、接口或数据模型。

### the agent's Discretion
- 商户端首页卡片的具体排布、插图和信息密度
- 订单列表分组下的筛选器、搜索框和默认排序细节
- 小票版式的视觉密度、分隔线样式和 58mm/80mm 宽度适配细节
- 蓝牙打印机搜索列表里的设备名称清洗、连接态文案和测试页内容
- 商品编辑步骤内每一步的字段编排、批量校验和空态文案
- 用户详情页的块状布局与余额调整弹层视觉
- `运营配置` 分区的内部命名、表单组件和保存成功反馈样式

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and carry-forward constraints
- `.planning/ROADMAP.md` — Phase 6 的目标、成功标准和 06-01 / 06-02 / 06-03 三段计划边界
- `.planning/PROJECT.md` — 商户端属于双端小程序闭环的一部分，且敏感写操作、运行时配置必须继续遵守项目级约束
- `.planning/REQUIREMENTS.md` — `MORD-01`、`MORD-02`、`MCAT-01`、`MPRD-01`、`MPRD-02`、`MUSR-01`、`MUSR-02`、`OPS-01` 的验收边界
- `.planning/STATE.md` — 当前 phase 切换状态，以及 Phase 5 已完成、Phase 6 是当前焦点的事实
- `.planning/phases/05-checkout-payment-and-orders/05-CONTEXT.md` — checkout、订单、余额支付和 runtime config 的既定边界，Phase 6 必须在其上补齐商户端治理能力

### Product and design references
- `req/需求文档.md` — 商户端订单管理、品类管理、铺品管理、用户管理与后台接口的原始业务说明
- `req/img/配送费提示.png` — 配送费说明弹层的目标交互和具体阶梯文案来源

### External device and WeChat platform references
- `https://developers.weixin.qq.com/miniprogram/dev/api/device/bluetooth/wx.openBluetoothAdapter.html` — 微信小程序蓝牙模块初始化、授权和错误边界
- `https://developers.weixin.qq.com/miniprogram/dev/api/device/bluetooth-ble/wx.writeBLECharacteristicValue.html` — 微信小程序 BLE 特征值写入、串行发送和小包传输限制
- `https://developers.weixin.qq.com/miniprogram/dev/reference/configuration/app.html` — 小程序全局配置入口，后续涉及蓝牙权限声明时必须核对

### Existing code and backend contracts
- `apps/merchant-miniapp/app.json` — 当前商户端页面注册入口，后续 merchant workspace 需要在此扩展
- `apps/merchant-miniapp/pages/access-gate/index.ts` — 现有商户端入口页壳层与权限校验触发点
- `apps/merchant-miniapp/src/services/access.ts` — 商户端白名单校验 service 边界
- `apps/cloud-functions/src/assertMerchantAccess/index.ts` — 当前商户身份校验云函数，是所有商户端管理能力的鉴权起点
- `packages/shared/src/types/order.ts` — 当前订单支付态与快照结构；Phase 6 需要在此基础上扩展商户履约态
- `packages/shared/src/types/user.ts` — `MerchantUserRecord` 与运行环境类型约束
- `apps/cloud-functions/src/shared/order-store.ts` — 订单持久化的现有读写边界
- `apps/cloud-functions/src/shared/payment-store.ts` — 余额扣减、库存扣减、账本落地与订单读取的现有交易实现
- `apps/cloud-functions/src/payOrder/index.ts` — 现有订单支付推进逻辑，说明订单状态与支付状态已经有后端入口
- `apps/cloud-functions/config/security/database.rules.json` — `orders`、`products`、`balance_*`、`runtime_configs` 仍是后端专属集合，商户端不能直接写
- `apps/cloud-functions/config/collections/products.json` — 当前商品集合壳层，Phase 6 的商品管理会直接落在此集合
- `apps/cloud-functions/config/collections/runtime_configs.json` — 当前运行时配置集合壳层，Phase 6 的运营配置会直接扩展它
- `apps/cloud-functions/config/collections/merchant_users.json` — 商户白名单集合定义

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/merchant-miniapp/pages/access-gate/index.*`：已经有商户端入口壳层和鉴权落点，可直接扩展为“鉴权后进入管理首页”的起点。
- `apps/merchant-miniapp/src/services/access.ts`：已经封装 `assertMerchantAccess` 调用，后续 merchant 页面可以统一复用这层鉴权边界。
- `packages/shared/src/types/order.ts`：已有订单、支付、履约快照的 shared 类型，是扩展商户履约状态机的自然位置。
- `packages/shared/src/types/order.ts` 也应承接小票模板输入类型、打印快照版本和 `printCount` / `lastPrintedAt` 等只读展示字段，避免商户端页面自己重组订单。
- `apps/cloud-functions/src/shared/payment-store.ts`：已经负责余额支付事务、账本落地和库存扣减，适合继续承接商户端余额调整与订单推进相关的敏感写操作。
- `apps/cloud-functions/src/shared/order-store.ts`：已建立订单读写 store 模式，商户订单管理相关云函数可以沿用。
- `apps/merchant-miniapp/src/theme/tokens.ts`：商户端已有基础主题 token，可作为后续管理页样式基线。
- 当前代码库没有现成蓝牙、BLE 或小票打印抽象，需要在商户端新增 `printer` service / page，并让订单详情页以 service 调用方式接入。

### Established Patterns
- 敏感交易写操作继续必须走 Cloud Functions，不能让商户端前端直接写 `orders`、`products`、`balance_accounts`、`balance_ledgers`、`runtime_configs`。
- 项目当前习惯用 shared 类型 + service 边界先稳定 contract，再让页面层消费，不把数据结构散落在页面里。
- 运行时业务规则已经在前几个 phase 锁定为 config-driven，因此配送费、会员阈值、定制提示和店铺位置都更适合通过统一 runtime config / cloud function contract 暴露。
- 打印小票属于商户端本机外设动作，设备连接和发送在小程序端完成；打印内容、打印审计和订单可信状态仍应由云函数和订单 store 负责。
- 商户端当前代码量很小，说明 Phase 6 的重点不是迁移旧后台，而是在已有鉴权起点上建立第一版运营工作台。

### Integration Points
- 商户端管理首页需要从 `pages/access-gate/index` 的权限放行结果继续路由进入。
- 订单管理会直接连接 `orders` 集合与现有订单/支付 store，并与客户端订单详情共享状态文案；订单详情页还需要连接打印机 service，调用后端生成/记录打印任务，再把 ESC/POS 数据发送到已连接设备。
- 商品和品类管理会落在 `products` 集合，并补齐规格/配方/价格的 shared schema 与写接口。
- 用户搜索与余额调整会连接 `users`、`balance_accounts`、`balance_ledgers`，并复用现有账本模式扩展“商户人工调整”原因。
- 运营配置会落在 `runtime_configs`，并反向影响客户端 checkout / catalog 已存在的店铺信息、配送费提示、会员门槛和定制提示展示。

</code_context>

<specifics>
## Specific Ideas

- 商户端不想做成传统固定 tab 后台，而更像一个轻量微信管理台：首页直接放管理卡片入口。
- 配送费规则不是纯抽象配置，用户明确要求参考 `req/img/配送费提示.png` 的说明弹层与具体阶梯文案。
- 客户端应直接展示和商户端一致的细分订单状态，不再另做一套面向用户的简化状态。
- 小票打印是商户处理订单时最重要的外设能力：商户查看订单后可以手动打印，推进到制作中时系统可以提示打印，但首版不承诺无人值守自动出纸。
- 小票打印机首版按蓝牙 BLE 热敏小票机设计，要求设备兼容 ESC/POS；若实际采购云打印设备，后续只替换传输层，保留订单快照、模板和审计模型。
- 余额调整不仅支持加减，还允许直接改到指定余额，但必须保留完整审计与二次确认。
- Banner 首版只做单张主 Banner，更复杂的多图运营能力不作为当前 phase 默认目标。

</specifics>

<deferred>
## Deferred Ideas

- 多图 Banner 排序、上下架和跳转配置增强版
- 多品类挂载商品
- 商户自定义余额调整原因类型
- 第二个外部设备的具体接入，等待明确设备类型、连接方式和触发业务动作
- 云打印平台、Wi-Fi/LAN 打印、自动接单即打印、厨房多联打印和配送联/客户联拆分
- 更复杂的退款、售后和多门店运营能力

</deferred>

---
*Phase: 06-merchant-operations-and-runtime-config*
*Context gathered: 2026-04-17*
