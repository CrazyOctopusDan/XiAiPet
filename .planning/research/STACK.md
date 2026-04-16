# Stack Research

**Domain:** 微信宠物烘焙双端小程序 + CloudBase 电商闭环
**Researched:** 2026-04-16
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| 原生微信小程序框架 | 当前稳定版基础库 | 实现客户端与商户端小程序 | 需求强绑定微信生态、地图、分享、手机号、支付和发布链路，原生方案兼容性与调试链路最直接 |
| 腾讯云开发 CloudBase | 当前官方环境能力 | 提供数据库、云函数、云存储、权限控制与环境管理 | CloudBase 官方文档明确支持小程序端 `wx.cloud.init`、数据库 SDK、云函数与多层权限控制，适合 greenfield 小程序后端 |
| CloudBase 文档型数据库 | 当前官方能力 | 承载商品、分类、用户、地址、宠物、订单、余额流水和配置数据 | 官方文档说明支持 JSON 文档、多文档事务、索引和数据模型，适配订单与配置并存的业务 |
| CloudBase 云函数 | 当前官方能力 | 托管支付下单、订单写入、库存扣减、余额调整、配送费计算等敏感逻辑 | 交易型写操作不应直接暴露给前端，云函数便于集中鉴权、审计和重试 |
| 微信开发者工具 + miniprogram-ci | 当前稳定版 | 本地调试、预览、上传与发布 | 需求文档已提供代码上传密钥，说明项目必须保留标准微信构建与发布链路 |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TypeScript | 5.x 当前稳定版 | 统一双端业务模型、接口和状态结构 | 从第一阶段就启用，降低订单/库存/余额等关键对象的字段漂移风险 |
| `miniprogram-api-typings` | 当前稳定版 | 为微信小程序 API 提供类型声明 | 适合所有调用 `wx.*` 与 `wx.cloud.*` 的页面和服务模块 |
| `dayjs` | 1.x 当前稳定版 | 处理预约日期、半小时粒度时间窗、历史记录分组 | 预约时间、余额流水按月汇总和订单时间展示都依赖稳定日期库 |
| 轻量内部设计系统组件层 | 项目内维护 | 封装卡片、弹层、数量步进器、规格选择器、状态标签等复用 UI | 需求图风格明确，直接依赖通用 UI 库会导致视觉和交互被通用组件绑架 |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| 微信开发者工具 | 双端调试与云开发集成 | 可以直接管理云开发环境、数据库和云函数 |
| ESLint + Prettier | 统一编码风格 | 双端和云函数共享规范，避免生成式开发导致风格漂移 |
| miniprogram-ci | 自动化上传代码包 | 结合受控密钥和环境变量做正式发布，不把密钥写死到仓库 |

## Installation

```bash
# Customer mini program
pnpm add dayjs miniprogram-api-typings typescript

# Merchant mini program
pnpm add dayjs miniprogram-api-typings typescript

# Shared tooling
pnpm add -D eslint prettier miniprogram-ci
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| 原生微信小程序 | Taro / uni-app | 只有在未来明确要复用到 H5/App，并接受微信能力接入与包体调优复杂度上升时才考虑 |
| CloudBase 文档数据库 + 云函数 | 自建 Node 服务 + 自管数据库 | 只有在后续出现跨平台开放 API、大量第三方系统集成或复杂 BI/ERP 同步时再考虑迁移 |
| 项目内轻量设计系统 | 大型通用小程序 UI 组件库 | 如果后续商户端页面数量爆发且视觉约束放宽，可以引入组件库加速后台表单搭建 |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| 在小程序前端直接写入订单、余额、库存等敏感集合 | 会绕过服务端鉴权与审计，造成金额和库存风险 | 用云函数处理敏感写操作 |
| 把 `appSecret`、上传秘钥、支付证书提交到业务仓库 | 需求文档已暴露这类敏感配置，继续扩散会放大泄露风险 | 用环境变量、CI Secret、本地受控文件 |
| H5 套壳思路驱动小程序架构 | 微信支付、手机号、地图、分享、发布能力都更适合原生接入 | 以原生小程序页面和组件组织前端 |

## Stack Patterns by Variant

**If customer and merchant mini programs share大量业务规则:**
- 抽取 shared TypeScript 模型、字段常量和校验器
- Because 双端都要读写同一套商品、订单、用户和配置数据，字段不一致会直接导致线上错误

**If merchant operations grow beyond小程序表单适配能力:**
- 保持 CloudBase 数据模型和云函数接口稳定，再补一个 Web 管理台
- Because 先保证后端能力抽象正确，比提前做三端更重要

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| 原生微信小程序基础库 | CloudBase 小程序能力 | 使用 `wx.cloud.init` 和数据库 SDK 时需跟随官方支持版本验证 |
| TypeScript 5.x | `miniprogram-api-typings` 当前稳定版 | 适合为 `wx` API 和自定义数据模型提供类型支持 |
| miniprogram-ci 当前稳定版 | 微信开发者工具上传链路 | 发布密钥应通过安全配置加载 |

## Sources

- https://docs.cloudbase.net/cms/usage/use-data — 验证小程序端 `wx.cloud.init`、数据库访问方式
- https://docs.cloudbase.net/database/introduce — 验证文档型数据库、事务、索引、数据模型能力
- https://docs.cloudbase.net/database/data-permission — 验证基础权限模型与 `_openid` 归属
- https://docs.cloudbase.net/database/security-rules — 验证文档级安全规则能力
- https://cloud.tencent.com/document/product/876/67083 — 验证 CloudBase Open API 与服务边界

---
*Stack research for: 微信宠物烘焙双端小程序 + CloudBase 电商闭环*
*Researched: 2026-04-16*
