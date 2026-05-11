# Phase 11: OSS Asset Migration and Upload Flow - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 11 replaces CloudBase storage with Alibaba Cloud OSS for mini program assets. It delivers a controlled merchant upload flow, OSS-backed image references for product and runtime config display, a reportable path for legacy `cloud://` references, and documentation for bucket policy, CORS, URL behavior, and cost-aware image usage.

This phase is not a product feature expansion. It should make existing asset needs work on OSS: homepage Banner, product cover/list images, product introduction images, product detail images, and existing runtime config image fields. Marketing features, full CDN rollout, and production domain cutover remain later work unless required for OSS display compatibility.

</domain>

<decisions>
## Implementation Decisions

### Upload Flow
- **D-01:** Merchant miniapp uploads should use direct-to-OSS upload with server-issued short-lived upload authorization or signed POST/policy data.
- **D-02:** The miniapp must never receive long-lived OSS AK/SK. The API owns all OSS credentials and returns only scoped, short-lived upload instructions.
- **D-03:** The upload flow should be two-step: request upload authorization from `apps/api`, upload file from the miniapp to OSS, then call the API to confirm and persist the resulting asset metadata.
- **D-04:** The backend should validate merchant authorization before issuing upload instructions and before accepting upload confirmation.
- **D-05:** The agent may choose the exact signing mechanism after researching OSS and WeChat mini program compatibility, but the result must be simple enough for a frontend developer to configure and operate.

### Asset Access
- **D-06:** Product and runtime config images are public storefront assets. Use approved public HTTPS image URLs for display rather than short-lived signed read URLs.
- **D-07:** Production miniapp release must document that the OSS image domain, CDN domain, or final asset domain needs to be configured as a WeChat legal download/image domain.
- **D-08:** Do not proxy normal image reads through the Node API. The API may generate or persist URLs, but image bytes should be served by OSS or a later CDN/asset domain to avoid backend bandwidth cost and bottlenecks.
- **D-09:** If a private bucket is required during early setup, planning may use OSS/CDN public-read object access for specific asset prefixes instead of signing every read URL, because these assets are intended for public product browsing.

### Asset Types and Cost Control
- **D-10:** Treat homepage Banner, product cover/list images, product introduction images, and product detail images as distinct asset roles. They should not all reuse one full-size URL.
- **D-11:** Each asset role should have its own constraints and output URLs. Product list/card views should use a lightweight thumbnail or display variant; product detail pages may use larger detail images; homepage Banner should use a wide banner-optimized variant.
- **D-12:** Phase 11 should include practical cost controls: file size limits, allowed MIME types, deterministic object key prefixes, and role-specific max dimensions/variants.
- **D-13:** Phase 11 should include a practical merchant image crop/compression UI. It should be role-driven rather than a full media library: choose asset role, crop to role constraints, preview, compress, then upload.
- **D-14:** The exact dimensions, compression settings, and image format choices are the agent's discretion during planning/research, but they must be justified by WeChat mini program display compatibility and OSS traffic/cost control.
- **D-15:** Store enough metadata for the frontend to select the right URL for the right surface, for example `thumbnailUrl`, `displayUrl`, `detailUrl`, `bannerUrl`, role, width, height, size, content type, and OSS object key.

### Crop and Compression Modes
- **D-25:** Support two merchant upload modes: upload an already processed image and only validate it, or use miniapp-assisted crop/compress to produce compliant images before upload.
- **D-26:** Miniapp-assisted processing should generate role-appropriate final files before upload where practical. OSS image processing styles may be used as a fallback or supplement, but list/card views should not depend on dynamically transforming large originals on every request.
- **D-27:** Default to not persisting original source images in OSS, to control storage and traffic cost. If a merchant needs to change crop or quality later, they can re-upload; preserving originals can be added later if real operations require it.
- **D-28:** The upload UI should let the merchant pick the asset role first so the app can apply the correct aspect ratio, max dimensions, quality target, and output variant naming.
- **D-29:** Compression should be treated as a budget control, not just a visual feature. Planning should define per-role size targets and reject or reprocess files that exceed the configured limits after compression.

