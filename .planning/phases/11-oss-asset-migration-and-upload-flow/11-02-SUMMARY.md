---
phase: 11-oss-asset-migration-and-upload-flow
plan: 11-02
status: completed
completed: 2026-05-11
commit: 24de8f0
---

# Plan 11-02 Summary

Added merchant asset upload APIs and miniapp upload integration. Merchant clients now request a short-lived OSS POST policy, upload with `wx.uploadFile`, confirm the upload, and persist `imageAsset` plus `oss://` storage IDs for product cover images.

Verification passed:
- `pnpm --filter @xiaipet/api test -- src/routes/merchant-assets.routes.test.ts src/modules/assets/service.test.ts`
- `pnpm --filter @xiaipet/merchant-miniapp test -- src/services/assets.test.ts src/services/catalog-admin.test.ts`
- `pnpm --filter @xiaipet/api typecheck`
- `pnpm --filter @xiaipet/merchant-miniapp typecheck`
- `pnpm --filter @xiaipet/merchant-miniapp build`
