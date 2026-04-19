---
status: partial
phase: 06-merchant-operations-and-runtime-config
source:
  - 06-01-SUMMARY.md
  - 06-02-SUMMARY.md
  - 06-03-SUMMARY.md
  - 06-04-SUMMARY.md
  - 06-05-SUMMARY.md
  - 06-06-SUMMARY.md
  - 06-07-SUMMARY.md
  - 06-08-SUMMARY.md
  - 06-09-SUMMARY.md
  - 06-10-SUMMARY.md
  - 06-11-SUMMARY.md
  - 06-12-SUMMARY.md
started: 2026-04-19T06:49:33Z
updated: 2026-04-19T06:54:15Z
---

## Current Test

[testing paused — 8 items outstanding]

## Tests

### 1. Cold Start Smoke Test
expected: 清掉现有运行态后，从微信开发者工具重新编译客户端/商户端与云函数配置。两个小程序都应能无初始化错误启动；商户端通过白名单后可以进入工作台，客户端首页与结算链路依赖的运行时配置也能正常加载，不出现空白或明显报错。
result: pending

### 2. Merchant Workspace Entry
expected: 打开商户端并通过 access gate 后，应直接进入 2x2 工作台。页面显示 `订单管理`、`品类/商品管理`、`用户管理`、`运营配置` 四张卡，其中品类/商品卡内可以分别进入 `品类管理` 与 `商品管理`，而不是进入一个 tab 壳页面。
result: pending

### 3. Merchant Order Management
expected: 进入订单管理后，可以按搜索和履约方式查看订单；打开订单详情时能看到履约主状态、支付副 badge、审计信息与时间线，以及底部 `更新订单状态` 操作。对未支付订单执行人工结算时，会要求填写原因，并在提交后看到状态推进和审计记录。
result: pending

### 4. Category Management
expected: 进入品类管理页后，每个品类都会展示名称、icon token 和关联商品数量；如果某个品类仍有关联商品，危险操作应显示 `先迁移商品`，而不是允许直接删除。
result: pending

### 5. Product Management and Editor
expected: 进入商品管理页后，可以按品类浏览并手动提交搜索；进入商品编辑页时，流程固定为 `基础信息 → 规格配方与价格 → 上架设置` 三步，能看到图片替换、规格/配方行、价格预览、限购与详情内容编辑，并在最后完成保存。
result: pending

### 6. User Search and Balance Adjustment
expected: 用户管理页只有手动提交搜索才会出现结果；结果卡展示会员等级和当前余额。进入用户详情后，底部抽屉支持 `增加余额`、`扣减余额`、`改为指定余额`，会显示调整后余额预览、要求填写原因/备注，并在二次确认后提交。
result: pending

### 7. Runtime Config Admin
expected: 运营配置页同时显示 `店铺信息`、`配送费规则`、`会员等级`、`首页 Banner`、`定制提示` 五个 section；每个 section 都有独立保存按钮和 `未保存` 状态。配送费规则展示固定说明行和说明弹层，而不是自由算法输入。
result: pending

### 8. Customer Runtime Config and Balance
expected: 客户端首页 Banner、结算页的店铺信息/配送说明/定制提示都读取商户保存的运行时配置；如果定制提示被关闭，也不会阻止下单。余额流水对商户调整应显示 customer-safe 文案（基于 `normalizedTitle + shortNote`），而不是暴露内部备注原文。
result: pending

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0
blocked: 0

## Gaps

- note: "User requested to defer functional/UAT verification until more chained features are completed, then run an integrated functionality + UI pass."
  deferred_at: 2026-04-19T06:54:15Z