### Legacy CloudBase References
- **D-16:** Existing mini program data is largely fake or placeholder data, so Phase 11 should not over-invest in rescuing historical CloudBase files.
- **D-17:** The migration path should be report-first and idempotent. It should inspect current database references that still use `cloud://`, classify them, and produce a report of what would be migrated, skipped, missing, or failed.
- **D-18:** Missing or fake legacy files should not block Phase 11 implementation. The primary goal is that future merchant uploads and future product/runtime config images work correctly through OSS.
- **D-19:** The migration script can support actual copying when a valid source file/export is available, but no manual chasing of old CloudBase storage is required in this phase.
- **D-20:** If existing fake CloudBase references remain after the report, downstream planning should either replace them with local/seed OSS placeholders or document them as non-production seed data.

### Product and Runtime Config Integration
- **D-21:** Merchant product editing should re-enable image upload through the OSS flow that Phase 10 temporarily marked as `ASSET_UPLOAD_PENDING_OSS`.
- **D-22:** Runtime config Banner editing should support OSS-backed image references, not CloudBase file IDs.
- **D-23:** Customer-facing catalog/home/detail screens should use the appropriate OSS URL variant for their surface instead of raw storage IDs.
- **D-24:** Existing API and shared schemas that currently validate only `cloud://` image IDs must be updated to accept the new OSS asset reference shape.

### the agent's Discretion
- The agent may decide whether image processing happens via OSS image style parameters, server-side processing, or a minimal variant-recording strategy after checking current project dependencies and OSS compatibility.
- The agent may keep Phase 11 focused on product/Banner/detail images and defer unrelated avatars or future marketing media.
- The agent may define exact endpoint names, database columns, and shared types as long as they preserve the decisions above and fit the existing `apps/api` Fastify/Prisma patterns.

</decisions>

<specifics>
## Specific Ideas

- The user agreed with direct-to-OSS upload through backend-issued authorization.
- The user agreed with public HTTPS display URLs for public product/Banner assets.
- The user clarified that current miniapp data is fake, so old CloudBase references are not urgent and should not dominate this phase.
- The user expects future merchant-side uploads for product detail images and product introduction images.
- The user specifically wants homepage Banner, product introduction, and product detail images treated differently because their formats are different.
- The user is concerned about OSS pay-as-you-go traffic cost. List/card views should not load large detail/original images when a smaller variant would work.
- The user wants image editing/cropping UI if feasible, and wants compression included as part of the OSS cost-control design.
- The user agreed with defaulting to no original-image persistence, while still allowing merchants to upload pre-processed images manually if they prefer.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone Scope
- `.planning/PROJECT.md` — Defines the Alibaba Cloud migration goal and OSS as the replacement for CloudBase storage.
- `.planning/REQUIREMENTS.md` — Defines OSS-01 through OSS-03 and security constraints around not exposing long-lived credentials.
- `.planning/ROADMAP.md` — Defines Phase 11 goal, success criteria, and expected plan breakdown.
- `.planning/STATE.md` — Records current workflow position and pending operations concerns.

### Prior Phase Decisions
- `.planning/phases/10-mini-program-api-client-migration/10-CONTEXT.md` — Locks HTTP-only miniapp backend calls, production API base URL, and Phase 11 OSS as the asset boundary.
- `.planning/phases/10-mini-program-api-client-migration/10-05-SUMMARY.md` — Confirms CloudBase miniapp call surface is removed and product/Banner upload remains Phase 11.

