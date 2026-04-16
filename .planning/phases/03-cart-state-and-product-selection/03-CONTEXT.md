# Phase 3: Cart State and Product Selection - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

本 phase 只负责把客户端的购物车能力收口成一个可靠的状态中心：列表页、搜索页、详情页和购物车页对同一商品数量保持一致；规格商品可以通过快速购买/规格编辑进入购物车；库存上限、删除、清空、选中态、件数与金额汇总都在购物车链路内稳定工作。它不扩展到确认订单、地址、支付、订单快照或云端购物车持久化。

</domain>

<decisions>
## Implementation Decisions

### Execution sequencing
- **D-01:** 先推进 Phase 3；Phase 2 剩余 UI 调整继续保留在 `02-04` / `02-05` gap-fix plans 中，不作为购物车 phase 的前置阻塞。
- **D-02:** 只有当 Phase 2 的遗留问题会直接破坏购物车语义或跨页数量同步时，Phase 3 才顺手吸收相关修补；纯视觉 polish 仍归 Phase 2。

### Cart state ownership
- **D-03:** 当前 milestone 内购物车状态以 `apps/customer-miniapp/src/services/cart.ts` 为单一事实来源，不引入新的页面本地副本或云端购物车草稿。
- **D-04:** 购物车行项继续以 `productId + specId` 作为唯一键；无规格商品使用默认 spec key，规格商品必须保留规格维度。
- **D-05:** 库存上限校验在所有加购、增量和规格切换入口同步执行，并统一使用即时 `库存不足` 提示，而不是页面各自定义失败表现。

### Cross-page synchronization
- **D-06:** 列表页、搜索页、详情页和购物车页继续使用共享 cart service，并在页面 `onShow` / 变更回调时刷新展示态，确保返回上一页后数量和角标立即一致。
- **D-07:** Phase 3 不引入新的事件总线或远程订阅机制；当前客户端单端场景以内存态 + 页面重入刷新为主，先把一致性做稳。
- **D-08:** discovery 链路里的浮动购物车角标、详情页购物车按钮角标、购物车页件数与金额汇总都读取同一份 cart summary，而不是重复推导。

### Spec selection flow
- **D-09:** 规格商品沿用当前已存在的快速购买卡片交互，不改成“必须先跳详情页才能加购”的新约束。
- **D-10:** 商品详情页继续保留内联规格选择；加入购物车时以当前选中规格写入购物车，和列表快速购买卡片共用同一规格/价格语义。
- **D-11:** 购物车页中的规格编辑继续复用快速购买卡片风格或其轻量变体，更新规格时保留已有数量和选中态，而不是删除后让用户重加。

### Cart page boundary
- **D-12:** 购物车页在本 phase 内必须完整承担 `选择/全选`、数量增减、删除、清空、金额汇总与结算入口。
- **D-13:** “结算”在本 phase 中只要求成为稳定的 handoff 入口与数据边界，不提前吞并 Phase 5 的确认订单、地址、预约和支付逻辑。
- **D-14:** 空购物车态要明确引导回商品发现链路，但不在本 phase 新增额外营销模块或推荐流能力。

### the agent's Discretion
- 购物车 service 的内部拆分方式、派生 selector 和测试组织
- 购物车页步进器、规格编辑弹层和空态的具体视觉细节
- 结算入口在 Phase 5 页面未实现前的临时路由守卫或占位策略

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and acceptance
- `.planning/ROADMAP.md` — Phase 3 的目标、成功标准和三个计划项
- `.planning/REQUIREMENTS.md` — `CART-01` 到 `CART-04` 的验收约束
- `.planning/PROJECT.md` — 小程序闭环、CloudBase 边界和“少步骤完成下单”的核心价值
- `.planning/STATE.md` — 当前项目状态，以及 Phase 2 gap plans 仍然存在的事实
- `.planning/phases/02-catalog-and-product-discovery/02-CONTEXT.md` — 当前 discovery 链路的已锁定交互与视觉约束

