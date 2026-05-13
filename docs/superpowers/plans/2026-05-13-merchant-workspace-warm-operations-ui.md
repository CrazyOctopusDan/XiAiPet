# Merchant Workspace Warm Operations UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the merchant workspace into the approved C2 “温柔运营工具型” operations hub while preserving card navigation.

**Architecture:** Keep the existing `pages/workspace` page and `getMerchantWorkspaceCards()` service boundary. Move long explanatory card copy into concise view-model fields, make each card tappable through `primaryUrl`, and rebuild the WXML/WXSS into a compact warm dashboard with aligned cards and minimal text.

**Tech Stack:** Native WeChat Mini Program WXML/WXSS, TypeScript view-model service, generated runtime JavaScript, Vitest, pnpm, TypeScript compiler.

---

## Scope

This plan implements only the merchant workspace page from `docs/superpowers/specs/2026-05-13-merchant-miniapp-warm-operations-ui-design.md`.

It includes the already-started card navigation fix because the current worktree has unstaged changes in the workspace files:

- `apps/merchant-miniapp/pages/workspace/index.wxml`
- `apps/merchant-miniapp/src/services/workspace.ts`
- `apps/merchant-miniapp/src/services/workspace.js`
- `apps/merchant-miniapp/src/services/workspace.test.ts`
- `.planning/STATE.md`

Do not revert these changes. Fold the workspace navigation changes into Task 1 and leave `.planning/STATE.md` alone unless the user explicitly asks to update planning state.

## File Structure

- Modify `apps/merchant-miniapp/src/services/workspace.ts`
  - Owns workspace card data, role filtering, concise card labels, and primary navigation URL.
- Modify `apps/merchant-miniapp/src/services/workspace.test.ts`
  - Owns view-model tests for admin/staff card visibility, primary URLs, concise text, and separated secondary actions.
- Modify `apps/merchant-miniapp/pages/workspace/index.wxml`
  - Owns the warm operations workspace structure: compact intro card, KPI chips, tappable function cards.
- Modify `apps/merchant-miniapp/pages/workspace/index.wxss`
  - Owns workspace visual system using the approved warm palette.
- Generated `apps/merchant-miniapp/src/services/workspace.js`
  - Produced by `pnpm --filter @xiaipet/merchant-miniapp build`.

## Task 1: Normalize Workspace Card View Model

**Files:**
- Modify: `apps/merchant-miniapp/src/services/workspace.ts`
- Modify: `apps/merchant-miniapp/src/services/workspace.test.ts`
- Generated later: `apps/merchant-miniapp/src/services/workspace.js`

- [ ] **Step 1: Update failing tests for the target card contract**

In `apps/merchant-miniapp/src/services/workspace.test.ts`, update or add tests so the expected admin cards are concise and every card has a `primaryUrl`.

Expected tests:

```ts
it('returns compact admin workspace cards with primary destinations', () => {
  const cards = getMerchantWorkspaceCards();

  expect(cards.map((item) => [item.id, item.title, item.badge, item.primaryUrl])).toEqual([
    ['orders', '订单', '履约', '/pages/orders/index'],
    ['staff-accounts', '员工', '管理员', '/pages/staff-accounts/index'],
    ['catalog', '商品', '双入口', '/pages/categories/index'],
    ['users', '用户', '审计', '/pages/users/index'],
    ['runtime-config', '配置', '店务', '/pages/runtime-config/index']
  ]);
});

it('keeps workspace card copy short enough for compact mobile cards', () => {
  const cards = getMerchantWorkspaceCards();

  for (const card of cards) {
    expect(card.title.length).toBeLessThanOrEqual(4);
    expect(card.subtitle.length).toBeLessThanOrEqual(10);
    expect(card.description.length).toBeLessThanOrEqual(18);
  }
});
```

Keep the existing staff visibility test and catalog two-action test, but update expected titles to `订单` and `商品`.

- [ ] **Step 2: Run the workspace test and confirm it fails before implementation**

Run:

```bash
pnpm --filter @xiaipet/merchant-miniapp test -- src/services/workspace.test.ts
```

Expected: FAIL because current titles and copy are still long.

- [ ] **Step 3: Update the workspace view model**

In `apps/merchant-miniapp/src/services/workspace.ts`, keep `primaryUrl` and `MerchantWorkspaceCardSource`, but replace the `WORKSPACE_CARDS` contents with concise C2-oriented data:

```ts
const WORKSPACE_CARDS: MerchantWorkspaceCardSource[] = [
  {
    id: 'orders',
    title: '订单',
    subtitle: '履约看板',
    description: '处理预约、制作、交付',
    badge: '履约',
    accent: '#F3B56F',
    iconToken: '单',
    actions: [
      { label: '查看订单', url: '/pages/orders/index', tone: 'primary' },
      { label: '打印设置', url: '/pages/printer-settings/index', tone: 'secondary' }
    ]
  },
  {
    id: 'staff-accounts',
    title: '员工',
    subtitle: '账号权限',
    description: '创建、停用、重置密码',
    badge: '管理员',
    accent: '#E98F78',
    iconToken: '员',
    actions: [
      { label: '管理员工', url: '/pages/staff-accounts/index', tone: 'primary' }
    ]
  },
  {
    id: 'catalog',
    title: '商品',
    subtitle: '品类与商品',
    description: '维护分类、价格、上下架',
    badge: '双入口',
    accent: '#9BCFBC',
    iconToken: '品',
    actions: [
      { label: '品类', url: '/pages/categories/index', tone: 'primary' },
      { label: '商品', url: '/pages/products/index', tone: 'secondary' }
    ]
  },
  {
    id: 'users',
    title: '用户',
    subtitle: '会员余额',
    description: '搜索会员、调整余额',
    badge: '审计',
    accent: '#8EB8D6',
    iconToken: '客',
    actions: [
      { label: '搜索用户', url: '/pages/users/index', tone: 'primary' }
    ]
  },
  {
    id: 'runtime-config',
    title: '配置',
    subtitle: '店务规则',
    description: '配送费、等级、Banner',
    badge: '店务',
    accent: '#D8BE8A',
    iconToken: '配',
    actions: [
      { label: '编辑配置', url: '/pages/runtime-config/index', tone: 'primary' }
    ]
  }
];
```

Keep the return logic:

```ts
return WORKSPACE_CARDS.filter((card) => allowedIds.has(card.id)).map((card) => ({
  ...card,
  primaryUrl: card.actions[0]?.url ?? '',
  actions: card.actions.map((action) => ({ ...action }))
}));
```

- [ ] **Step 4: Run the workspace tests**

Run:

```bash
pnpm --filter @xiaipet/merchant-miniapp test -- src/services/workspace.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

```bash
git add apps/merchant-miniapp/src/services/workspace.ts apps/merchant-miniapp/src/services/workspace.test.ts
git commit -m "refactor: compact merchant workspace cards"
```

## Task 2: Rebuild Workspace WXML

**Files:**
- Modify: `apps/merchant-miniapp/pages/workspace/index.wxml`

- [ ] **Step 1: Replace the WXML with the compact hub structure**

Replace `apps/merchant-miniapp/pages/workspace/index.wxml` with:

```xml
<view class="page">
  <view class="summary-card">
    <view class="summary-head">
      <view class="brand-mark">
        <text class="brand-mark-main">喜</text>
        <text class="brand-mark-sub">PET</text>
      </view>
      <view class="summary-copy">
        <text class="page-title">商户工作台</text>
        <text class="page-subtitle">今日店务从这里开始</text>
      </view>
    </view>

    <view class="summary-metrics">
      <view class="metric-chip">
        <text class="metric-value">订单</text>
        <text class="metric-label">优先处理</text>
      </view>
      <view class="metric-chip accent">
        <text class="metric-value">商品</text>
        <text class="metric-label">保持可售</text>
      </view>
      <view class="metric-chip">
        <text class="metric-value">用户</text>
        <text class="metric-label">余额审计</text>
      </view>
    </view>
  </view>

  <view class="section-head">
    <text class="section-title">常用入口</text>
    <text class="section-note">点击卡片进入主页面</text>
  </view>

  <view class="workspace-grid">
    <view
      class="workspace-card"
      wx:for="{{cards}}"
      wx:key="id"
      data-url="{{item.primaryUrl}}"
      bindtap="handleActionTap"
    >
      <view class="card-topline" style="background: {{item.accent}};"></view>
      <view class="card-head">
        <view class="icon-badge" style="color: {{item.accent}};">{{item.iconToken}}</view>
        <text class="card-badge">{{item.badge}}</text>
      </view>
      <text class="card-title">{{item.title}}</text>
      <text class="card-subtitle">{{item.subtitle}}</text>
      <text class="card-description">{{item.description}}</text>

      <view class="card-actions">
        <button
          wx:for="{{item.actions}}"
          wx:for-item="subItem"
          wx:key="url"
          class="{{subItem.tone === 'primary' ? 'primary-button' : 'secondary-button'}}"
          data-url="{{subItem.url}}"
          catchtap="handleActionTap"
        >
          {{subItem.label}}
        </button>
      </view>
    </view>
  </view>