### Current Asset Touchpoints
- `apps/merchant-miniapp/src/services/catalog-admin.ts` — Contains `uploadProductImage` placeholder and product image save shape.
- `apps/merchant-miniapp/pages/product-editor/index.ts` — Current merchant product image upload UI path and `ASSET_UPLOAD_PENDING_OSS` handling.
- `apps/merchant-miniapp/src/services/runtime-config-admin.ts` — Current Banner runtime config default still uses a CloudBase file ID.
- `apps/merchant-miniapp/pages/runtime-config/index.ts` — Current runtime config editing surface, including Banner fields.
- `apps/customer-miniapp/src/services/catalog.ts` — Customer catalog/home image source resolution.
- `apps/customer-miniapp/src/services/runtime-config.ts` — Customer Banner runtime config fallback and cache.
- `apps/customer-miniapp/pages/home/index.ts` — Home page uses home module images and runtime config Banner.
- `apps/customer-miniapp/src/data/catalog.ts` — Contains existing local placeholder and CloudBase-style image references.
- `packages/shared/src/schema/catalog-admin.ts` — Currently validates product image IDs as CloudBase file IDs.
- `packages/shared/src/schema/runtime-config.ts` — Currently validates Banner file IDs as CloudBase file IDs.
- `packages/shared/src/types/catalog-admin.ts` — Product editor and product admin image field types.
- `packages/shared/src/types/runtime-config.ts` — Banner runtime config image field types.
- `apps/api/prisma/schema.prisma` — Current product image columns and runtime config storage model.
- `apps/api/src/modules/catalog/service.ts` — Product admin save validation and image field mapping.
- `apps/api/src/modules/catalog/repository.ts` — Product image persistence.
- `apps/api/src/modules/migration/cloudbase-importer.ts` — Existing CloudBase data import pattern that can inform report-first asset migration.

### Release and Operations
- `docs/release/cloudbase-and-miniapp.md` — Current release note states `/api/v1` is target backend architecture and Phase 11 OSS owns assets.
- `apps/api/src/config/env.ts` — Existing environment validation pattern for secrets.
- `apps/api/src/lib/logger.ts` — Existing secret redaction list includes OSS secret names.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/api` already has structured config, Fastify route registration, merchant guards, and Prisma repository patterns from Phases 7-10.
- Merchant product editor already has an upload entry point, but Phase 10 intentionally changed it to fail with `ASSET_UPLOAD_PENDING_OSS`.
- Runtime config admin already has Banner fields, so Phase 11 can extend that path instead of inventing a separate media manager.
- The CloudBase import module already demonstrates idempotent import/report patterns that can be reused for asset reference migration.

### Established Patterns
- Miniapps use service-layer functions that pages call directly; Phase 11 should keep the same shape and avoid broad page rewrites.
- Shared package schemas enforce image field validity today and must be migrated away from CloudBase-only validation.
- Generated `.js` output must match TypeScript source after miniapp builds.
- Phase 10 established strict call-surface audits; Phase 11 should similarly audit for `cloud://` production references and CloudBase storage assumptions.

### Integration Points
- Add API routes under merchant-protected `/api/v1/merchant/...` for upload authorization and confirmation.
- Add OSS service/config modules inside `apps/api` without exposing credentials to the miniapp.
- Update Prisma schema or JSON metadata shape to store asset variants and object keys.
- Update merchant product and runtime config services/pages to call the upload flow and persist OSS asset references.
- Update customer display code to prefer role-appropriate `thumbnailUrl`/`displayUrl` over raw storage IDs.

</code_context>

<deferred>
## Deferred Ideas

- Full CDN rollout and custom asset domain optimization can be finalized in Phase 12 or a later operations phase if not required for miniapp display.
- Advanced media library management, reusable crop templates beyond the role-driven flow, and broader marketing asset workflows are out of scope for Phase 11.
- Real production cutover, HTTPS, and WeChat legal-domain configuration remain Phase 12.
- If the current fake CloudBase references are not worth migrating, they can be replaced by seed placeholders or left as report-only non-production data.

</deferred>

---

*Phase: 11-oss-asset-migration-and-upload-flow*
*Context gathered: 2026-05-11*
