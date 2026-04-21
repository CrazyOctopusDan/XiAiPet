# Cart Page Refinement Design

Date: 2026-04-21
Project: XiAiPet
Scope: Refine the customer miniapp cart page interaction and layout so cart editing is stable, touch-friendly, and visually aligned with the rest of the shopping flow.

## Context

The current cart page already supports selection, quantity edits, spec edits, clear-cart, and checkout handoff. Functionally it is usable, but several behaviors and layout details are still below product quality:

- updating a spec can reorder or remove the edited row in surprising ways
- when a spec change would exceed stock, the current behavior can delete or collapse the row instead of warning early
- the page scrolls beyond the intended list viewport
- tap targets and control alignment are too fragile on mobile
- the inline delete affordance is too small to be safely used on a phone
- the checkout bar proportions do not match the intended design

This refinement should improve the cart page without redesigning the whole shopping flow or moving checkout responsibilities earlier than planned.

## Goals

- Keep the edited cart row visually stable after spec updates.
- Reject out-of-stock spec updates before mutating the cart row.
- Make delete behavior touch-safe by switching to swipe-to-reveal plus confirmation.
- Constrain scrolling to the list area below the select-all row.
- Tighten the layout so controls remain circular, aligned, and comfortably tappable.
- Resize the bottom checkout CTA so it occupies the right 50% of the bottom bar.

## Non-Goals

- Redesigning the overall card aesthetic or replacing the existing cart page visual language.
- Changing the checkout boundary introduced in Phase 3.
- Adding animation-heavy interaction polish beyond what is needed for reliable swipe/delete feedback.
- Changing add-to-cart semantics outside the cart page.

## Recommended Approach

Use a focused cart-page refinement rather than a full cart redesign.

- Keep the current card-based structure.
- Add stable row identity handling during spec replacement/merge.
- Add preflight stock validation before committing a spec change.
- Replace the tiny inline delete text with a swipe-reveal delete action that still requires confirmation.
- Split the page into a fixed toolbar area, a bounded scroll list, and a fixed bottom checkout bar.

This approach is preferred because it directly fixes the reported behavior without introducing a new visual system or forcing users to relearn the cart page.

## Interaction Design

### 1. Spec Update Rules

When the user edits the spec for an existing cart row:

- The app first resolves the target spec and checks whether the updated quantity can fit within the target spec stock.
- If the target spec stock is insufficient, the cart must not mutate.
- The row must remain in place with its original spec and quantity.
- The app shows:

```text
库存不足，请看看别的吧~
```

- No row deletion, silent merge, or forced quantity clamp should happen in this failure path.

### 2. Merge Behavior When Target Spec Already Exists

If the user changes a cart row to a spec that already exists as another row for the same product:

- The system merges the quantities into one row.
- The row the user actively edited keeps the visual position in the list.
- The other duplicate row disappears.
- Selection state remains logically merged and must not be lost.

This preserves spatial continuity and avoids the feeling that the row “jumped away” after editing.

### 3. Delete Interaction

Inline tiny delete text is removed as a primary action.

New flow:

- User swipes a cart row left.
- A red delete action area is revealed on the right.
- Tapping delete opens a confirmation step.
- Deletion only happens after confirmation.

The delete action must be thumb-sized and visually separate from the row content. A single accidental tap must not instantly remove the product.

### 4. Quantity Stepper

Quantity controls keep the current semantics:

- `-` reduces quantity
- `+` increases quantity
- reaching `0` removes the row through explicit decrement behavior, not through swipe logic

Visual refinements:

- the minus/plus glyphs must be vertically centered using flex alignment, not line-height hacks
- the control circles must remain perfectly circular
- the selection checkbox and other fixed-size controls must use `flex-shrink: 0`

## Layout Design

### Toolbar and Scroll Region

The list viewport begins below the `全选 / 清空` toolbar.

The page should be structured as:

1. fixed top chrome from `page-nav`
2. cart shell header with `全选 / 清空`
3. independently scrollable cart list area
4. fixed bottom checkout bar

The list itself should scroll; the shell must not continue sliding underneath the top portion in a way that makes the content appear to overscroll past the toolbar.

### Row Content Spacing

The spec chip and stock badge need an explicit gap that is a multiple of 4.

Recommended value:

- `16rpx`

This keeps spacing consistent with the rest of the miniapp and avoids the current cramped appearance.

### Delete Target Size

The revealed delete area must be large enough for phone interaction:

- full row height
- clear red background
- horizontally generous width
- centered delete label

### Bottom Bar Proportion

The bottom bar should be split into two clear zones:

- left: selected count + total price
- right: checkout button

The checkout button must occupy 50% of the right-side width allocation rather than appearing as a narrow pill detached from the total.

## Visual Rules

- Keep the existing light cart-page palette.
- Use the same vivid enabled yellow already approved elsewhere in the miniapp for active CTAs.
- Disabled states remain muted and clearly lower contrast than enabled states.
- Selection circles remain true circles with no horizontal compression.
- Row controls should prioritize alignment stability over decorative flourishes.

## Data and State Behavior

### Stable Row Ordering

Cart rows should retain a stable order key derived from their current list position unless the user explicitly removes them.

During spec replacement:

- if no merge is needed, update the row in place
- if merge is needed, preserve the edited row’s position and absorb the duplicate row into it

This may require page-level reconciliation rather than relying purely on unordered service output.

### Swipe State

Only one row should be in “delete revealed” state at a time.

Opening a new row should close any previously revealed row.

Refreshing the cart after quantity/spec/delete changes should reset swipe state so stale action panes do not remain open.

## Testing Strategy

Add or update cart-page regression coverage for:

- spec update failure due to insufficient stock keeps the original row unchanged
- merge-to-existing-spec preserves the edited row position
- swipe reveal opens delete action on one row at a time
- confirmed delete removes the row, canceled delete keeps it
- clearing the cart resets counts and total
- checkout remains blocked when no items are selected

Manual verification should also cover:

- left-swipe feel on a phone-sized viewport
- delete action tapability
- quantity button alignment
- bounded list scrolling below the toolbar
- checkout button width and visual balance

## Files Expected to Change

- `apps/customer-miniapp/pages/cart/index.ts`
- `apps/customer-miniapp/pages/cart/index.wxml`
- `apps/customer-miniapp/pages/cart/index.wxss`
- `apps/customer-miniapp/pages/cart-checkout.test.ts`

Potentially, if the existing cart service cannot support the refined merge semantics cleanly:

- `apps/customer-miniapp/src/services/cart.ts`
- `apps/customer-miniapp/src/services/cart.test.ts`

## Risks and Mitigations

### Risk: Swipe behavior becomes brittle in the mini program runtime

Mitigation:

- keep the interaction simple: one-direction reveal, one active row, no momentum effects
- use page-managed swipe state rather than complex gesture abstractions

### Risk: Service-level merge logic conflicts with page-level stable ordering

Mitigation:

- define the page as the authority for preserving visible row position after service mutations
- update tests to lock this behavior explicitly

### Risk: Delete confirmation adds friction

Mitigation:

- use swipe reveal first, then confirmation only on the destructive action
- do not add confirmation to ordinary quantity decrement behavior

## Success Criteria

- Editing spec no longer causes unexpected row deletion or row jumping.
- Insufficient-stock spec changes show `库存不足，请看看别的吧~` and leave the original row intact.
- The cart list scroll area stays below the toolbar instead of overscrolling into the top region.
- Selection circles remain round and stepper symbols are visually centered.
- The inline delete text is gone; swipe reveal plus confirmation is the only direct delete affordance.
- The checkout button visually occupies the intended right-half footprint in the bottom bar.