### Product and design references
- `req/需求文档.md` — 购物列表、快速购买、购物车、商品详情与结算入口的原始描述
- `req/img/shoplist.png` — 列表页浮动购物车与 discovery 链路结构参考
- `req/img/商品卡片.png` — 商品卡片加购位置和信息密度参考
- `req/img/商品快速购买卡片.png` — 规格选择弹层参考
- `req/img/商品直接添加进购物车.png` — 无规格商品直接加购与步进器参考
- `req/img/购物车列表.png` — 购物车页布局、全选、金额与结算区参考
- `req/img/购物车限制.png` — 库存限制与数量控制参考
- `req/img/商品详情页.png` — 详情页购物车/加入购物车入口参考

### Existing code reality
- `apps/customer-miniapp/src/services/cart.ts` — 当前购物车单例状态、汇总与变更接口
- `apps/customer-miniapp/src/services/cart.test.ts` — 当前 cart service 的回归基线
- `apps/customer-miniapp/pages/catalog/index.ts` — 列表页直接加购、快速购买和角标同步入口
- `apps/customer-miniapp/pages/search/index.ts` — 搜索结果加购与数量同步入口
- `apps/customer-miniapp/pages/product-detail/index.ts` — 详情页规格选择、加入购物车和购物车角标入口
- `apps/customer-miniapp/pages/cart/index.ts` — 已提前落地的购物车页壳层和核心交互

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/customer-miniapp/src/services/cart.ts`：已经具备按 `productId::specId` 合并行项、数量汇总、选中态、清空和规格替换能力，是 Phase 3 的天然起点。
- `apps/customer-miniapp/src/services/cart.test.ts`：已经覆盖合并行项、库存上限、全选/删除、inline stepper 的部分规则，可继续扩展为 Phase 3 的回归测试主线。
- `apps/customer-miniapp/pages/cart/index.*`：购物车页、规格编辑弹层、全选与结算栏已存在壳层，适合正式收编而不是推倒重来。
- `apps/customer-miniapp/pages/catalog/index.ts` 与 `pages/search/index.ts`：已经接入直接加购、减量与购物车角标刷新，可继续统一为同一套 cart mutation 行为。
- `apps/customer-miniapp/pages/product-detail/index.ts`：已有内联规格选择、数量步进器和加入购物车入口，适合作为规格商品的第二加购入口。

### Established Patterns
- 当前客户端偏向“模块单例 service + 页面 `onShow` 刷新”的状态同步方式，而不是引入全局 store 框架。
- 库存超限统一以 `wx.showToast({ title: '库存不足' })` 反馈，属于已建立的购物链路语言。
- 规格商品与无规格商品的分流已经存在：无规格支持直接加购，规格商品通过快速购买或详情页规格选择进入购物车。
- 购物车相关逻辑已经在 Phase 2 被提前预埋，所以 Phase 3 更像收口和统一，而不是新建一个完全独立的 cart 子系统。

### Integration Points
- `pages/catalog/index` 需要把列表卡片和快速购买卡片的结果同步到共享购物车状态。
- `pages/search/index` 需要和列表页共享相同的步进器与角标规则。
- `pages/product-detail/index` 需要把当前选中规格、数量和购物车入口接入相同 cart service。
- `pages/cart/index` 需要消费 cart service 的汇总与行项，并向 Phase 5 的确认订单入口暴露稳定 handoff。

</code_context>

<specifics>
## Specific Ideas

- 当前方向不是先补完 Phase 2 所有 UI polish 再动购物车，而是先让购物车语义和跨页状态中心稳定下来。
- 已经存在的 `cart.ts` 和购物车页壳层要尽量复用，不要为了“更正统的状态管理”重写成另一套架构。
- 规格商品继续沿用现有快速购买卡片/详情页双入口，不人为提高用户操作成本。

</specifics>

<deferred>
## Deferred Ideas

- Phase 2 中关于原生导航、售罄视觉、详情页底栏和 discovery 卡片 UI 的剩余 polish，继续留在 `.planning/phases/02-catalog-and-product-discovery/02-04-PLAN.md` 与 `02-05-PLAN.md`
- 确认订单、地址回填、预约时间、配送费、支付与订单快照属于 Phase 5，不在本 phase 扩展
- 云端购物车持久化、多端同步或登录态恢复型购物车草稿不属于本 phase

</deferred>

---
*Phase: 03-cart-state-and-product-selection*
*Context gathered: 2026-04-16*