</view>
```

- [ ] **Step 2: Verify long intro copy is gone**

Run:

```bash
rg "把订单、品类、商品、用户和运营配置统一收在一个|2x2|先做日常运营" apps/merchant-miniapp/pages/workspace/index.wxml
```

Expected: no matches.

- [ ] **Step 3: Verify card navigation binding remains**

Run:

```bash
rg "data-url=\"{{item.primaryUrl}}\"|catchtap=\"handleActionTap\"|wx:for-item=\"subItem\"" apps/merchant-miniapp/pages/workspace/index.wxml
```

Expected: all three patterns appear.

- [ ] **Step 4: Commit Task 2**

```bash
git add apps/merchant-miniapp/pages/workspace/index.wxml
git commit -m "refactor: rebuild merchant workspace layout"
```

## Task 3: Apply Warm Workspace Styling

**Files:**
- Modify: `apps/merchant-miniapp/pages/workspace/index.wxss`

- [ ] **Step 1: Replace the WXSS**

Replace `apps/merchant-miniapp/pages/workspace/index.wxss` with:

```css
.page {
  box-sizing: border-box;
  min-height: 100vh;
  padding: 32rpx 24rpx 80rpx;
  background: #F8F1E8;
  color: #1F2A33;
}

.summary-card,
.workspace-card {
  box-sizing: border-box;
  border: 1rpx solid #F0E2D0;
  background: #FFFFFF;
  box-shadow: 0 16rpx 38rpx rgba(80, 52, 22, 0.09);
}

.summary-card {
  padding: 28rpx;
  border-radius: 32rpx;
}

.summary-head {
  display: flex;
  align-items: center;
}

.brand-mark {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 84rpx;
  height: 84rpx;
  flex: 0 0 84rpx;
  border-radius: 26rpx;
  background: linear-gradient(135deg, #F3B56F 0%, #E98F78 54%, #2E5B73 100%);
  color: #FFFFFF;
  line-height: 1;
}

.brand-mark-main {
  font-size: 32rpx;
  font-weight: 800;
}

.brand-mark-sub {
  margin-top: 4rpx;
  font-size: 16rpx;
  font-weight: 700;
  letter-spacing: 0;
}

.summary-copy {
  min-width: 0;
  flex: 1;
  margin-left: 22rpx;
}

.page-title,
.page-subtitle,
.section-title,
.section-note,
.metric-value,
.metric-label,
.card-badge,
.card-title,
.card-subtitle,
.card-description {
  display: block;
}

.page-title {
  font-size: 42rpx;
  font-weight: 800;
  line-height: 1.15;
}

.page-subtitle {
  margin-top: 8rpx;
  color: #756756;
  font-size: 24rpx;
  line-height: 1.4;
}

.summary-metrics {
  display: flex;
  margin-top: 24rpx;
}

.metric-chip {
  box-sizing: border-box;
  flex: 1;
  min-width: 0;
  padding: 16rpx;
  border-radius: 20rpx;
  background: #F4F7F9;
}

.metric-chip + .metric-chip {
  margin-left: 12rpx;
}

.metric-chip.accent {
  background: #FFF3E6;
}

.metric-value {
  color: #1F2A33;
  font-size: 26rpx;
  font-weight: 800;
  line-height: 1.15;
}

.metric-label {
  margin-top: 6rpx;
  color: #756756;
  font-size: 20rpx;
  line-height: 1.25;
}

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin: 28rpx 4rpx 16rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 800;
  line-height: 1.2;
}

.section-note {
  margin-left: 20rpx;
  color: #756756;
  font-size: 22rpx;
  line-height: 1.2;
}

.workspace-grid {
  display: flex;
  flex-wrap: wrap;
  margin-left: -10rpx;
  margin-right: -10rpx;
}

.workspace-card {
  position: relative;
  width: calc(50% - 20rpx);
  min-height: 300rpx;
  margin: 10rpx;
  padding: 24rpx;
  border-radius: 28rpx;
  overflow: hidden;
}

.card-topline {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 8rpx;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4rpx;
}

.icon-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  flex: 0 0 64rpx;
  border-radius: 20rpx;
  background: #FFF8EF;
  font-size: 30rpx;
  font-weight: 800;
}

