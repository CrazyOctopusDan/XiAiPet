# Phase 1: Foundation and Cloud Boundary - Research

**Researched:** 2026-04-16
**Domain:** WeChat mini program monorepo foundation with CloudBase backend boundaries
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- 项目采用 `apps/ + packages/` monorepo，而不是三个完全独立仓库。
- 目录结构固定为 `apps/customer-miniapp`、`apps/merchant-miniapp`、`apps/cloud-functions`、`packages/shared`。
- `packages/shared` 包含类型、常量、配置 schema，以及不依赖平台 API 的纯业务规则。
- `packages/shared` 不承载数据访问层，避免把小程序端和云函数端耦死。
- CloudBase 从第一天开始使用 `dev` / `prod` 两套环境。
- 日常开发、联调和测试只进入 `dev` 环境。
- `prod` 环境只允许手动发布，不做主分支自动直发。
- 商户端首版采用纯白名单入口。
- 只有预先配置过的商户身份才允许进入商户端。
- Phase 1 不实现角色管理界面，也不做完整 RBAC。
- 客户端用户首次登录时只创建最小用户主记录。
- 最小主记录至少覆盖身份标识、创建时间、状态等基础字段。
- `profile`、`pets`、`addresses`、`balance`、会员相关扩展数据按需懒创建，而不是首次登录时一次性建空壳数据。

### the agent's Discretion
- workspace 具体工具链与包管理细节
- CloudBase 环境变量命名与本地开发配置装配方式
- 最小用户主记录的具体字段命名与 shared schema 拆分方式
- 白名单配置是走单独集合还是 store config 子结构，只要满足安全与后续可扩展性

### Deferred Ideas (OUT OF SCOPE)
- 商户角色体系（如 `owner` / `staff`）
- 角色管理 UI / 完整 RBAC
- 自动化 `prod` 发布链路
</user_constraints>

<research_summary>
## Summary

本 phase 的标准做法不是先铺功能，而是先把仓库边界、环境隔离、权限模型和身份初始化链路做成后续 phase 可以稳定依赖的地基。基于 pnpm 官方 workspace 文档、TypeScript 官方 project references 文档，以及 CloudBase 官方数据库/权限/索引文档，最稳妥的方向是：用一个 workspace 管三类应用，shared 包只放纯领域资产，CloudBase 公开读集合和敏感写集合从第一天就分权，登录入口围绕 `wx.login` + 受控云函数初始化展开。

对 planner 最重要的结论有四个。第一，workspace 需要从第一阶段就形成一致的包边界和脚本约定，否则 Phase 2 开始会出现双端 schema 漂移。第二，CloudBase 集合应按“公开读、本人读写、只读配置、无前端权限”四类思路建模，订单/余额/库存/商户写操作必须走云函数。第三，商户端白名单比角色系统更适合当前阶段，但白名单载体要设计成可平滑升级到角色化。第四，用户首次引导只建立最小用户主记录，附属资料集合按使用时创建，能减少空壳数据和迁移成本。

**Primary recommendation:** 规划应拆成三张 plan：workspace/脚手架、CloudBase 数据与权限边界、身份引导与安全发布链路；每张 plan 都必须带可验证的产物和命令，而不是只停留在目录创建。
</research_summary>

