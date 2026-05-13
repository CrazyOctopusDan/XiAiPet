# Merchant Miniapp Warm Operations UI Design

Date: 2026-05-13

## Goal

Redesign the merchant miniapp UI into a consistent, polished operations tool that still feels warm and appropriate for a pet bakery shop owner.

The current merchant pages have too much explanatory copy, uneven button placement, inconsistent card styles, and page-by-page visual drift. The redesign should start with the login page, then extend the same visual system to the workspace, account management, orders, catalog, users, printer settings, and runtime configuration pages.

## Locked Direction

Use the approved C2 direction: **温柔运营工具型**.

This direction combines:

- Warm brand feeling from the C direction.
- Operational structure from the B direction.
- Compact mobile-first layout for WeChat Mini Program screens.
- Consistent form, card, button, status, and list patterns across merchant pages.

## Brand Semantics

`XiAiPet` means **喜爱**, not “虾”.

Design rules:

- Do not use “虾” as a brand mark or icon.
- Brand language should imply care, affection, warmth, and orderly shop operations.
- A temporary compact brand mark may use `喜` plus a small `PET` caption, but it should not become decorative clutter.
- Page titles and labels should use clear merchant operations language rather than marketing copy.

## Visual System

### Color

Primary palette:

- Page background: warm cream, close to `#F8F1E8`.
- Card surface: white, close to `#FFFFFF`.
- Primary action: deep teal blue, close to `#2E5B73`.
- Primary text: near-black blue gray, close to `#1F2A33`.
- Muted text: gray brown, close to `#756756` or gray blue `#697783`.
- Warm accent: soft orange, close to `#F3B56F` or `#E98F78`.
- Error background: soft red tint, close to `#FFF1EF`.
- Error text: muted red, close to `#9B342D`.

Usage:

- Deep teal is reserved for primary buttons and important active states.
- Warm orange is used for brand areas, small status tags, section accents, and gentle emphasis.
- Avoid large multicolor gradients inside operational list pages. Gradients may appear only on the login brand mark or small decorative brand chip.

### Shape And Spacing

- Page padding: consistent edge padding, roughly `32rpx` on mobile.
- Main cards: `28rpx` to `36rpx` radius depending on page density.
- Form controls: `88rpx` height.
- Primary buttons: `92rpx` height.
- Small status pills: fixed-height or line-height controlled so rows align.
- Repeated cards should not contain long body paragraphs. Use one title, one short descriptor, and one action/status area.

### Typography

- Use the native WeChat system font stack.
- Page title: strong, compact, approximately `40rpx` to `48rpx`.
- Card title: approximately `30rpx` to `34rpx`.
- Body copy: approximately `24rpx` to `28rpx`, used sparingly.
- Label text: approximately `22rpx` to `24rpx`.
- Avoid oversized headings inside dense operational pages.

## Login Page Design

The login page becomes the first implementation target and the source pattern for merchant forms.

### Structure

The page should include:

1. Native black mini program navigation bar, unchanged.
2. Warm cream page background.
3. Brand header card with:
   - Compact warm brand mark using `喜` and `PET`.
   - Title: `XiAiPet 商户端`.
   - Subtitle: `把订单和店务整理好`.
4. Login form card with:
   - Title: `登录工作台`.
   - Subtitle: `账号密码登录`.
   - Role pill: `店员 / 管理员`.
   - Account field.
   - Password field.
   - Fixed status/help strip.
   - Full-width primary login button.

### Copy

Use concise copy:

- Account placeholder: `请输入账号`.
- Password placeholder: `请输入密码`.
- Neutral status: `首次登录后需要修改密码`.
- Missing fields: `请输入账号和密码`.
- Loading: `正在登录`.
- Success: `登录成功`.
- First-login redirect: `首次登录需要修改密码`.
- Error prefix: `登录失败：`.

Avoid long explanations about default admin credentials on the visible UI. If test credentials are still needed during development, keep them in docs or dev notes, not in the production-facing login screen.

### States

The status strip has a stable position and should not change layout height between states:

- Neutral/help: gray blue text on pale gray background.
- Error: red text on soft red background.
- Success: teal text on pale teal background.
- Loading: button shows loading and keeps the same height.

## Merchant Page System

After login, all merchant pages should follow the same pattern:

- Warm cream page background.
- White content cards.
- Short page header, no long instructional paragraphs.
- One primary action per section.
- Secondary actions as outline, ghost, or compact text buttons.
- Lists use aligned rows with fixed action columns where possible.
- Cards and rows should not mix unrelated button heights.
- Empty states should be concise and action-oriented.

### Workspace

The workspace should become a compact operations hub:

- Top summary card: today’s core work.
- Two or three small KPI chips if useful, such as pending orders or in-progress orders.
- Function cards with short labels: `订单`, `商品`, `员工`, `用户`, `配置`.
- Remove long instructional descriptions from cards.
- Keep card actions aligned at the bottom or make the whole card the action.

### Staff Accounts

The staff account page should use a form card plus list rows:

- Create account form should be compact.
- The `创建` button should align with the input height or sit as a full-width action below fields.
- Account rows should expose role, status, and password state as small tags.
- Admin operations should not create visual clutter.

### Orders And Catalog

Operational list pages should favor scanability:

- Use segmented filters or compact status tabs.
- Keep order/product row actions aligned.
- Show only the fields needed for the current decision.
- Move details into detail pages instead of explaining everything in list cards.

### Runtime Configuration

Configuration pages should use section cards:

- Each section has a short title and save state.
- Inputs are grouped by task, not by database field order.
- Save buttons stay predictable and aligned.

## Accessibility And Interaction

- Inputs must have visible labels, not placeholder-only meaning.
- Touch targets should be at least `88rpx` high for form controls and primary actions.
- Error messages must be visible text, not only red borders.
- Loading and disabled states must preserve layout size.
- Color is not the only status indicator; use text labels as well.
- Avoid decorative elements that reduce contrast or interfere with reading.

## Implementation Notes

- Start with the login page files:
  - `apps/merchant-miniapp/pages/access-gate/index.wxml`
  - `apps/merchant-miniapp/pages/access-gate/index.wxss`
  - `apps/merchant-miniapp/pages/access-gate/index.ts`
  - generated runtime `index.js` after build
- Update shared merchant theme tokens in `apps/merchant-miniapp/src/theme/tokens.ts` only if the implementation uses them consistently.
- Do not introduce an external UI component library for this redesign.
- Keep WeChat Mini Program native WXML/WXSS patterns.
- Preserve current login behavior and routing; this is visual and interaction structure work, not an authentication rewrite.

## Testing And Verification

For the login page implementation:

- Existing merchant login service/page behavior must continue to pass.
- Typecheck the merchant miniapp.
- Build the merchant miniapp so generated runtime JavaScript is updated.
- Manually inspect in WeChat DevTools or a visual equivalent at mobile width.

For later page migrations:

- Each redesigned page should have either existing tests updated or focused service/view-model tests added when behavior changes.
- Visual verification should check 375px-class mobile width, iPhone simulator dimensions, long text, empty states, loading states, and error states.

## Out Of Scope

- Redesigning the customer miniapp.
- Changing merchant authentication rules.
- Adding new merchant features.
- Creating a full brand identity package or final logo.
- Replacing the native WeChat navigation bar.
- Adding animation-heavy or marketing-page behavior to operational pages.