.card-badge {
  max-width: 112rpx;
  margin-left: 12rpx;
  padding: 6rpx 12rpx;
  border-radius: 999rpx;
  background: #F4F7F9;
  color: #697783;
  font-size: 20rpx;
  font-weight: 600;
  line-height: 1.2;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.card-title {
  margin-top: 20rpx;
  font-size: 34rpx;
  font-weight: 800;
  line-height: 1.15;
}

.card-subtitle {
  margin-top: 8rpx;
  color: #8A5F35;
  font-size: 22rpx;
  font-weight: 600;
  line-height: 1.25;
}

.card-description {
  height: 64rpx;
  margin-top: 14rpx;
  color: #697783;
  font-size: 22rpx;
  line-height: 1.45;
  overflow: hidden;
}

.card-actions {
  display: flex;
  margin-top: 20rpx;
}

.primary-button,
.secondary-button {
  box-sizing: border-box;
  min-width: 0;
  height: 64rpx;
  padding: 0 18rpx;
  border: none;
  border-radius: 16rpx;
  font-size: 24rpx;
  font-weight: 700;
  line-height: 64rpx;
}

.primary-button {
  flex: 1;
  background: #2E5B73;
  color: #FFFFFF;
}

.secondary-button {
  flex: 0 0 auto;
  margin-left: 10rpx;
  background: #F4F7F9;
  color: #2E5B73;
}

.primary-button::after,
.secondary-button::after {
  border: none;
}
```

- [ ] **Step 2: Check for `gap` compatibility**

Run:

```bash
rg "gap:" apps/merchant-miniapp/pages/workspace/index.wxss
```

Expected: no matches.

- [ ] **Step 3: Check core warm palette and fixed card sizing**

Run:

```bash
rg "#F8F1E8|#2E5B73|#F3B56F|min-height: 300rpx|height: 64rpx" apps/merchant-miniapp/pages/workspace/index.wxss
```

Expected: all listed patterns appear.

- [ ] **Step 4: Commit Task 3**

```bash
git add apps/merchant-miniapp/pages/workspace/index.wxss
git commit -m "style: apply warm merchant workspace design"
```

## Task 4: Build, Verify, And Inspect

**Files:**
- Generated: `apps/merchant-miniapp/src/services/workspace.js`

- [ ] **Step 1: Run workspace-focused tests**

Run:

```bash
pnpm --filter @xiaipet/merchant-miniapp test -- src/services/workspace.test.ts
```

Expected: command exits `0`.

- [ ] **Step 2: Typecheck**

Run:

```bash
pnpm --filter @xiaipet/merchant-miniapp typecheck
```

Expected: command exits `0`.

- [ ] **Step 3: Build runtime files**

Run:

```bash
pnpm --filter @xiaipet/merchant-miniapp build
```

Expected: command exits `0` and updates `apps/merchant-miniapp/src/services/workspace.js` if TypeScript changed.

- [ ] **Step 4: Verify generated JS includes `primaryUrl`**

Run:

```bash
rg "primaryUrl|履约看板|店务规则" apps/merchant-miniapp/src/services/workspace.js
```

Expected: all listed terms appear.

- [ ] **Step 5: Manual visual inspection**

Open the merchant miniapp in WeChat DevTools and inspect `pages/workspace/index`.

Verify:

- Header uses warm C2 palette and compact brand mark.
- No long intro paragraph remains.
- Cards use concise titles and descriptions.
- Buttons align inside cards; no uneven bottom button stacks.
- Whole card tap enters the primary page.
- Secondary actions still work for order printer settings and product list.
- Staff role still sees only order and product cards.
- No horizontal scroll on iPhone-class viewport.

- [ ] **Step 6: Commit generated workspace runtime if changed**

```bash
git add apps/merchant-miniapp/src/services/workspace.js
git commit -m "build: update merchant workspace runtime"
```

If `workspace.js` did not change, skip this commit and note that build output was already current.

## Final Verification

Run:

```bash
pnpm --filter @xiaipet/merchant-miniapp test -- src/services/workspace.test.ts
pnpm --filter @xiaipet/merchant-miniapp typecheck
pnpm --filter @xiaipet/merchant-miniapp build
git status --short
```

Expected:

- Workspace tests pass.
- Merchant typecheck passes.
- Merchant build passes.
- `git status --short` shows no remaining workspace page/service changes.

## Implementation Notes

- Do not change authentication or merchant role semantics.
- Do not use “虾” in brand UI.
- Do not reintroduce long paragraph descriptions on workspace cards.
- Do not use CSS `gap`; use margins for WeChat compatibility.
- Do not change downstream pages such as orders, products, staff accounts, users, or runtime config in this plan.