<standard_stack>
## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pnpm workspaces | 10.x current | 管理 monorepo 的 app/package 边界和 workspace 依赖 | pnpm 官方内建 monorepo 支持，适合多包仓库与 shared lockfile |
| TypeScript | 5.x current | 为 shared schema、常量、纯业务规则与云函数输入输出提供类型契约 | project references 适合拆分多 package 代码库并加快构建/类型检查 |
| WeChat mini program native framework | current stable | 构建两个微信小程序应用 | Phase 1 需要锁定平台原生边界，后续直接接微信能力 |
| CloudBase document database + cloud functions | current official capability | 承载身份初始化、权限边界和敏感写操作入口 | CloudBase 官方支持基于 `_openid` 的归属判定、基础权限和安全规则 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `miniprogram-api-typings` | current | 给小程序 API 和 `wx.cloud` 提供类型 | customer/merchant miniapp 都应启用 |
| `zod` or equivalent schema lib | current stable | shared 包里表达配置 schema 与纯数据校验 | 适合把环境配置、用户主记录、白名单记录结构收敛成可验证契约 |
| Vitest | current stable | 为 shared 纯规则和 schema 校验提供快速自动化反馈 | Phase 1 Wave 0 即可接入，优先覆盖 shared 包 |
| ESLint + Prettier | current stable | 统一 workspace 内编码规范 | 在三类 app 刚起步时就统一最省返工 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pnpm workspaces | npm workspaces | npm 能做基础 workspace，但多包脚本与过滤能力弱一些 |
| TypeScript project references | 单 tsconfig + path alias | 起步简单，但随着 app/package 增长会更难控编译边界 |
| shared schema lib | 手写 interface + 手工校验 | 类型和运行时校验会分离，后续最容易漂移 |

