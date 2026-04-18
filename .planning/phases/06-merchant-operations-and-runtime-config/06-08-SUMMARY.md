---
phase: 06-merchant-operations-and-runtime-config
plan: 08
subsystem: merchant-catalog-ui
tags: [merchant-miniapp, catalog, categories, products, editor, upload]
requires:
  - phase: 06-merchant-operations-and-runtime-config
    plan: 02
    provides: catalog admin contracts and pricing rules
  - phase: 06-merchant-operations-and-runtime-config
    plan: 05
    provides: category and product cloud functions
provides:
  - merchant catalog admin service layer
  - category management page
  - product list page
  - three-step product editor page
affects: [merchant-miniapp]
tech-stack:
  added: []
  patterns: [category-first product browsing, service-owned image upload, local three-step draft editor]
key-files:
  created:
    - apps/merchant-miniapp/src/services/catalog-admin.ts
    - apps/merchant-miniapp/src/services/catalog-admin.test.ts
    - apps/merchant-miniapp/pages/categories/index.ts
    - apps/merchant-miniapp/pages/categories/index.wxml
    - apps/merchant-miniapp/pages/categories/index.wxss
    - apps/merchant-miniapp/pages/categories/index.json
    - apps/merchant-miniapp/pages/products/index.ts
    - apps/merchant-miniapp/pages/products/index.wxml
    - apps/merchant-miniapp/pages/products/index.wxss
    - apps/merchant-miniapp/pages/products/index.json
    - apps/merchant-miniapp/pages/product-editor/index.ts
    - apps/merchant-miniapp/pages/product-editor/index.wxml
    - apps/merchant-miniapp/pages/product-editor/index.wxss
    - apps/merchant-miniapp/pages/product-editor/index.json
  modified:
    - .planning/phases/06-merchant-operations-and-runtime-config/06-08-SUMMARY.md
requirements-completed: [MCAT-01, MPRD-01, MPRD-02]
duration: 32min
completed: 2026-04-18
---

# Phase 6 Plan 08: Merchant Catalog UI Summary

**Separate category/product management surfaces with category-first browsing and a three-step product editor**

## Accomplishments

- Added a merchant catalog service layer that wraps category/product Cloud Functions, builds category/product/editor view models, computes combination price previews, and uploads product images to CloudBase storage before saving `imageFileId`.
- Built a dedicated category management page that always shows both category name and icon token, exposes linked-product counts, and switches the destructive affordance from `删除品类` to `先迁移商品` when the backend guard blocks deletion.
- Built a separate product list page with category-first browsing and explicit search, keeping category and product management on separate surfaces rather than collapsing them into a fixed tab shell.
- Built a three-step product editor page with the locked step sequence `基础信息 → 规格配方与价格 → 上架设置`, including image upload/replace UI, independent spec/formula line items, price preview rows, purchase-limit controls, and detail-content editing.

## Task Commits

Pending commit for this plan.

## Decisions Made

- The editor keeps a local draft across all three steps and only persists to `upsertProduct` on the final step; intermediate CTAs validate and advance the step flow without inventing partial-save backend endpoints.
- Price preview rows are generated in the service layer from shared pricing rules so the editor page does not reimplement combination-price math.
- Product image handling stores the returned CloudBase storage `fileID` as both the canonical `imageFileId` and the current preview source, keeping the UI aligned with MPRD-01.

## Deviations from Plan

- The product editor currently supports direct editing of spec/formula rows and display-only override markers, but does not yet expose a dedicated UI for adding sparse manual override rows. The override state is still fully supported by the service and save contract.
- Step transitions are local draft saves rather than backend partial saves. This preserves the required step UX while staying within the existing Cloud Function surface.

## Verification

- `pnpm --filter @xiaipet/merchant-miniapp test -- catalog-admin`
- `rg -n "icon|删除品类|先迁移商品" apps/merchant-miniapp/pages/categories/index.wxml apps/merchant-miniapp/pages/categories/index.ts`
- `test -f apps/merchant-miniapp/pages/categories/index.ts && test -f apps/merchant-miniapp/pages/products/index.ts && ! rg -n "tab-bar|tabBar|固定tab|tabs" apps/merchant-miniapp/pages/categories apps/merchant-miniapp/pages/products apps/merchant-miniapp/pages/product-editor`
- `rg -n "基础信息|规格配方与价格|上架设置|限购|详情内容|保存基础信息并继续|保存规格配方并继续|保存商品|替换图片|imageFileId|uploadFile" apps/merchant-miniapp/pages/product-editor/index.wxml apps/merchant-miniapp/pages/product-editor/index.ts apps/merchant-miniapp/src/services/catalog-admin.ts`
- `pnpm --filter @xiaipet/merchant-miniapp build`

## Self-Check: PASSED

- Catalog admin service tests cover category delete-guard copy, editor step modeling, combination-price preview, image upload, and product save wiring.
- Merchant miniapp TypeScript build passes with the new category/product/product-editor pages and generated runtime JS.
- The UI preserves D-11 by keeping category and product management as separate destinations, and the editor preserves the D-14 step sequence with explicit image/purchase-limit/detail-content handling.

---
*Phase: 06-merchant-operations-and-runtime-config*  
*Completed: 2026-04-18*
