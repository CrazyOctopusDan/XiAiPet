# Customer Miniapp Floating Order Tabbar Design

Date: 2026-04-20
Project: XiAiPet
Scope: Refresh the customer miniapp bottom navigation for the three first-level pages so the left item is Home, the right item is Profile, and the center item is a larger floating Order entry without text.

## Context

The current customer miniapp repeats the same bottom tab bar markup and styles inside three pages:

- `pages/home/index`
- `pages/orders/index`
- `pages/profile/index`

That duplicated structure already creates drift risk, and it also blocks the desired visual treatment. The requested design is not a standard flat tab bar. It needs a center Order button that is visibly larger, floats higher than the side items, and becomes the dominant primary navigation entry while keeping Home and Profile readable and stable.

The approved visual direction is the refined A2 variant from the browser mockup review:

- Home on the left with label
- Profile on the right with label
- Order in the middle as an icon-only floating circle
- Center button larger than the current one
- Center button raised higher than the earlier mockup pass

## Goals

- Match the approved A2 bottom navigation direction closely enough that the implemented miniapp feels like the chosen mockup.
- Keep the scope limited to the three first-level customer pages only.
- Replace the repeated page-level tab bar markup with one reusable component.
- Preserve reliable page switching and active-state feedback.
- Avoid any dependency on native mini program `tabBar` configuration for this change.

## Non-Goals

- Redesigning the rest of the Home, Orders, or Profile page content.
- Adding the custom tab bar to secondary pages such as order detail, catalog, cart, pets, or address pages.
- Replatforming navigation onto native `tabBar` or `custom-tab-bar`.
- Introducing new business behavior beyond the approved navigation structure and styling.

## Recommended Approach

Implement a shared customer miniapp component, `custom-tabbar`, and use it from the three first-level pages.

This is preferred over keeping three in-page copies because:

- style changes stop drifting across pages
- active-state logic lives in one place
- the floating center button only needs to be solved once
- later icon or spacing refinement becomes low-risk

This is also preferred over switching to native `tabBar` now because the current app does not use that navigation model yet, and this task is visual, not architectural.

## Component Contract

### Name

`apps/customer-miniapp/components/custom-tabbar`

### Inputs

- `active`: `'home' | 'orders' | 'profile'`

### Responsibilities

- Render the three navigation targets in one consistent structure.
- Show text labels for Home and Profile only.
- Show an icon-only floating center Order entry.
- Apply the selected state to the currently active item.
- Perform page switching between the three first-level pages.

### Navigation Rules

- Tapping Home navigates to `/pages/home/index`
- Tapping Orders navigates to `/pages/orders/index`
- Tapping Profile navigates to `/pages/profile/index`
- Tapping the already active page does nothing
- The component is used only on those three page roots

Navigation should keep the existing page-switch behavior style already used by these pages unless implementation planning finds a stricter mini program requirement. The design intent is page switching without exposing extra back-stack noise to the user.

## Visual Design

### Overall Structure

- Bottom bar stays fixed to the viewport bottom.
- The base bar remains a warm cream surface that fits the current product palette.
- The side items sit on the base bar baseline.
- The center item breaks that baseline and floats upward.

### Side Items

- Home stays on the left.
- Profile stays on the right.
- Both side items keep icon plus Chinese label.
- Side items should remain visually lighter than the center entry.
- Active side label uses the warm highlighted color already established in the current design language.

### Center Order Entry

- No Chinese text under or around the center Order entry.
- Circular shape, not pill-shaped.
- Noticeably larger than the side item icon container.
- Raised above the side-item baseline enough to read as the primary action in the bar.
- Uses the warm yellow brand accent chosen in the current customer pages.
- Includes a document/order icon with strong contrast against the button surface.
- Keeps a cream edge ring or equivalent separation treatment so the circle feels detached from the bar instead of visually sinking into it.

### Relative Proportions

The implementation should preserve these relationships even if final `rpx` values change during device tuning:

- center button diameter is materially larger than the current implementation
- center button top edge sits clearly above the side icons
- side labels remain legible and do not collide with the floating circle
- bottom safe-area padding still feels balanced after the larger center button is introduced

## Layout and Spacing Requirements

- The three pages must keep enough bottom padding so scrollable content is never hidden behind the fixed bar.
- The required bottom padding should account for:
  - the fixed bar body
  - the safe area inset
  - the extra visual height created by the raised center button
- The center button must not clip on smaller devices.
- The bar should remain horizontally balanced even though the middle item is larger.

## Interaction Requirements

- Home and Profile show labels at all times.
- Orders never shows a text label in the tab bar.
- Active page feedback must remain obvious.
- Taps on all three targets should have a stable pressed state without causing layout shift.
- The floating button should feel clickable without introducing exaggerated animation.

## Page Adoption Plan

### Home Page

- Remove the inline tab bar markup.
- Render the shared component with `active="home"`.

### Orders Page

- Remove the inline tab bar markup.
- Render the shared component with `active="orders"`.

### Profile Page

- Remove the inline tab bar markup.
- Render the shared component with `active="profile"`.

### Secondary Pages

- No adoption in this task.
- Existing secondary-page navigation remains unchanged.

## Implementation Notes

- The component should own its own WXML, WXSS, JS, and JSON files.
- Page-level duplicated tab bar style blocks should be deleted after migration instead of left behind unused.
- Shared icon rendering can be done with pure CSS shapes, local image assets, or inline-friendly mini program structure depending on implementation convenience; the critical requirement is consistent visual output, not a specific icon technology.
- The component should avoid relying on unsupported CSS behavior in WeChat mini programs. Favor straightforward positioning and stacking over fragile effects.

## Verification

- Home, Orders, and Profile all render the same shared bottom navigation component.
- Home and Profile labels remain visible.
- Orders shows no label and is represented only by the floating icon button.
- The center Order entry is visibly larger and higher than the side items.
- Active page highlighting is correct on all three root pages.
- Content on each root page is still fully readable above the fixed bar.
- The component respects bottom safe area on devices with inset areas.
- Repeated tab bar markup and duplicate tab bar WXSS blocks are removed from the three pages.

## Risks and Watchpoints

- If the floating button is raised without increasing page bottom padding, lower content can become visually cramped or obscured.
- If the component keeps page switching logic that differs from current page assumptions, the user may see undesirable navigation stack behavior.
- If each page keeps local overrides after migration, the shared component will drift and the refactor will lose its value.

## Recommended Next Step

Create an implementation plan that:

- introduces the shared `custom-tabbar` component
- migrates the three first-level pages to it
- tunes the final `rpx` values against the approved A2 proportions
- verifies layout and active-state behavior on the customer miniapp pages