**Installation:**
```bash
pnpm add -D typescript eslint prettier vitest
pnpm add -D miniprogram-api-typings
pnpm add zod
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```text
apps/
├── customer-miniapp/      # 客户端小程序工程
├── merchant-miniapp/      # 商户端小程序工程
└── cloud-functions/       # 云函数入口与按功能拆分的函数目录
packages/
└── shared/                # 类型、常量、schema、纯业务规则
```

### Pattern 1: Pure-domain shared package
**What:** `packages/shared` 只导出 type/schema/constants/pure rules，不直接依赖 `wx`、CloudBase SDK 或文件系统。
**When to use:** 当双端和云函数需要复用同一份商品/用户/配置结构和纯业务判断时。
**Example:** shared 里定义 `UserCore`, `MerchantWhitelistEntry`, `EnvironmentKey`, `canPurchaseByMemberLevel()` 这类纯资产。

### Pattern 2: Sensitive writes through cloud functions only
**What:** 小程序前端可直读公开集合和本人数据集合，但涉及商户白名单判定、用户初始化、库存/余额/订单等敏感写入统一经云函数。
**When to use:** 任何需要越过“本人读写”边界、或需要服务端校验的动作。
**Example:** `bootstrapUser` 云函数负责用 `wx.login` 建立最小用户主记录；`assertMerchantAccess` 云函数或受控查询负责商户端白名单入口。

### Pattern 3: Configured environments from day one
**What:** `dev` 和 `prod` 环境的环境 ID、集合前缀、发布目标与脚本一开始就分离。
**When to use:** 需要保护真实数据、不让联调和正式运营混在一起时。
**Example:** 本地默认只连接 `dev`，发布脚本显式要求传入 `prod` 目标，不提供“默认直接 prod”。

### Anti-Patterns to Avoid
- **把 CloudBase 集合权限全开给前端：** 会导致白名单、用户主记录甚至后续交易数据缺少可信边界。
- **在 shared 包里封装 CloudBase SDK 访问：** 会把 app 和云函数环境耦合，破坏“纯业务规则”边界。
- **Phase 1 就把角色系统、支付环境、订单集合一起建全：** 超出当前 scope，会拖慢基础盘落地。
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Monorepo linking | 手写软链或复制 shared 代码 | pnpm workspace + workspace protocol | 官方已经支持 workspace 依赖解析和 shared lockfile |
| Data validation | 只靠 TypeScript interface | schema library + TS types | interface 不能做运行时校验，云函数入口和配置解析会缺保护 |
| CloudBase permissions | 全靠前端逻辑判断 owner/admin | 基础权限 + 安全规则 + 云函数边界 | 官方权限体系已经覆盖公开读/本人读写/无权限等基本场景 |
| Merchant gating | 在前端本地写死管理员 openid | 受控白名单集合或配置 + 云函数校验 | 本地硬编码不利于维护，也容易泄露和难以升级 |

**Key insight:** Phase 1 最大风险不是“工具不够多”，而是把已有平台机制绕开，自己造一层不可信的边界。
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Shared package becomes accidental framework layer
**What goes wrong:** shared 包一开始只放类型，随后逐步混入 `wx` API、CloudBase SDK、环境变量读取和页面工具，最终变成谁都能依赖、谁都不敢改的耦合层。
**Why it happens:** 早期图快，把“能复用”的代码都往 shared 塞。
**How to avoid:** 从第一阶段就写明 shared 的允许内容和禁止内容；planner 要把边界写进目录约定和 lint/typecheck 路径里。
**Warning signs:** shared 引入 `wx`, `cloudbase`, `fs`, `process.env`；app 和云函数都开始依赖 shared 的 IO 封装。

### Pitfall 2: CloudBase collection permissions mismatch real business sensitivity
**What goes wrong:** 明明是敏感集合，却给了“读取和修改本人数据”或更宽权限；或者公开商品集合又做成完全无权限，导致后续必须绕云函数读全部数据。
**Why it happens:** 初期只按字段内容建表，不按读写风险分类。
**How to avoid:** planner 按四类集合分组：公开读、本人数据、只读配置、无前端权限。
**Warning signs:** `merchant_users`、`users`、未来的 `orders`、`balance_ledger` 这类集合权限说明不清晰。

### Pitfall 3: User bootstrap over-eagerly creates empty records everywhere
**What goes wrong:** 一次登录就把 profile、pets、addresses、balance 和会员快照全建空文档，后面迁移和数据治理成本变高。
**Why it happens:** 想让后续读取逻辑简单。
**How to avoid:** 只建最小主记录，附属数据延迟到首次真实写入时创建。
**Warning signs:** 一次登录事务里出现大量“空数组/空对象/默认 0 值”初始化文档。

### Pitfall 4: Sensitive files in req/ leak into runtime repo conventions
**What goes wrong:** `appSecret`、上传密钥和其他受控文件被复制进 app 目录、脚本、README 或提交历史。
**Why it happens:** Phase 1 需要发布链路，团队容易顺手把密钥路径直接写进仓库脚本。
**How to avoid:** planner 明确把密钥迁移/忽略策略纳入任务；发布脚本只读环境变量或受控本地路径。
**Warning signs:** 仓库新增 `.key`、`.pem`、`secret` 明文，或 README 里出现真实凭据。
</common_pitfalls>

<code_examples>
## Code Examples

Verified patterns from official sources:

### Mini program login bootstrap
```typescript
// Source: https://developers.weixin.qq.com/miniprogram/dev/api/open-api/login/wx.login.html
wx.login({
  success(res) {
    const code = res.code
    // send code to cloud function / backend bootstrap endpoint
  }
})
```

### CloudBase client-side read of public collection
```typescript
// Source: https://docs.cloudbase.net/cms/usage/use-data
const db = wx.cloud.database()
db.collection('goods').where({}).get()
```

### CloudBase document-level rule idea
```javascript
// Source: https://docs.cloudbase.net/database/security-rules
{
  read: true,
  write: 'doc.owner == auth.openid'
}
```
</code_examples>

## Validation Architecture

Planner should assume Phase 1 needs Wave 0 verification scaffolding before meaningful execution verification exists.

- Validate workspace health with `pnpm install`, `pnpm -r lint`, and `pnpm -r typecheck` once scripts exist.
- Validate `packages/shared` with fast unit tests for schema parsing and pure business rules.
- Validate CloudBase boundary design structurally in Phase 1 using file existence, config presence, rule file presence, and command-level smoke checks before any live business tests.
- Treat secret-handling checks as blocking verification items: no real secrets committed into `apps/` or `.planning/` artifacts.
- Require every Phase 1 plan to define grep-verifiable acceptance criteria for workspace files, schema files, env templates, and bootstrap/cloud-function entrypoints.

<sota_updates>
## State of the Art (2024-2025)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 单仓库中靠 path alias 共享所有逻辑 | workspace + package boundary + explicit shared protocol | current mainstream monorepo practice | 更适合多 app/多 package 的依赖治理 |
| 只靠 TypeScript interface 描述数据 | schema + type 双层约束 | recent mainstream TS ecosystem direction | 运行时边界更稳，尤其适合云函数入参和配置 |
| 先单环境开发，后补正式环境 | 初期即分离 dev/prod | current cloud app operational baseline | 降低正式数据污染和发布误操作 |

**New tools/patterns to consider:**
- pnpm workspace protocol (`workspace:`): 让 shared 依赖在本地明确绑定工作区包，减少解析歧义。
- TypeScript project references: 当 app/package 增长时，能帮助维持编译边界和更快的增量检查。

**Deprecated/outdated:**
- 直接在前端写管理员/商户 openid 常量: 不适合作为长期商户入口方案。
- 以“所有集合默认前端可写”为前提再逐步收紧: 在 CloudBase 场景里风险过高。
</sota_updates>

<open_questions>
## Open Questions (RESOLVED)

1. **白名单数据载体落在哪里最顺手** — RESOLVED
   - Resolution: Phase 1 采用独立 `merchant_users` 集合承载商户白名单，而不是挂在 `store_configs` 子结构下。
   - Why: 这样更利于后续补充角色字段、启停状态、审计字段和权限升级，不会把配置文档与身份列表混在一起。

2. **Cloud functions 工程组织粒度** — RESOLVED
   - Resolution: Phase 1 至少拆成 `bootstrapUser` 与 `assertMerchantAccess` 两个显式函数入口；若需要环境守卫，可增加独立公共工具模块，但不做“万能函数”。
   - Why: 这样能把客户端身份初始化和商户白名单校验明确解耦，便于后续扩展支付、订单、配置等敏感写操作边界。
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- https://pnpm.io/workspaces — workspace organization and local package protocol
- https://www.typescriptlang.org/docs/handbook/project-references.html — project references for multi-package TS repos
- https://developers.weixin.qq.com/miniprogram/dev/api/open-api/login/wx.login.html — mini program login entrypoint
- https://docs.cloudbase.net/cms/usage/use-data — mini program side data access with `wx.cloud.database()`
- https://docs.cloudbase.net/database/data-permission — CloudBase basic permission modes and `_openid` ownership model
- https://docs.cloudbase.net/database/security-rules — document-level rules for fine-grained data control
- https://docs.cloudbase.net/en/database/data-index — index guidance and performance constraints

### Secondary (MEDIUM confidence)
- /Users/zhangyi/zhangyi/homework/xiaipet/.planning/research/STACK.md — project-level stack recommendation already aligned with official docs
- /Users/zhangyi/zhangyi/homework/xiaipet/.planning/research/ARCHITECTURE.md — project-level architecture boundaries

### Tertiary (LOW confidence - needs validation)
- None
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: WeChat mini program native apps + CloudBase + monorepo workspace
- Ecosystem: pnpm, TypeScript, CloudBase database/functions/permissions
- Patterns: shared pure-domain package, cloud-function sensitive boundary, lazy bootstrap
- Pitfalls: secret leakage, permission mismatch, shared boundary drift

**Confidence breakdown:**
- Standard stack: HIGH - based on official docs and direct platform fit
- Architecture: HIGH - directly constrained by locked context decisions
- Pitfalls: HIGH - aligned with official permission/index docs and project risk profile
- Code examples: HIGH - sourced from official docs

**Research date:** 2026-04-16
**Valid until:** 2026-05-16
</metadata>

---
*Phase: 01-foundation-and-cloud-boundary*
*Research completed: 2026-04-16*
*Ready for planning: yes*
