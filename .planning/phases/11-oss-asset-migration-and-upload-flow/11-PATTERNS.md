# Phase 11: OSS Asset Migration and Upload Flow - Pattern Map

**Mapped:** 2026-05-11

## Scope

Phase 11 touches four established surfaces:

- `apps/api` Fastify route/service/config patterns.
- `packages/shared` type and runtime validation patterns.
- Merchant miniapp service/page patterns.
- Customer miniapp display/cache patterns.

## Existing Patterns to Reuse

### API Config

Analog: `apps/api/src/config/env.ts`

- Config is parsed through small helpers.
- Test mode can use deterministic safe defaults.
- Required production secrets throw explicit `Invalid {NAME}` errors.

Use for OSS:

- Add `oss` config fields to `ApiConfig`.
- Add `OSS_REGION`, `OSS_BUCKET`, `OSS_ENDPOINT`, `OSS_PUBLIC_BASE_URL`, `OSS_ACCESS_KEY_ID`, `OSS_ACCESS_KEY_SECRET`, `OSS_UPLOAD_POLICY_TTL_SECONDS`.
- Add tests in `apps/api/src/config/env.test.ts`.

### API Route Dependency Injection

Analog: `apps/api/src/routes/dependencies.ts` and `apps/api/src/routes/merchant/catalog.ts`

- Routes receive service objects via `ApiRouteDependencies`.
- Tests override services with `vi.fn`.
- Merchant-only routes use `dependencies.guards.requireMerchantSession`.

Use for OSS:

- Add `assetService` to dependencies.
- Add `apps/api/src/routes/merchant/assets.ts`.
- Register under `/api/v1/merchant` in `api-v1.ts`.
- Add route tests like `merchant-admin.routes.test.ts`.

### Shared Runtime Validators

Analog: `packages/shared/src/schema/catalog-admin.ts` and `packages/shared/src/schema/runtime-config.ts`

- Validators use small type guards and exact object key checks for runtime config.
- Current CloudBase-only string checks are isolated as `isCloudBaseFileId`.

Use for OSS:

- Add `packages/shared/src/types/assets.ts` and `packages/shared/src/schema/assets.ts`.
- Replace CloudBase-only image validation with `isAssetStorageId` and `isOssAssetReference`.
- Keep compatibility for `cloud://` only where migration report still needs to parse old seed data; new persisted product/runtime config should accept OSS references.

### Product Persistence

Analog: `apps/api/src/modules/catalog/repository.ts`

- Repository maps Prisma rows to records through `mapProduct`.
- JSON fields use `asJson`.
- Product upsert already maps `imageFileId` and `imagePreviewUrl`.

Use for OSS:

- Add JSON columns to `Product`: `imageAsset`, `introductionImageAssets`, `detailImageAssets`.
- Extend `CatalogProductRecord`, `mapProduct`, and `upsertProduct`.
- Keep existing string fields populated for compatibility.

### Runtime Config Persistence

Analog: `apps/api/src/modules/runtime-config/repository.ts`

- Runtime config sections are already JSON values.
- No schema migration is required for banner asset shape if it stays inside the `banner` section value.

Use for OSS:

- Store banner `asset` inside `RuntimeConfigSection.value`.
- Keep `fileId` as compatibility string during transition.

### Merchant Miniapp Services

Analog: `apps/merchant-miniapp/src/services/catalog-admin.ts` and `apps/merchant-miniapp/src/services/api-client.ts`

- Page code calls service functions directly.
- HTTP API calls go through `merchantApiRequest`.
- Existing `uploadProductImage` placeholder is the Phase 11 entry point.

Use for OSS:

- Add `apps/merchant-miniapp/src/services/assets.ts`.
- Replace `uploadProductImage` placeholder with a wrapper over `uploadMerchantAsset`.
- Keep product editor page narrow; put policy/upload/confirm orchestration in service tests.

### Customer Display

Analog: `apps/customer-miniapp/src/services/catalog.ts` and `apps/customer-miniapp/src/services/runtime-config.ts`

- Services hydrate from API and keep local fallback data.
- Display helpers clone cached data.

Use for OSS:

- Normalize product images so list surfaces use `thumbnailUrl`/thumbnail variant.
- Runtime config banner should prefer `banner.asset.variants[name=banner].url` or `banner.asset.url`, falling back to existing local placeholder.

## Files by Plan

### Plan 11-01

- `apps/api/package.json`
- `apps/api/src/config/env.ts`
- `apps/api/src/config/env.test.ts`
- `apps/api/src/lib/logger.ts`
- `packages/shared/src/types/assets.ts`
- `packages/shared/src/schema/assets.ts`
- `packages/shared/src/types/catalog-admin.ts`
- `packages/shared/src/schema/catalog-admin.ts`
- `packages/shared/src/types/runtime-config.ts`
- `packages/shared/src/schema/runtime-config.ts`
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/*/migration.sql`
- `apps/api/src/modules/catalog/repository.ts`
- `apps/api/src/modules/catalog/service.ts`
- `apps/api/src/modules/assets/policy.ts`
- `apps/api/src/modules/assets/service.ts`
- `apps/api/src/modules/assets/policy.test.ts`
- `apps/api/src/modules/assets/service.test.ts`

### Plan 11-02

- `apps/api/src/routes/dependencies.ts`
- `apps/api/src/routes/api-v1.ts`
- `apps/api/src/routes/merchant/assets.ts`
- `apps/api/src/routes/merchant-assets.routes.test.ts`
- `apps/merchant-miniapp/src/services/assets.ts`
- `apps/merchant-miniapp/src/services/assets.test.ts`
- `apps/merchant-miniapp/src/services/catalog-admin.ts`
- `apps/merchant-miniapp/src/services/catalog-admin.test.ts`
- `apps/merchant-miniapp/pages/product-editor/index.ts`
- `apps/merchant-miniapp/pages/product-editor/index.wxml`
- `apps/merchant-miniapp/pages/product-editor/index.wxss`
- generated matching `.js` files after build

### Plan 11-03

- `apps/api/src/modules/migration/asset-reference-migration.ts`
- `apps/api/src/modules/migration/asset-reference-migration.test.ts`
- `apps/api/scripts/migrate-assets.ts`
- `apps/api/package.json`
- `apps/api/tmp/.gitignore` or docs for output path if needed

### Plan 11-04

- `apps/customer-miniapp/src/services/catalog.ts`
- `apps/customer-miniapp/src/services/catalog.test.ts`
- `apps/customer-miniapp/src/services/runtime-config.ts`
- `apps/customer-miniapp/src/services/runtime-config.test.ts`
- `apps/customer-miniapp/pages/home/index.ts`
- `apps/merchant-miniapp/src/services/runtime-config-admin.ts`
- `apps/merchant-miniapp/src/services/runtime-config-admin.test.ts`
- `apps/merchant-miniapp/pages/runtime-config/index.ts`
- `apps/merchant-miniapp/pages/runtime-config/index.wxml`
- `docs/release/cloudbase-and-miniapp.md`
- generated matching `.js` files after build

## PATTERN MAPPING COMPLETE
