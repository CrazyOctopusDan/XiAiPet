# Merchant Login Warm Operations UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the merchant miniapp login page into the approved C2 “温柔运营工具型” direction without changing authentication behavior.

**Architecture:** Keep the existing `pages/access-gate` page and merchant login service contract. Update the page data copy, WXML structure, and WXSS visual system so the login page becomes the first reusable merchant form pattern. Build afterward so generated runtime JavaScript stays in sync.

**Tech Stack:** Native WeChat Mini Program WXML/WXSS, TypeScript page logic, existing merchant API client, pnpm, TypeScript compiler, Vitest.

---

## Scope

This plan implements only the login page from `docs/superpowers/specs/2026-05-13-merchant-miniapp-warm-operations-ui-design.md`.

It does not redesign the workspace, staff accounts, orders, catalog, users, printer settings, or runtime configuration pages. Those should be separate plans after the login-page pattern is accepted in the actual miniapp.

## Current Worktree Risk

There are existing unstaged changes in the merchant workspace card navigation files:

- `.planning/STATE.md`
- `apps/merchant-miniapp/pages/workspace/index.wxml`
- `apps/merchant-miniapp/src/services/workspace.js`
- `apps/merchant-miniapp/src/services/workspace.test.ts`
- `apps/merchant-miniapp/src/services/workspace.ts`

Do not revert or overwrite these files while implementing this login plan. This plan touches only `access-gate` files and theme tokens.

## File Structure

- Modify `apps/merchant-miniapp/pages/access-gate/index.ts`
  - Owns login page state copy and `accessResult` state transitions.
  - Keep `merchantLogin` behavior and redirect logic unchanged.
- Modify `apps/merchant-miniapp/pages/access-gate/index.wxml`
  - Owns the approved C2 layout: brand header card, form card, labelled fields, fixed status strip, full-width login button.
- Modify `apps/merchant-miniapp/pages/access-gate/index.wxss`
  - Owns all login-page visual styling using the warm operations palette.
- Modify generated `apps/merchant-miniapp/pages/access-gate/index.js`
  - Produced by `pnpm --filter @xiaipet/merchant-miniapp build`; do not hand-edit unless the build cannot run.
- Optionally modify `apps/merchant-miniapp/src/theme/tokens.ts` and generated `tokens.js`
  - Only if implementation chooses to centralize the new warm operations color tokens immediately.
  - For this login-only plan, local page CSS variables are acceptable and lower risk.

## Task 1: Lock Login State Copy

**Files:**
- Modify: `apps/merchant-miniapp/pages/access-gate/index.ts`
- Generated after build: `apps/merchant-miniapp/pages/access-gate/index.js`

- [ ] **Step 1: Inspect current login state strings**

Run:

```bash
sed -n '1,140p' apps/merchant-miniapp/pages/access-gate/index.ts
```

Expected: the file contains `statusText: '请输入商户账号和密码'` and loading text `正在登录商户账号`.

- [ ] **Step 2: Update the neutral and loading copy**

In `apps/merchant-miniapp/pages/access-gate/index.ts`, change only the initial neutral `statusText` and loading `statusText`.

Expected resulting snippets:

```ts
Page({
  data: {
    username: 'admin',
    password: '',
    statusText: '首次登录后需要修改密码',
    accessResult: 'unknown',
    submitting: false
  },
```

```ts
    this.setData({ statusText: '正在登录', submitting: true });
```

Do not change:

```ts
wx.redirectTo({
  url: mustChangePassword ? '/pages/password-change/index' : '/pages/workspace/index'
});
```

- [ ] **Step 3: Typecheck the page logic**

Run:

```bash
pnpm --filter @xiaipet/merchant-miniapp typecheck
```

Expected: command exits `0`.

- [ ] **Step 4: Commit task 1**

```bash
git add apps/merchant-miniapp/pages/access-gate/index.ts
git commit -m "refactor: tighten merchant login status copy"
```

If there are unrelated unstaged changes, use path-specific `git add` exactly as shown.

## Task 2: Replace Login WXML With C2 Structure

**Files:**
- Modify: `apps/merchant-miniapp/pages/access-gate/index.wxml`

- [ ] **Step 1: Replace the WXML structure**

Replace the entire contents of `apps/merchant-miniapp/pages/access-gate/index.wxml` with:

