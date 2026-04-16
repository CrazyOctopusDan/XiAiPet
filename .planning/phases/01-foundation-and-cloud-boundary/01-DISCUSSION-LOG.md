# Phase 1: Foundation and Cloud Boundary - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-16
**Phase:** 01-Foundation and Cloud Boundary
**Areas discussed:** 项目结构, CloudBase 环境策略, 商户端权限入口, 用户初始化深度

---

## 项目结构

| Option | Description | Selected |
|--------|-------------|----------|
| Monorepo + shared domain | 双端和云函数共处一个仓库，共享领域模型和规则 | ✓ |
| 三套完全独立项目 | 隔离更强，但字段和规则容易重复 | |
| 前后端分开，共享靠手工同步 | 表面独立，长期维护最容易漂移 | |

**User's choice:** 采用 `Monorepo + shared domain`
**Notes:** 用户进一步锁定目录重组为 `apps/ + packages/`，并要求 `packages/shared` 包含类型、常量、配置 schema 以及纯业务规则，但不放数据访问层。

---

## CloudBase 环境策略

| Option | Description | Selected |
|--------|-------------|----------|
| 单环境 | 上手快，但测试与正式数据混杂 | |
| `dev` / `prod` 双环境 | 成本可控，足以隔离开发和正式数据 | ✓ |
| `dev` / `staging` / `prod` 三环境 | 更完整，但对当前阶段偏重 | |

**User's choice:** 使用 `dev` / `prod` 两套环境
**Notes:** `prod` 环境只允许手动发布，不接受主分支自动直发。

---

## 商户端权限入口

| Option | Description | Selected |
|--------|-------------|----------|
| 纯白名单 | 首版仅允许预配置身份进入商户端，风险最低 | ✓ |
| 白名单 + 简单角色 | 在白名单基础上增加 `owner/staff` 等角色控制 | |
| 完整 RBAC | 从一开始就做权限点和管理 UI | |

**User's choice:** 首版采用纯白名单
**Notes:** 先把商户端入口安全地关住，不在 Phase 1 引入角色系统 UI。

---

## 用户初始化深度

| Option | Description | Selected |
|--------|-------------|----------|
| 最小初始化 | 首次登录只建用户主记录，其他资料按需创建 | ✓ |
| 中等初始化 | 首次登录建主记录 + 空 profile + 默认会员/余额字段 | |
| 完整初始化 | 首次登录把所有资料容器都建好 | |

**User's choice:** 最小初始化
**Notes:** `profile`、`pets`、`addresses`、`balance`、会员扩展数据都按需懒创建，避免无意义空壳数据。

---

## the agent's Discretion

- workspace 工具链与包管理细节
- CloudBase 环境变量命名和装配方式
- 最小用户主记录字段命名
- 白名单集合或配置载体的具体实现

## Deferred Ideas

- 商户简单角色体系
- 角色管理 UI / 完整 RBAC
- 自动化 `prod` 发布链路
