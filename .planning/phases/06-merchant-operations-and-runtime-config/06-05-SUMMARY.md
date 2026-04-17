---
phase: 06-merchant-operations-and-runtime-config
plan: 05
subsystem: merchant-catalog-cloud-functions
tags: [cloud-functions, catalog, categories, products, cloudbase, security]
requires:
  - phase: 06-merchant-operations-and-runtime-config
    plan: 02
    provides: category/product shared contract and pricing helpers
provides:
  - merchant category query and guarded mutation handlers
  - merchant product query and save handlers
  - category/product collection and index config
affects: [merchant-miniapp, products, categories, cloud-functions, security-rules]
tech-stack:
  added: []
  patterns: [backend-owned catalog writes, category delete preflight, canonical image fileId persistence]
key-files:
  created:
    - apps/cloud-functions/src/queryCategories/index.ts
    - apps/cloud-functions/src/queryCategories/index.test.ts
    - apps/cloud-functions/src/upsertCategory/index.ts
    - apps/cloud-functions/src/upsertCategory/index.test.ts
    - apps/cloud-functions/src/queryProducts/index.ts
    - apps/cloud-functions/src/queryProducts/index.test.ts
    - apps/cloud-functions/src/upsertProduct/index.ts
    - apps/cloud-functions/src/upsertProduct/index.test.ts
    - apps/cloud-functions/config/collections/categories.json
    - apps/cloud-functions/config/indexes/categories.index.json
    - apps/cloud-functions/config/indexes/products.index.json
  modified:
    - apps/cloud-functions/config/collections/products.json
    - apps/cloud-functions/config/security/database.rules.json
    - .planning/phases/06-merchant-operations-and-runtime-config/06-05-SUMMARY.md
requirements-completed: [MCAT-01, MPRD-01, MPRD-02]
duration: 16min
completed: 2026-04-17
---

# Phase 6 Plan 05: Merchant Catalog Backend Summary

**Backend-owned category and product CRUD with icon-token persistence, canonical CloudBase image `fileId` storage, and guarded category deletion**

## Accomplishments

- Added merchant-only category query/save handlers that persist `name + iconToken` and block delete while linked products still exist.
- Added merchant-only product query/save handlers that normalize editor payloads into backend product records and validate pricing, purchase limits, detail content, and category linkage.
- Locked product image persistence to canonical CloudBase `imageFileId` values and rejected temp URL / local upload paths at the handler boundary.
- Added `categories` collection metadata, category/product indexes, and backend-only security rules for the new collection.

## Task Commits

1. **Task 1: Implement category handlers and storage config with explicit icon-token persistence**
   `00aaa85` (feat)
2. **Task 2: Implement product query/save handlers and backend product config**
   `00aaa85` (feat)

## Decisions Made

- Category delete protection lives in the backend handler through linked-product counting, not in page-local confirmation logic.
- Product save accepts the editor payload shape and performs normalization in the Cloud Function so Wave 3 pages can stay thinner.
- Product image replacement is modeled as “new `imageFileId` arrives from storage upload, backend save overwrites the persisted reference only if validation succeeds.”

## Deviations from Plan

None.

## Verification

- `pnpm --filter @xiaipet/cloud-functions test -- queryCategories upsertCategory`
- `pnpm --filter @xiaipet/cloud-functions test -- queryProducts upsertProduct`
- `rg -n "imageFileId|purchaseLimit|detailContent|categoryId|iconToken" apps/cloud-functions/src/upsertProduct/index.ts apps/cloud-functions/src/queryProducts/index.ts apps/cloud-functions/src/upsertCategory/index.ts apps/cloud-functions/src/queryCategories/index.ts`

## Self-Check: PASSED

- Found commit: `00aaa85`
- Merchant category/product tests passed with final handler behavior.
- Backend handlers, collection config, and security rules all encode backend-owned catalog writes and canonical `imageFileId` persistence.

---
*Phase: 06-merchant-operations-and-runtime-config*  
*Completed: 2026-04-17*
