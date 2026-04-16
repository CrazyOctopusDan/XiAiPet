# Phase 1: Foundation and Cloud Boundary - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

本 phase 只负责搭建双端微信小程序基础骨架、CloudBase 环境边界与用户身份入口，并把后续 phase 会持续依赖的仓库结构、环境隔离、商户端安全入口和用户初始化策略定清楚。它不包含商品、购物车、订单、支付或商户管理功能实现。

</domain>

<decisions>
## Implementation Decisions

### Repo structure
- **D-01:** 项目采用 `apps/ + packages/` monorepo，而不是三个完全独立仓库。
- **D-02:** 目录结构固定为 `apps/customer-miniapp`、`apps/merchant-miniapp`、`apps/cloud-functions`、`packages/shared`。
- **D-03:** `packages/shared` 包含类型、常量、配置 schema，以及不依赖平台 API 的纯业务规则。
- **D-04:** `packages/shared` 不承载数据访问层，避免把小程序端和云函数端耦死。

### CloudBase environment strategy
- **D-05:** CloudBase 从第一天开始使用 `dev` / `prod` 两套环境。
- **D-06:** 日常开发、联调和测试只进入 `dev` 环境。
- **D-07:** `prod` 环境只允许手动发布，不做主分支自动直发。

### Merchant access control
- **D-08:** 商户端首版采用纯白名单入口。
- **D-09:** 只有预先配置过的商户身份才允许进入商户端。
- **D-10:** Phase 1 不实现角色管理界面，也不做完整 RBAC。

### Customer bootstrap depth
- **D-11:** 客户端用户首次登录时只创建最小用户主记录。
- **D-12:** 最小主记录至少覆盖身份标识、创建时间、状态等基础字段。
- **D-13:** `profile`、`pets`、`addresses`、`balance`、会员相关扩展数据按需懒创建，而不是首次登录时一次性建空壳数据。

### the agent's Discretion
- workspace 具体工具链与包管理细节
- CloudBase 环境变量命名与本地开发配置装配方式
- 最小用户主记录的具体字段命名与 shared schema 拆分方式
- 白名单配置是走单独集合还是 store config 子结构，只要满足安全与后续可扩展性

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and project constraints
- `.planning/ROADMAP.md` — Phase 1 的目标、成功标准和计划边界定义
- `.planning/PROJECT.md` — 项目核心价值、敏感配置治理要求、平台约束与关键决策
- `.planning/REQUIREMENTS.md` — `AUTH-01`、`AUTH-02` 以及全局约束，确保基础身份入口与后续需求兼容
- `.planning/STATE.md` — 当前项目状态与已知关注点

### Research and technical direction
- `.planning/research/SUMMARY.md` — 对双端小程序 + CloudBase 路线的综合结论与 phase 排序依据
- `.planning/research/STACK.md` — 推荐技术栈、环境策略、发布链路和 shared package 方向
- `.planning/research/ARCHITECTURE.md` — 双端、数据库、云函数、共享模型的系统边界
- `.planning/research/PITFALLS.md` — Phase 1 必须提前规避的密钥泄露、敏感写操作暴露、索引与配置硬编码风险
- `.planning/research/FEATURES.md` — 用于确认当前 phase 只做基础边界，不提前侵入后续交易功能

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- 当前仓库没有现成业务代码、组件或工具函数可复用；Phase 1 需要从零建立基础工程骨架。

### Established Patterns
- 当前唯一已锁定的工程模式是 monorepo + `apps/` / `packages/` 分层。
- shared 层只允许放类型、常量、schema 和纯业务规则，不把数据访问耦合进去。
- 运行环境必须从一开始就区分 `dev` / `prod`，不能先用单环境凑合。

### Integration Points
- `apps/customer-miniapp` 会承接客户端微信登录态与用户主记录初始化。
- `apps/merchant-miniapp` 会承接商户白名单入口与后续商户端页面壳层。
- `apps/cloud-functions` 会承接敏感写操作、身份判定和环境边界逻辑。
- `packages/shared` 会为双端与云函数提供统一类型、配置 schema 和纯规则函数。

</code_context>

<specifics>
## Specific Ideas

- 仓库要从一开始就长成真正可持续扩展的 monorepo，而不是先散着放，后面再迁移。
- `prod` 只允许手动发布，避免在项目早期把正式环境暴露给过于宽松的发布流程。
- 用户初始化要保持克制，先建最小主记录，其他资料集合按首次使用再建。

</specifics>

<deferred>
## Deferred Ideas

- 商户角色体系（如 `owner` / `staff`）— 留到后续需要时再加，不属于 Phase 1
- 角色管理 UI / 完整 RBAC — 明确不在本 phase 处理
- 自动化 `prod` 发布链路 — 当前不做，后续如果 CI 稳定再讨论

</deferred>

---
*Phase: 01-foundation-and-cloud-boundary*
*Context gathered: 2026-04-16*