```xml
<view class="access-page">
  <view class="brand-card">
    <view class="brand-mark" aria-hidden="true">
      <text class="brand-mark-main">喜</text>
      <text class="brand-mark-sub">PET</text>
    </view>
    <view class="brand-copy">
      <text class="brand-title">XiAiPet 商户端</text>
      <text class="brand-subtitle">把订单和店务整理好</text>
    </view>
  </view>

  <view class="login-card">
    <view class="login-head">
      <view>
        <text class="login-title">登录工作台</text>
        <text class="login-subtitle">账号密码登录</text>
      </view>
      <text class="role-pill">店员 / 管理员</text>
    </view>

    <view class="field-group">
      <text class="field-label">账号</text>
      <input
        class="login-input"
        value="{{username}}"
        placeholder="请输入账号"
        placeholder-class="input-placeholder"
        bindinput="handleUsernameInput"
      />
    </view>

    <view class="field-group">
      <text class="field-label">密码</text>
      <input
        class="login-input"
        value="{{password}}"
        password
        placeholder="请输入密码"
        placeholder-class="input-placeholder"
        bindinput="handlePasswordInput"
      />
    </view>

    <view class="status-strip {{accessResult}}">
      <text class="status-text">{{statusText}}</text>
    </view>

    <button class="primary-cta" loading="{{submitting}}" bindtap="handleLoginTap">
      登录
    </button>
  </view>
</view>
```

- [ ] **Step 2: Verify no visible default credential copy remains**

Run:

```bash
rg "admin|初始管理员|初始密码" apps/merchant-miniapp/pages/access-gate/index.wxml
```

Expected: no matches.

- [ ] **Step 3: Verify all required copy exists**

Run:

```bash
rg "XiAiPet 商户端|把订单和店务整理好|登录工作台|账号密码登录|店员 / 管理员|请输入账号|请输入密码" apps/merchant-miniapp/pages/access-gate/index.wxml
```

Expected: all listed strings appear in the output.

- [ ] **Step 4: Commit task 2**

```bash
git add apps/merchant-miniapp/pages/access-gate/index.wxml
git commit -m "refactor: restructure merchant login page"
```

## Task 3: Apply Warm Operations Styling

**Files:**
- Modify: `apps/merchant-miniapp/pages/access-gate/index.wxss`

- [ ] **Step 1: Replace the WXSS**

Replace the entire contents of `apps/merchant-miniapp/pages/access-gate/index.wxss` with:

```css
.access-page {
  box-sizing: border-box;
  min-height: 100vh;
  padding: 44rpx 32rpx 72rpx;
  background: #F8F1E8;
  color: #1F2A33;
}

.brand-card,
.login-card {
  box-sizing: border-box;
  width: 100%;
  border: 1rpx solid #F0E2D0;
  border-radius: 32rpx;
  background: #FFFFFF;
  box-shadow: 0 18rpx 44rpx rgba(80, 52, 22, 0.1);
}

.brand-card {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 32rpx;
}

.brand-mark {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100rpx;
  height: 100rpx;
  flex: 0 0 100rpx;
  border-radius: 30rpx;
  background: linear-gradient(135deg, #F3B56F 0%, #E98F78 54%, #2E5B73 100%);
  color: #FFFFFF;
  line-height: 1;
}

.brand-mark-main {
  font-size: 36rpx;
  font-weight: 800;
}

.brand-mark-sub {
  margin-top: 6rpx;
  font-size: 18rpx;
  font-weight: 700;
  letter-spacing: 0;
}

.brand-copy {
  min-width: 0;
  flex: 1;
}

.brand-title,
.brand-subtitle,
.login-title,
.login-subtitle,
.field-label,
.status-text,
.role-pill {
  display: block;
}

.brand-title {
  font-size: 42rpx;
  font-weight: 800;
  line-height: 1.15;
}

.brand-subtitle {
  margin-top: 10rpx;
  font-size: 24rpx;
  line-height: 1.45;
  color: #756756;
}

.login-card {
  margin-top: 24rpx;
  padding: 32rpx;
}

.login-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
  margin-bottom: 28rpx;
}

.login-title {
  font-size: 36rpx;
  font-weight: 800;
  line-height: 1.2;
}

.login-subtitle {
  margin-top: 8rpx;
  font-size: 24rpx;
  line-height: 1.35;
  color: #756756;
}

.role-pill {
  flex: 0 0 auto;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: #FFF3E6;
  color: #8A5F35;
  font-size: 22rpx;
  font-weight: 600;
  line-height: 1.2;
}

.field-group {
  margin-top: 22rpx;
}

.field-label {
  margin-bottom: 10rpx;
  color: #6A5B4B;
  font-size: 24rpx;
  font-weight: 600;
}

.login-input {
  box-sizing: border-box;
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  border: 1rpx solid #D8D0C5;
  border-radius: 20rpx;
  background: #FBFCFD;
  color: #1F2A33;
  font-size: 30rpx;
}

.input-placeholder {
  color: #9B8A78;
}

.status-strip {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  min-height: 68rpx;
  margin-top: 24rpx;
  padding: 12rpx 20rpx;
  border-radius: 16rpx;
  background: #F4F7F9;
  color: #697783;
}

.status-strip.allowed {
  background: #E9F2F5;
  color: #2E5B73;
}

.status-strip.denied {
  background: #FFF1EF;
  color: #9B342D;
}

.status-text {
  font-size: 24rpx;
  line-height: 1.45;
}

.primary-cta {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 92rpx;
  margin-top: 24rpx;
  border: none;
  border-radius: 20rpx;
  background: #2E5B73;
  color: #FFFFFF;
  font-size: 30rpx;
  font-weight: 800;
  line-height: 1;
}

.primary-cta::after {
  border: none;
}
```

