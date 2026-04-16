# Phase 3: Cart State and Product Selection - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-16T15:00:01Z
**Phase:** 03-cart-state-and-product-selection
**Areas discussed:** 执行顺序、购物车状态归属、跨页面同步、规格选择流、购物车页边界

---

## 执行顺序

| Option | Description | Selected |
|--------|-------------|----------|
| 先进入 Phase 3 | 把剩余 Phase 2 UI polish 视为非阻塞项，先收口购物车语义和跨页状态 | ✓ |
| 先补完 Phase 2 | 所有 discovery UI gap 全部修完后再开始购物车 phase | |
| 交错推进 | 一边修 Phase 2 UI 一边随手做购物车，允许两个 phase 边界混在一起 | |

**User's choice:** 先进入 Phase 3
**Notes:** 用户明确表示 Phase 2 当前剩下的是 UI 调整，希望继续进行 Phase 3。

---

## 购物车状态归属

| Option | Description | Selected |
|--------|-------------|----------|
| 共享 cart service | 继续复用 `src/services/cart.ts` 作为单一事实来源，页面只消费和刷新 | ✓ |
| 页面本地状态 | 每个页面各自维护 cart 副本，再做同步 | |
| 云端草稿购物车 | 现在就引入远程购物车持久化与恢复 | |

**User's choice:** 共享 cart service
**Notes:** 当前代码已经有单例购物车服务和测试基线，Phase 3 更适合正式收编它，而不是重开一套新架构。

---

## 跨页面同步

| Option | Description | Selected |
|--------|-------------|----------|
| `onShow` + 共享汇总 | 页面返回时刷新同一份购物车 summary/count，保持列表、详情、购物车一致 | ✓ |
| 事件总线 | 额外引入广播机制，在页面间主动派发数量变化 | |
| 全局 store 框架 | 现在就切到更重的全局响应式状态管理 | |

**User's choice:** `onShow` + 共享汇总
**Notes:** 现有代码已经采用这个方向，且对当前单端小程序场景足够直接。

---

## 规格选择流

| Option | Description | Selected |
|--------|-------------|----------|
| 复用现有双入口 | 列表继续用快速购买卡片，详情页继续用内联规格选择，购物车页编辑规格也沿用同一语义 | ✓ |
| 强制跳详情 | 规格商品统一先跳详情页，再从详情页加入购物车 | |
| 新建专属规格系统 | 为购物车 phase 重新发明一套独立的规格选择弹层和状态模型 | |

**User's choice:** 复用现有双入口
**Notes:** 这样能最大程度承接 Phase 2 已经落地的加购入口，减少重复交互。

---

## 购物车页边界

| Option | Description | Selected |
|--------|-------------|----------|
| 完整购物车内边界 + 结算 handoff | 本 phase 完成选中、增减、删除、清空、金额汇总和结算入口，但不提前实现确认订单/支付 | ✓ |
| 直接做确认订单 | 把结算后的确认订单、地址和支付一起并入 Phase 3 | |
| 只做展示 | 暂时只做购物车展示，不开放结算入口 | |

**User's choice:** 完整购物车内边界 + 结算 handoff
**Notes:** 这和 ROADMAP 中的 `03-03` 边界一致，同时避免提前侵入 Phase 5。

## the agent's Discretion

- cart service 的内部拆分和 selector 设计
- 购物车页规格编辑弹层是否直接复用现有快速购买卡片结构
- Phase 5 页面未落地时，结算入口的临时保护策略

## Deferred Ideas

- Phase 2 的 discovery UI polish 继续留在 `02-04` / `02-05` plans
- 确认订单、支付、地址和预约逻辑仍归 Phase 5
- 远程购物车持久化和多端同步不纳入当前 phase
