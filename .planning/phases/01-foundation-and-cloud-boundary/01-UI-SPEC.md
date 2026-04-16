---
phase: 1
slug: foundation-and-cloud-boundary
status: approved
shadcn_initialized: false
preset: none
created: 2026-04-16
reviewed_at: 2026-04-16T14:22:57+08:00
---

# Phase 1 — UI Design Contract

> Visual and interaction contract for frontend phases. Generated for the Phase 1 planning gate and scoped only to app shells, identity entry, and environment-safe foundation work.

---

## Scope Guard

- This contract covers only the customer miniapp shell, merchant miniapp shell, login/bootstrap states, whitelist access states, and shared visual primitives needed in Phase 1.
- This contract does not define catalog cards, cart patterns, checkout layouts, payment feedback, or merchant CRUD forms from later phases.
- Visual direction is intentionally split:
  - Customer miniapp: brand-like, warm, welcoming, low-friction.
  - Merchant miniapp: tool-like, calm, structured, operational.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none |
| Preset | not applicable |
| Component library | none |
| Icon library | project-owned outline icon set exported as local assets |
| Font | `PingFang SC`, `Hiragino Sans GB`, `sans-serif` |

### Phase 1 Component Inventory

- Shared shell primitives: page container, section header, status card, primary button, secondary button, empty state, inline notice, loading block.
- Customer-only primitives: welcome hero, login status card, environment badge.
- Merchant-only primitives: access gate card, whitelist status badge, compact workbench header.
- Native WeChat components remain the base layer; Phase 1 does not introduce any third-party registry or runtime component source.

---

## Spacing Scale

Declared values (must be multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, badge padding, inline separators |
| sm | 8px | Compact form item spacing, small tag breathing room |
| md | 16px | Default card padding, vertical rhythm inside modules |
| lg | 24px | Section padding, shell card spacing |
| xl | 32px | Hero-to-content gap, major card padding |
| 2xl | 48px | Page section breaks, auth state separation |
| 3xl | 64px | First-screen vertical breathing room on launch pages |

Exceptions: none. Minimum touch target is `44px`; achieve this with internal padding, not non-standard spacing tokens.

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 | 1.6 |
| Label | 14px | 600 | 1.4 |
| Heading | 20px | 600 | 1.3 |
| Display | 28px | 600 | 1.15 |

Typography rules:

- Exactly two weights are allowed in Phase 1: `400` and `600`.
- Customer pages can use `Display` once per first screen; merchant pages must not use `Display` more than once above the fold.
- Helper text, badges, and environment labels use `Label`; do not introduce a smaller font size in Phase 1.

---

## Color

Both apps must keep an explicit `60 / 30 / 10` split. The two mini programs are separate products, so each app is allowed one accent color only inside its own surface system.

### Customer Theme

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#F6E396` | Page background, launch background, large empty areas |
| Secondary (30%) | `#E7D7C3` | Cards, tab shell, non-primary badges, grouped sections |
| Accent (10%) | `#D96C4E` | Primary CTA, active tab indicator, progress highlight, login success emphasis |
| Destructive | `#BF4A3A` | Destructive or blocking messages only |

Accent reserved for: primary CTA, active tab or active segment, one hero highlight, success status emphasis after login.

### Merchant Theme

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#F4F6F8` | Workspace background, page base, list background |
| Secondary (30%) | `#DDE4EA` | Tool panels, section cards, filter bars, summary modules |
| Accent (10%) | `#2E5B73` | Primary action, active section marker, whitelist-approved state, focus outline |
| Destructive | `#B6463A` | Destructive or blocking messages only |

Accent reserved for: primary action button, active navigation item, whitelist-approved badge, selected panel outline.

Color rules:

- Do not use accent on every clickable text element; secondary text links stay neutral.
- Success information in Phase 1 is represented by copy plus the app accent, not by adding a new green semantic color.
- Error or blocked states must use the destructive color only on title/icon/emphasis, not full-page fills.

---

## Visual Hierarchy

### Customer Miniapp

- Primary focal point: the welcome headline plus one clear `微信授权登录` button.
- Secondary focal point: the identity-status card showing "已连接微信身份" or "等待授权".
- Tertiary information: environment badge, CloudBase connection hints, and non-blocking helper text.

### Merchant Miniapp

- Primary focal point: access gate card with explicit status result.
- Secondary focal point: the `验证商户身份` action and whitelist explanation.
- Tertiary information: current environment, miniapp version, and shell-level navigation labels.

Visual hierarchy rules:

- One primary card per screen above the fold.
- Do not stack multiple equal-weight cards on the first screen.
- Icons may support labels but must never replace labels for primary actions.

---

## Interaction Contract

### Page Shell

- Safe area padding is mandatory at the top and bottom of both apps.
- Page content width should feel edge-to-edge but cards must keep `md` or `lg` horizontal padding.
- Navigation labels must be text-first; Phase 1 must not rely on icon-only navigation.

### State Patterns

- Loading: use skeleton blocks or a status card with `正在同步微信身份` or `正在校验商户权限`; never use a bare spinner on an empty page.
- Empty: use one illustration block or icon plus heading, one sentence of explanation, and one next-step CTA.
- Unauthorized: merchant app uses a blocked state card with a destructive accent title and a neutral explanation body.
- Error: show what failed, whether retry is safe, and what the user should do next.

### Motion

- Allow only two motion types in Phase 1: first-screen fade-up on load and button press opacity feedback.
- Motion duration stays within `180ms` to `240ms`.
- No decorative looping animation in auth or access-gate screens.

### Accessibility

- Minimum touch target: `44px`.
- Any icon used without adjacent label must expose a text label in the same tappable area; preferred default is icon plus label.
- Customer contrast should stay soft but body text must remain readable on warm backgrounds; merchant contrast should prioritize clarity over atmosphere.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | Customer: `微信授权登录`; Merchant: `验证商户身份` |
| Empty state heading | Customer: `先连接微信身份，再开始逛店`; Merchant: `当前账号还没有商户权限` |
| Empty state body | Customer: `完成登录后，我们会为你恢复账号基础身份，后续资料按需补齐。`; Merchant: `请联系店主把当前微信账号加入白名单，再重新进入商户端。` |
| Error state | `身份同步失败，请下拉重试；如果仍未恢复，请重新进入小程序。` |
| Destructive confirmation | none in this phase; if logout entry is exposed, copy must be `退出当前账号后重新验证身份？` |

Copy rules:

- Primary actions must always use verb plus noun; do not use `确定`, `提交`, `保存`, or `继续`.
- Merchant blocked states must state the cause directly: no permission, no whitelist, or sync failed.
- Customer helper text should reduce friction, not threaten the user with technical jargon.

---

## Screen-Level Contracts

### Customer Launch / Bootstrap Screen

- Mood: warm, friendly, slightly branded.
- Above-the-fold composition order: display headline -> supporting line -> primary CTA -> identity status card.
- The first successful login state should switch from invitation copy to reassurance copy, not to a generic success toast only.

### Merchant Access Gate Screen

- Mood: structured, trustworthy, operational.
- Above-the-fold composition order: heading -> access status card -> primary action -> environment/meta line.
- If access is denied, keep the CTA available for retry only when a new validation request is meaningful; otherwise show guidance without false hope.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not required |
| third-party registries | none | not applicable |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-04-16
