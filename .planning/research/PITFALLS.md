# Pitfalls Research

**Domain:** 双端微信小程序电商 + CloudBase 交易后端
**Researched:** 2026-04-16
**Confidence:** HIGH

## Critical Pitfalls

### 1. Sensitive credentials stay in repo or client bundle

**Why it happens:**
- 需求文档已经携带 `appSecret` 和上传秘钥文件，greenfield 项目很容易直接沿用。

**Why it is dangerous:**
- 造成配置泄露、发布链路失控、支付/云资源风险扩大。

**Warning signs:**
- 仓库里出现 `.key`、支付证书、`appSecret` 明文
- 小程序前端代码读取服务端密钥

**Prevention strategy:**
- 第一阶段就建立本地受控配置与 CI Secret 方案
- 敏感变量只在发布脚本或云函数运行时注入

**Phase to address:**
- Phase 1

### 2. Frontend writes transactional data directly

**Why it happens:**
- CloudBase 小程序端调用数据库足够方便，容易把所有集合都开放成前端 CRUD。

**Why it is dangerous:**
- 订单金额、库存、余额和商户操作会失去可信边界。

**Warning signs:**
- 前端直接写 `orders`、`balance_ledger`、`products.stock`
- 商户端可绕过云函数改金额或余额

**Prevention strategy:**
- 只让前端直读公开或本人数据
- 所有敏感写操作统一收口到云函数
- 对关键集合使用安全规则或无权限默认策略

**Phase to address:**
- Phase 1, Phase 5, Phase 6

### 3. No order snapshot and inconsistent pricing logic

**Why it happens:**
- 规格配方、配送费、会员等级、余额抵扣都影响最终金额，但如果在多个页面各算一次，很容易漂移。

**Why it is dangerous:**
- 用户支付金额、商户后台金额、历史订单金额不一致。

**Warning signs:**
- 订单详情实时取商品现价
- 支付前后金额不一致
- 规格价格和配送费在多个模块重复实现

**Prevention strategy:**
- 在 `prepareCheckout` 和 `createOrder` 中生成统一订单快照
- 把金额计算封装成共享服务端规则模块

**Phase to address:**
- Phase 5

### 4. Missing indexes for catalog and merchant queries

**Why it happens:**
- 早期数据量小，容易忽视分类筛选、关键词搜索、订单列表、用户检索的索引设计。

**Why it is dangerous:**
- 首页和商品列表响应变慢，商户端订单/用户检索劣化最明显。

**Warning signs:**
- 商品列表需要全表扫描
- 商户搜索手机号或用户名明显卡顿
- 订单页分页越来越慢

**Prevention strategy:**
- 在建模阶段为分类、上下架状态、履约方式、关键词、订单状态、手机号建立索引策略
- 把索引检查放进 phase 验收项

**Phase to address:**
- Phase 1, Phase 2, Phase 6

### 5. Fulfillment rules are hard-coded into pages

**Why it happens:**
- 预约时间、配送费区间、店铺位置、定制提示和会员门槛看起来都像“前端展示字段”。

**Why it is dangerous:**
- 运营每改一条规则都要发版，业务敏捷性很差。

**Warning signs:**
- 页面中散落 10:00-21:00、配送费表、会员门槛常量
- 商户无法在后台调整提示语和店铺地址

**Prevention strategy:**
- 统一建立 `store_configs`、`delivery_fee_rules` 等配置集合
- 前端只读配置，校验逻辑放在共享模块/云函数

**Phase to address:**
- Phase 1, Phase 5, Phase 6

### 6. Merchant-side forms become unmaintainable

**Why it happens:**
- 商品管理字段多，若没有字段分组、类型定义和复用组件，表单会迅速失控。

**Why it is dangerous:**
- 商品配置错误率高，字段遗漏直接影响前台购买链路。

**Warning signs:**
- 同一字段在客户端、商户端和云函数命名不同
- 商品表单出现大量临时布尔开关和条件分支

**Prevention strategy:**
- 先定义统一商品 schema 和校验器
- 把商品表单拆为基础信息、履约、定价/规格、详情内容几个子模块

**Phase to address:**
- Phase 6

## Summary

该项目最容易失败的不是页面数量，而是交易可信边界和配置治理。一旦第一阶段没有把安全、模型、索引和配置边界做好，后面每个 phase 都会反复返工。

## Sources

- https://docs.cloudbase.net/database/data-permission
- https://docs.cloudbase.net/database/security-rules
- https://docs.cloudbase.net/database/introduce
- `req/需求文档.md`

---
*Pitfalls research completed: 2026-04-16*
