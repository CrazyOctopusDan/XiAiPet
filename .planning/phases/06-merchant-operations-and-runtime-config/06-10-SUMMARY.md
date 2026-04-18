---
phase: 06-merchant-operations-and-runtime-config
plan: 10
subsystem: merchant-runtime-config-ui
tags: [merchant-miniapp, runtime-config, sections, membership, delivery]
requires:
  - phase: 06-merchant-operations-and-runtime-config
    plan: 03
    provides: runtime config contracts and locked delivery rows
  - phase: 06-merchant-operations-and-runtime-config
    plan: 06
    provides: merchant runtime config handlers
provides:
  - runtime config admin service
  - merchant runtime config page
affects: [merchant-miniapp]
tech-stack:
  added: []
  patterns: [section-scoped saves, default section hydration, visible delivery explainer rows]
key-files:
  created:
    - apps/merchant-miniapp/src/services/runtime-config-admin.ts
    - apps/merchant-miniapp/src/services/runtime-config-admin.test.ts
    - apps/merchant-miniapp/pages/runtime-config/index.ts
    - apps/merchant-miniapp/pages/runtime-config/index.wxml
    - apps/merchant-miniapp/pages/runtime-config/index.wxss
    - apps/merchant-miniapp/pages/runtime-config/index.json
requirements-completed: [OPS-01]
duration: 18min
completed: 2026-04-18
---

# Phase 6 Plan 10: Merchant Runtime Config UI Summary

**Single-entry merchant runtime-config editing with per-section saves**

## Accomplishments

- Added a runtime-config admin service that loads and saves sections independently, hydrates missing sections from defaults, keeps membership tiers shaped as `threshold + name + description`, and reuses the locked delivery explainer rows verbatim.
- Built a single runtime-config page with the five locked sections: `店铺信息`、`配送费规则`、`会员等级`、`首页 Banner`、`定制提示`.
- Each section now has its own save button and `未保存` tracking, so the page preserves the D-27 “section-scoped save” rule instead of collapsing into one giant submit.
- Delivery rules are shown as visible explainer rows plus a `配送费说明` modal trigger, rather than hidden algorithm inputs.

## Task Commits

Pending commit for this plan.

## Decisions Made

- The admin service owns default-section hydration so the page can assume all five sections exist even when the backend collection starts empty.
- Delivery rules stay effectively locked: the merchant page surfaces the explainer rows and save boundary, but does not invent editable algorithm controls beyond the approved row model.
- Membership editing is intentionally explicit and flat, with threshold/name/description grouped together on each tier row.

## Deviations from Plan

- Banner editing is currently fileId + altText entry, not a new upload flow. This stays within the existing handler contract and avoids expanding the plan into another media-management subsystem.

## Verification

- `pnpm --filter @xiaipet/merchant-miniapp test -- runtime-config-admin`
- `rg -n "店铺信息|配送费规则|会员等级|首页 Banner|定制提示|未保存|等级说明|累计消费门槛" apps/merchant-miniapp/pages/runtime-config/index.wxml`
- `rg -n "5\.0 公里内 98 元起送，配送费 0 元|10\.0 公里内 98 元起送，配送费 15 元|说明弹层|配送费说明" apps/merchant-miniapp/pages/runtime-config/index.wxml apps/merchant-miniapp/pages/runtime-config/index.ts`
- `pnpm --filter @xiaipet/merchant-miniapp build`

## Self-Check: PASSED

- Runtime-config service tests cover section hydration, membership tuple shaping, delivery locked-copy exposure, and section-level saves.
- Merchant miniapp TypeScript build passes with the new runtime-config page and generated runtime JS.
- The merchant surface now exposes all five locked config sections and preserves independent saves plus visible delivery-fee explainer content.

---
*Phase: 06-merchant-operations-and-runtime-config*  
*Completed: 2026-04-18*
