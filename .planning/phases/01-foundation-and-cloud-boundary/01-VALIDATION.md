---
phase: 01
slug: foundation-and-cloud-boundary
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-16
reviewed_at: 2026-04-16T15:30:00+08:00
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + workspace lint/typecheck |
| **Config file** | `packages/shared/vitest.config.ts` + root workspace scripts |
| **Quick run command** | `pnpm -r typecheck` |
| **Full suite command** | `pnpm -r lint && pnpm -r typecheck && pnpm --filter @xiaipet/shared test` |
| **Estimated runtime** | ~30-90 seconds |

---

## Sampling Rate

- **After every task commit:** Run the task's `<automated>` command.
- **After every plan wave:** Run `pnpm -r typecheck`.
- **After Wave 0 and before any customer/merchant shell task:** Run `pnpm --filter @xiaipet/shared test`.
- **Before `/gsd-verify-work`:** Run `pnpm -r lint && pnpm -r typecheck && pnpm --filter @xiaipet/shared test`.
- **Max feedback latency:** 90 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01-01 | 0 | AUTH-01, AUTH-02 | T-01-01-A | Root workspace + ignore rules exist before implementation expands | smoke | `test -f package.json && test -f pnpm-workspace.yaml && test -f tsconfig.base.json && test -f .gitignore` | ✅ | ⬜ pending |
| 01-01-02 | 01-01 | 0 | AUTH-01, AUTH-02 | T-01-01-B | Wave 0 shared test scaffold exists before any schema/rule task | unit scaffold | `test -f packages/shared/vitest.config.ts && test -f packages/shared/src/schema/user-record.test.ts && test -f packages/shared/src/rules/user-bootstrap.test.ts` | ✅ | ⬜ pending |
| 01-02-01 | 01-02 | 1 | AUTH-01 | T-01-02-A | Customer/merchant apps are real PNPM workspace members with explicit configs | smoke | `test -f apps/customer-miniapp/package.json && test -f apps/merchant-miniapp/package.json && test -f apps/customer-miniapp/tsconfig.json && test -f apps/merchant-miniapp/tsconfig.json` | ✅ | ⬜ pending |
| 01-02-02 | 01-02 | 1 | AUTH-01 | T-01-02-B | Cloud-functions workspace is discoverable by root workspace | smoke | `test -f apps/cloud-functions/package.json && test -f apps/cloud-functions/tsconfig.json` | ✅ | ⬜ pending |
| 01-03-01 | 01-03 | 1 | AUTH-01, AUTH-02 | T-01-03-A | Shared export surface and env constants exist | smoke | `test -f packages/shared/src/index.ts && test -f packages/shared/src/types/user.ts && test -f packages/shared/src/constants/env.ts && test -f packages/shared/src/schema/runtime-config.ts` | ✅ | ⬜ pending |
| 01-03-02 | 01-03 | 1 | AUTH-01, AUTH-02 | T-01-03-B | Minimal user, merchant, and phone-binding schema stay pure and testable | unit | `pnpm --filter @xiaipet/shared test` | ✅ W0 | ⬜ pending |
| 01-04-01 | 01-04 | 2 | AUTH-01, AUTH-02 | T-01-04-A | CloudBase env files only expose dev/prod placeholders, no secrets | smoke | `test -f apps/cloud-functions/cloudbaserc.json && test -f apps/cloud-functions/.env.dev.example && test -f apps/cloud-functions/.env.prod.example && ! rg -n 'appSecret|secretId|secretKey|private_key|mch' apps/cloud-functions/.env.dev.example apps/cloud-functions/.env.prod.example` | ✅ | ⬜ pending |
| 01-04-02 | 01-04 | 2 | AUTH-01, AUTH-02 | T-01-04-B | Sensitive collection rules and indexes are explicit config files | smoke | `test -f apps/cloud-functions/config/security/database.rules.json && rg -n 'users|merchant_users|runtime_configs' apps/cloud-functions/config/collections/users.json apps/cloud-functions/config/collections/merchant_users.json apps/cloud-functions/config/collections/runtime_configs.json apps/cloud-functions/config/indexes/users.index.json apps/cloud-functions/config/indexes/merchant_users.index.json apps/cloud-functions/config/security/database.rules.json` | ✅ | ⬜ pending |
| 01-05-01 | 01-05 | 3 | AUTH-01, AUTH-02 | T-01-05-A | Cloud functions share one env/context guard path | smoke | `test -f apps/cloud-functions/src/shared/env.ts && test -f apps/cloud-functions/src/shared/auth-context.ts` | ✅ | ⬜ pending |
| 01-05-02 | 01-05 | 3 | AUTH-01, AUTH-02 | T-01-05-B | bootstrapUser/bindPhone/assertMerchantAccess exist as separate entrypoints | smoke | `test -f apps/cloud-functions/src/bootstrapUser/index.ts && test -f apps/cloud-functions/src/bindPhone/index.ts && test -f apps/cloud-functions/src/assertMerchantAccess/index.ts && rg -n 'bindPhone|phoneBindingState|merchant_users|allowed|denied' apps/cloud-functions/src/bootstrapUser/index.ts apps/cloud-functions/src/bindPhone/index.ts apps/cloud-functions/src/assertMerchantAccess/index.ts` | ✅ | ⬜ pending |
| 01-06-01 | 01-06 | 4 | AUTH-01 | T-01-06-A | customer app.json only registers launch route after launch artifacts exist | smoke | `test -f apps/customer-miniapp/app.ts && test -f apps/customer-miniapp/app.json && test -f apps/customer-miniapp/src/services/auth.ts && rg -n 'pages/launch/index|bootstrapUser|wx.login' apps/customer-miniapp/app.ts apps/customer-miniapp/app.json apps/customer-miniapp/src/services/auth.ts && ! rg -n 'pages/contact-bind/index' apps/customer-miniapp/app.json` | ✅ | ⬜ pending |
| 01-06-02 | 01-06 | 4 | AUTH-01 | T-01-06-B | Launch shell uses approved customer tokens and approved palette values | smoke | `test -f apps/customer-miniapp/pages/launch/index.ts && test -f apps/customer-miniapp/src/theme/tokens.ts && rg -n '微信授权登录|startCustomerBootstrap|customerSurface|customerSecondary|customerAccent|F6E396|E7D7C3|D96C4E' apps/customer-miniapp/pages/launch/index.ts apps/customer-miniapp/pages/launch/index.wxml apps/customer-miniapp/pages/launch/index.wxss apps/customer-miniapp/src/theme/tokens.ts` | ✅ | ⬜ pending |
| 01-07-01 | 01-07 | 5 | AUTH-02 | T-01-07-A | contact-bind route is registered only when the page exists | smoke | `test -f apps/customer-miniapp/app.json && test -f apps/customer-miniapp/pages/contact-bind/index.ts && rg -n 'pages/contact-bind/index|getPhoneNumber|手动补录|requestWechatPhone|submitManualPhone|customerSurface|customerAccent' apps/customer-miniapp/app.json apps/customer-miniapp/pages/contact-bind/index.ts apps/customer-miniapp/pages/contact-bind/index.wxml apps/customer-miniapp/pages/contact-bind/index.wxss apps/customer-miniapp/src/theme/tokens.ts` | ✅ | ⬜ pending |
| 01-07-02 | 01-07 | 5 | AUTH-02 | T-01-07-B | phone service persists contact data through bindPhone cloud function | smoke | `test -f apps/customer-miniapp/src/services/phone.ts && rg -n 'requestWechatPhone|submitManualPhone|bindPhone|phoneBindingState|contactPhoneMasked|contactPhoneCountryCode' apps/customer-miniapp/src/services/phone.ts apps/cloud-functions/src/bindPhone/index.ts` | ✅ | ⬜ pending |
| 01-08-01 | 01-08 | 4 | AUTH-01 | T-01-08-A | merchant app.json registers access-gate route and service wiring | smoke | `test -f apps/merchant-miniapp/app.ts && test -f apps/merchant-miniapp/app.json && test -f apps/merchant-miniapp/src/services/access.ts && rg -n 'pages/access-gate/index|assertMerchantAccess|wx.cloud.init|cloud.init' apps/merchant-miniapp/app.ts apps/merchant-miniapp/app.json apps/merchant-miniapp/src/services/access.ts` | ✅ | ⬜ pending |
| 01-08-02 | 01-08 | 4 | AUTH-01 | T-01-08-B | access-gate shell exposes only whitelist validation path | smoke | `test -f apps/merchant-miniapp/pages/access-gate/index.ts && rg -n '验证商户身份|verifyMerchantAccess|merchantSurface|merchantAccent|2E5B73' apps/merchant-miniapp/pages/access-gate/index.ts apps/merchant-miniapp/pages/access-gate/index.wxml apps/merchant-miniapp/pages/access-gate/index.wxss apps/merchant-miniapp/src/theme/tokens.ts` | ✅ | ⬜ pending |
| 01-09-01 | 01-09 | 3 | AUTH-01 | T-01-09-A | function deployment and prod release require explicit mapping and manual confirmation | smoke | `test -f scripts/release-dev.sh && test -f scripts/release-prod.sh && rg -n 'bootstrapUser|bindPhone|assertMerchantAccess|dev|prod|confirm|手动|collections|indexes|security' scripts/release-dev.sh scripts/release-prod.sh` | ✅ | ⬜ pending |
| 01-09-02 | 01-09 | 3 | AUTH-01 | T-01-09-B | release docs and ignore rules enforce secret-safe setup | smoke | `test -f docs/release/cloudbase-and-miniapp.md && test -f .gitignore && rg -n '敏感配置|\.env|\.key|CloudBase|collections|indexes|security' docs/release/cloudbase-and-miniapp.md .gitignore` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `pnpm-workspace.yaml` — workspace package discovery
- [x] root `package.json` — workspace scripts for `lint`, `typecheck`, `test`
- [x] `tsconfig.base.json` — shared TypeScript baseline
- [x] `packages/shared/vitest.config.ts` — shared test setup
- [x] `packages/shared/src/schema/user-record.test.ts` — schema test scaffold
- [x] `packages/shared/src/rules/user-bootstrap.test.ts` — pure-rule test scaffold

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CloudBase `dev` / `prod` environment mapping is correct in console | AUTH-01 | Requires checking real cloud environment IDs | 在 CloudBase 控制台核对 dev/prod 环境名、ID 和发布目标是否与模板一致 |
| 非白名单账号进入商户端时被拒绝 | AUTH-01 | 需要真实或 staging 账号上下文 | 在 dev 环境用非白名单账号打开商户端，确认只出现拒绝态和联系指引 |
| 小程序手机号能力拒绝后仍可手动补录，并最终写回后端 | AUTH-02 | 需要真机或开发者工具交互 | 在 contact-bind 页面拒绝授权后改走手动补录，并核对 bindPhone 调用与用户主记录状态更新 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-16