- [ ] **Step 2: Check for old login classes**

Run:

```bash
rg "access-card|heading|body|meta-line" apps/merchant-miniapp/pages/access-gate
```

Expected: no matches in `index.wxml` or `index.wxss`.

- [ ] **Step 3: Check for theme colors**

Run:

```bash
rg "#F8F1E8|#2E5B73|#F3B56F|#FFF1EF" apps/merchant-miniapp/pages/access-gate/index.wxss
```

Expected: each color appears.

- [ ] **Step 4: Commit task 3**

```bash
git add apps/merchant-miniapp/pages/access-gate/index.wxss
git commit -m "style: apply warm merchant login design"
```

## Task 4: Build, Verify, And Inspect

**Files:**
- Generated: `apps/merchant-miniapp/pages/access-gate/index.js`
- Possibly generated: `apps/merchant-miniapp/src/theme/tokens.js` if theme tokens changed

- [ ] **Step 1: Run focused merchant tests**

Run:

```bash
pnpm --filter @xiaipet/merchant-miniapp test -- src/services/api-client.test.ts
```

Expected: command exits `0`; merchant login service tests pass.

- [ ] **Step 2: Run merchant typecheck**

Run:

```bash
pnpm --filter @xiaipet/merchant-miniapp typecheck
```

Expected: command exits `0`.

- [ ] **Step 3: Build merchant miniapp runtime files**

Run:

```bash
pnpm --filter @xiaipet/merchant-miniapp build
```

Expected: command exits `0` and updates `apps/merchant-miniapp/pages/access-gate/index.js`.

- [ ] **Step 4: Confirm generated JS contains updated copy**

Run:

```bash
rg "首次登录后需要修改密码|正在登录" apps/merchant-miniapp/pages/access-gate/index.js
```

Expected: both strings appear in the generated JavaScript.

- [ ] **Step 5: Manual visual inspection**

Open the merchant miniapp in WeChat DevTools and inspect `pages/access-gate/index`.

Verify:

- Brand header reads `XiAiPet 商户端`.
- No visible copy says `初始管理员账号为 admin，初始密码为 admin`.
- Brand mark uses `喜` and `PET`, not `虾`.
- Input labels are visible above fields.
- Login button is full-width and aligned with the form card.
- Status strip does not move the button when switching between neutral, error, and success text.
- Page has no horizontal scroll on iPhone-class viewport.

- [ ] **Step 6: Commit generated runtime**

```bash
git add apps/merchant-miniapp/pages/access-gate/index.js
git commit -m "build: update merchant login runtime"
```

If `index.js` did not change, skip this commit and note that the build output was already current.

## Final Verification

Run:

```bash
pnpm --filter @xiaipet/merchant-miniapp test -- src/services/api-client.test.ts
pnpm --filter @xiaipet/merchant-miniapp typecheck
pnpm --filter @xiaipet/merchant-miniapp build
git status --short
```

Expected:

- Test command exits `0`.
- Typecheck exits `0`.
- Build exits `0`.
- `git status --short` shows only unrelated pre-existing workspace card changes, or no changes if those were handled separately.

## Implementation Notes

- Do not edit authentication endpoint names or session storage.
- Do not add external UI libraries.
- Do not use “虾” anywhere in new login UI.
- Do not hide field labels and rely on placeholders only.
- Do not add marketing sections, screenshots, feature grids, or large hero copy to the login page.
