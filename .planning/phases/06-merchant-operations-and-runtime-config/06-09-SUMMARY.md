---
phase: 06-merchant-operations-and-runtime-config
plan: 09
subsystem: merchant-user-admin-ui
tags: [merchant-miniapp, users, balance, audit, drawer]
requires:
  - phase: 06-merchant-operations-and-runtime-config
    plan: 03
    provides: user admin contracts
  - phase: 06-merchant-operations-and-runtime-config
    plan: 06
    provides: merchant user search and balance adjustment handlers
provides:
  - merchant user admin service layer
  - user search page
  - user detail page with balance adjustment drawer
affects: [merchant-miniapp]
tech-stack:
  added: []
  patterns: [explicit-submit search, service-owned balance preview payloads, cached latest adjustment summary]
key-files:
  created:
    - apps/merchant-miniapp/src/services/user-admin.ts
    - apps/merchant-miniapp/src/services/user-admin.test.ts
    - apps/merchant-miniapp/pages/users/index.ts
    - apps/merchant-miniapp/pages/users/index.wxml
    - apps/merchant-miniapp/pages/users/index.wxss
    - apps/merchant-miniapp/pages/users/index.json
    - apps/merchant-miniapp/pages/user-detail/index.ts
    - apps/merchant-miniapp/pages/user-detail/index.wxml
    - apps/merchant-miniapp/pages/user-detail/index.wxss
    - apps/merchant-miniapp/pages/user-detail/index.json
requirements-completed: [MUSR-01, MUSR-02]
duration: 24min
completed: 2026-04-18
---

# Phase 6 Plan 09: Merchant User Admin UI Summary

**Explicit merchant user search and a confirmed balance-adjustment drawer**

## Accomplishments

- Added a merchant user admin service that wraps `searchMerchantUsers` and `adjustUserBalance`, builds lightweight search cards, computes resulting-balance previews for `增加余额` / `扣减余额` / `改为指定余额`, and persists a cached latest-adjustment summary for the detail page.
- Built the merchant user search page with explicit submit only, preserving the backend’s lightweight projection and surfacing `会员等级` plus `当前余额` directly on each result card.
- Built the user detail page around a balance-focused card and a bottom drawer that exposes all three locked adjustment actions, reason-type pills, required note capture, resulting-balance preview, and second confirmation before submission.

## Task Commits

Pending commit for this plan.

## Decisions Made

- Search remains fully explicit-submit; typing alone does not trigger backend requests.
- Balance preview and final mutation payload construction live in the service layer so the page does not duplicate delta/target/after math or confirmation invariants.
- Because Phase 6 has no dedicated user-ledger read endpoint, the detail page shows the latest known adjustment summary from local cache after successful merchant actions, instead of inventing a new backend contract mid-plan.

## Deviations from Plan

- The “recent ledger summary” requirement is satisfied with the latest known locally cached merchant adjustment result, not a server-fetched ledger list, because the planned backend surface does not provide a user-detail read API for ledger history.

## Verification

- `pnpm --filter @xiaipet/merchant-miniapp test -- user-admin`
- `rg -n "搜索|会员等级|当前余额" apps/merchant-miniapp/pages/users/index.wxml`
- `rg -n "增加余额|扣减余额|改为指定余额|确认余额调整|调整后余额" apps/merchant-miniapp/pages/user-detail/index.wxml apps/merchant-miniapp/pages/user-detail/index.ts`
- `pnpm --filter @xiaipet/merchant-miniapp build`

## Self-Check: PASSED

- User admin service tests cover explicit search submit, lightweight card mapping, negative-balance prevention, payload generation, and latest-operation summary shaping.
- Merchant miniapp TypeScript build passes with the new users and user-detail pages.
- The detail drawer now expresses the locked Phase 6 actions and confirmation rules without bypassing the audited backend payload contract.

---
*Phase: 06-merchant-operations-and-runtime-config*  
*Completed: 2026-04-18*
