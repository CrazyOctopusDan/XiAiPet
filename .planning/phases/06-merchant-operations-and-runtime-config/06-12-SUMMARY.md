---
phase: 06-merchant-operations-and-runtime-config
plan: 12
subsystem: merchant-workspace-and-registration
tags: [merchant-miniapp, workspace, routing, cloud-functions, deployment]
requires:
  - phase: 06-merchant-operations-and-runtime-config
    plan: 07
    provides: merchant order pages
  - phase: 06-merchant-operations-and-runtime-config
    plan: 08
    provides: merchant catalog pages
  - phase: 06-merchant-operations-and-runtime-config
    plan: 09
    provides: merchant user pages
  - phase: 06-merchant-operations-and-runtime-config
    plan: 10
    provides: merchant runtime-config page
provides:
  - merchant workspace service
  - merchant workspace page
  - route and cloud-function registration
affects: [merchant-miniapp, cloud-functions]
tech-stack:
  added: []
  patterns: [2x2 workspace cards, access-gate redirect, explicit deploy registry]
key-files:
  created:
    - apps/merchant-miniapp/src/services/workspace.ts
    - apps/merchant-miniapp/src/services/workspace.test.ts
    - apps/merchant-miniapp/pages/workspace/index.ts
    - apps/merchant-miniapp/pages/workspace/index.wxml
    - apps/merchant-miniapp/pages/workspace/index.wxss
    - apps/merchant-miniapp/pages/workspace/index.json
  modified:
    - apps/merchant-miniapp/app.json
    - apps/merchant-miniapp/pages/access-gate/index.ts
    - apps/cloud-functions/cloudfunctions.json
requirements-completed: [MORD-01, MCAT-01, MUSR-01, OPS-01]
duration: 18min
completed: 2026-04-18
---

# Phase 6 Plan 12: Merchant Workspace and Registration Summary

**Merchant Phase 06 modules are now reachable through a single workspace shell and deployable through the Cloud Functions registry**

## Accomplishments

- Added a small workspace service that defines the four locked management cards: `订单管理`、`品类/商品管理`、`用户管理`、`运营配置`.
- Built a 2x2 merchant workspace page with warm operational card styling and explicit card actions, preserving D-11 by keeping `品类管理` and `商品管理` as separate destinations instead of collapsing them into a tab shell.
- Updated the merchant access gate so a successful whitelist check immediately redirects into the workspace.
- Registered every Phase 06 merchant page in `apps/merchant-miniapp/app.json` and all new Phase 06 Cloud Functions in `apps/cloud-functions/cloudfunctions.json`, including the customer-safe `readRuntimeConfig` handler.

## Task Commits

Pending commit for this plan.

## Decisions Made

- Catalog management remains a single workspace card with two explicit actions, which keeps the workspace compact while still enforcing the category/product split.
- The access gate stays the sole privileged entry point; workspace is reachable only after the existing whitelist verification succeeds.
- Cloud Function registration mirrors the actual Phase 06 surface exactly instead of relying on implicit directory discovery.

## Deviations from Plan

- None. The workspace landed as a dedicated card shell, route registration is complete, and deployment metadata now includes all planned handlers.

## Verification

- `pnpm --filter @xiaipet/merchant-miniapp test -- workspace`
- `rg -n "订单管理|品类/商品管理|用户管理|运营配置" apps/merchant-miniapp/pages/workspace/index.wxml`
- Verified `apps/merchant-miniapp/pages/workspace` contains no `tab-bar|tabBar|固定tab|tabs` matches
- `rg -n "pages/workspace/index|pages/orders/index|pages/order-detail/index|pages/categories/index|pages/products/index|pages/product-editor/index|pages/users/index|pages/user-detail/index|pages/runtime-config/index" apps/merchant-miniapp/app.json`
- `rg -n "queryMerchantOrders|getMerchantOrderDetail|updateMerchantOrderStatus|queryCategories|upsertCategory|queryProducts|upsertProduct|searchMerchantUsers|adjustUserBalance|getRuntimeConfigSections|readRuntimeConfig|upsertRuntimeConfigSection" apps/cloud-functions/cloudfunctions.json`
- `pnpm --filter @xiaipet/merchant-miniapp build`

## Self-Check: PASSED

- Workspace tests cover the four locked cards, the category/product split, and clone-safe card data.
- Merchant miniapp TypeScript build passes with the new workspace page and generated runtime JS.
- Route registration, access-gate redirect, and Cloud Function registry now expose the full Phase 06 surface end to end.

---
*Phase: 06-merchant-operations-and-runtime-config*  
*Completed: 2026-04-18*
