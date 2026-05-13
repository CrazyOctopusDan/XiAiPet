# Merchant Account Password Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace merchant openid whitelist onboarding with independent merchant account/password login, forced password changes, admin-managed staff accounts, and role-based permissions.

**Architecture:** Add a dedicated `merchant_accounts` backend model and account service. Merchant API sessions will carry merchant account identity and role instead of WeChat openid, while customer auth remains unchanged. The merchant miniapp login screen will authenticate with username/password, route first-login accounts to a password-change page, and filter workspace/admin actions by role.

**Tech Stack:** Fastify, Prisma/MySQL, Node `crypto.scrypt`, WeChat miniapp pages/services, TypeScript, Vitest.

---

### Task 1: Backend Account Model And Password Service

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/202605130001_add_merchant_accounts/migration.sql`
- Create: `apps/api/src/modules/merchant-accounts/password.ts`
- Create: `apps/api/src/modules/merchant-accounts/repository.ts`
- Create: `apps/api/src/modules/merchant-accounts/service.ts`
- Test: `apps/api/src/modules/merchant-accounts/service.test.ts`

- [ ] Add `MerchantAccountRole`, `MerchantAccountStatus`, and `MerchantAccount` to Prisma.
- [ ] Add SQL migration creating `merchant_accounts`.
- [ ] Implement salted password hashing with `crypto.scrypt`.
- [ ] Implement repository methods for bootstrap admin, lookup, list, create staff, disable, reset password, and change password.
- [ ] Implement service methods with validation and default credentials: `admin/admin`, staff initial password `staff`.
- [ ] Add tests for bootstrap, login, disabled login, forced password change, staff create/disable/reset, and admin-only checks.

### Task 2: Merchant Session And API Permissions

**Files:**
- Modify: `apps/api/src/modules/auth/types.ts`
- Modify: `apps/api/src/modules/auth/session.ts`
- Modify: `apps/api/src/modules/auth/guards.ts`
- Modify: `apps/api/src/routes/dependencies.ts`
- Modify: `apps/api/src/routes/merchant/auth.ts`
- Modify: `apps/api/src/routes/merchant/access.ts`
- Create: `apps/api/src/routes/merchant/accounts.ts`
- Modify: `apps/api/src/routes/merchant/users.ts`
- Modify: `apps/api/src/routes/merchant/runtime-config.ts`
- Modify: `apps/api/src/routes/api-v1.ts`
- Test: `apps/api/src/routes/auth.routes.test.ts`
- Test: `apps/api/src/routes/merchant-admin.routes.test.ts`

- [ ] Extend session payloads so merchant tokens can use `merchantAccountId`, `username`, `role`, and `mustChangePassword` without requiring openid.
- [ ] Replace merchant `/auth/login` request body with `{ username, password }`.
- [ ] Add `/merchant/auth/change-password`.
- [ ] Add admin-only `/merchant/accounts` routes for listing, creating staff, disabling staff, and resetting staff password.
- [ ] Make `requireMerchantSession` resolve active merchant accounts and block normal routes while `mustChangePassword` is true.
- [ ] Add role guards so staff can use catalog/order/asset/printing routes but cannot access employee management, runtime config, customer user search, or balance adjustment.
- [ ] Update route tests for admin and staff permissions.

### Task 3: Merchant Miniapp Auth Client

**Files:**
- Modify: `apps/merchant-miniapp/src/services/api-client.ts`
- Modify mirror: `apps/merchant-miniapp/src/services/api-client.js`
- Modify: `apps/merchant-miniapp/src/services/access.ts`
- Modify mirror: `apps/merchant-miniapp/src/services/access.js`
- Create: `apps/merchant-miniapp/src/services/merchant-accounts.ts`
- Create mirror: `apps/merchant-miniapp/src/services/merchant-accounts.js`
- Test: `apps/merchant-miniapp/src/services/api-client.test.ts`
- Test: `apps/merchant-miniapp/src/services/access.test.ts`
- Test: `apps/merchant-miniapp/src/services/merchant-accounts.test.ts`

- [ ] Replace `wx.login` merchant auth with username/password login.
- [ ] Store session account metadata: account id, username, role, and `mustChangePassword`.
- [ ] Stop automatic re-login on 401 because password credentials are not stored.
- [ ] Add service calls for password change and admin staff account actions.
- [ ] Keep `verifyMerchantAccess` as a session validation helper that returns account role metadata and no openid.

### Task 4: Merchant Miniapp Login And Password Change UI

**Files:**
- Modify: `apps/merchant-miniapp/pages/access-gate/index.ts`
- Modify mirror: `apps/merchant-miniapp/pages/access-gate/index.js`
- Modify: `apps/merchant-miniapp/pages/access-gate/index.wxml`
- Modify: `apps/merchant-miniapp/pages/access-gate/index.wxss`
- Create: `apps/merchant-miniapp/pages/password-change/index.ts`
- Create mirror: `apps/merchant-miniapp/pages/password-change/index.js`
- Create: `apps/merchant-miniapp/pages/password-change/index.wxml`
- Create: `apps/merchant-miniapp/pages/password-change/index.wxss`
- Create: `apps/merchant-miniapp/pages/password-change/index.json`
- Modify: `apps/merchant-miniapp/app.json`

- [ ] Convert access gate into username/password login with default-friendly field labels.
- [ ] Route `mustChangePassword` sessions to `/pages/password-change/index`.
- [ ] Implement password change validation: current password, new password, confirmation match.
- [ ] After successful password change, route to workspace.

### Task 5: Staff Account Management And Role-Aware Workspace

**Files:**
- Modify: `apps/merchant-miniapp/src/services/workspace.ts`
- Modify mirror: `apps/merchant-miniapp/src/services/workspace.js`
- Modify: `apps/merchant-miniapp/pages/workspace/index.ts`
- Modify mirror: `apps/merchant-miniapp/pages/workspace/index.js`
- Create: `apps/merchant-miniapp/pages/staff-accounts/index.ts`
- Create mirror: `apps/merchant-miniapp/pages/staff-accounts/index.js`
- Create: `apps/merchant-miniapp/pages/staff-accounts/index.wxml`
- Create: `apps/merchant-miniapp/pages/staff-accounts/index.wxss`
- Create: `apps/merchant-miniapp/pages/staff-accounts/index.json`
- Modify: `apps/merchant-miniapp/pages/user-detail/index.ts`
- Modify mirror: `apps/merchant-miniapp/pages/user-detail/index.js`
- Modify: `apps/merchant-miniapp/app.json`
- Test: `apps/merchant-miniapp/src/services/workspace.test.ts`

- [ ] Add an admin-only staff account card to the workspace.
- [ ] Hide customer user and runtime config cards from staff.
- [ ] Add staff account list, create, disable, and reset password actions.
- [ ] Hide balance adjustment controls for non-admin sessions as a frontend usability guard.

### Task 6: Verification

**Files:**
- Verify all modified source and test files.

- [ ] Run `pnpm --filter @xiaipet/api db:generate`.
- [ ] Run `pnpm --filter @xiaipet/api typecheck`.
- [ ] Run focused API tests if the local Vitest/Vite ESM issue allows it.
- [ ] Run `pnpm --filter @xiaipet/merchant-miniapp typecheck`.
- [ ] Run targeted `rg` checks confirming merchant miniapp auth no longer displays or copies openid.
- [ ] Review `git diff` to ensure unrelated customer cart changes are untouched.
