# Cart Page Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the customer miniapp cart page so spec edits are stable, insufficient-stock updates fail safely, swipe-to-delete is touch-friendly, scrolling is bounded below the toolbar, and the bottom checkout bar matches the approved layout.

**Architecture:** Keep the existing cart page and shared cart service, but add explicit service-level preflight validation plus page-level row-order reconciliation. The cart page becomes responsible for bounded list scrolling, swipe reveal state, and delete confirmation, while the service remains responsible for cart mutation correctness.

**Tech Stack:** WeChat Mini Program (`Page`, WXML, WXSS), TypeScript, Vitest, shared cart service in `apps/customer-miniapp/src/services/cart.ts`

---

## File Map

### Existing files to modify

- `apps/customer-miniapp/src/services/cart.ts`
  - Add a preflight helper for spec replacement and extend `updateCartItemSpec` so callers can preserve the edited row position instead of relying on unordered cart output.
- `apps/customer-miniapp/src/services/cart.test.ts`
  - Lock insufficient-stock spec updates and merge semantics.
- `apps/customer-miniapp/pages/cart/index.ts`
  - Add bounded scroll state, swipe reveal state, delete confirmation flow, and page-level row reconciliation after spec edits.
- `apps/customer-miniapp/pages/cart/index.wxml`
  - Split the shell into toolbar, independently scrollable list, fixed bottom bar, and swipe-delete row structure.
- `apps/customer-miniapp/pages/cart/index.wxss`
  - Fix scroll region, circle shrink behavior, stepper alignment, gap spacing, swipe delete sizing, and checkout bar width.
- `apps/customer-miniapp/pages/cart-checkout.test.ts`
  - Add regression tests for insufficient-stock spec updates, row-position preservation, swipe-delete confirmation, and guarded checkout behavior.

### No new runtime files expected

- Use existing cart page, service, and test files only.
- Use built-in Mini Program primitives instead of introducing a swipe library.

---

### Task 1: Harden cart service spec-update semantics

**Files:**
- Modify: `apps/customer-miniapp/src/services/cart.ts`
- Test: `apps/customer-miniapp/src/services/cart.test.ts`

- [ ] **Step 1: Write the failing service tests**

Add two tests to `apps/customer-miniapp/src/services/cart.test.ts` after the existing spec-switch coverage:

```ts
  it('rejects a spec switch before mutating when target stock cannot fit the current quantity', () => {
    const product = getProductById('ocean-party');

    if (!product || product.specs.length < 2) {
      throw new Error('missing spec product fixture');
    }

    const firstSpecId = product.specs[0]!.id;
    const secondSpecId = product.specs[1]!.id;

    addCartItem(product, firstSpecId, 4);
    addCartItem(product, secondSpecId, product.stock);

    const sourceRow = getCartItems().find((item) => item.specId === firstSpecId);

    if (!sourceRow) {
      throw new Error('missing source cart row');
    }

    const before = getCartItems().map((item) => ({
      id: item.id,
      specId: item.specId,
      quantity: item.quantity
    }));

    const result = updateCartItemSpec(sourceRow.id, product, secondSpecId);

    expect(result.item).toBe(null);
    expect(result.capped).toBe(true);
    expect(result.replacedItemId).toBe(null);
    expect(getCartItems().map((item) => ({
      id: item.id,
      specId: item.specId,
      quantity: item.quantity
    }))).toEqual(before);
  });

  it('returns the surviving row identity when a spec switch merges into an existing row', () => {
    const product = getProductById('ocean-party');

    if (!product || product.specs.length < 2) {
      throw new Error('missing spec product fixture');
    }

    const firstSpecId = product.specs[0]!.id;
    const secondSpecId = product.specs[1]!.id;

    addCartItem(product, firstSpecId, 1);
    addCartItem(product, secondSpecId, 2);

    const sourceRow = getCartItems().find((item) => item.specId === firstSpecId);

    if (!sourceRow) {
      throw new Error('missing source cart row');
    }

    const result = updateCartItemSpec(sourceRow.id, product, secondSpecId) as {
      item: { id: string; quantity: number } | null;
      replacedItemId: string | null;
      mergedFromItemId?: string | null;
      capped?: boolean;
    };

    expect(result.item?.quantity).toBe(3);
    expect(result.replacedItemId).toBe(sourceRow.id);
    expect(result.mergedFromItemId).not.toBe(null);
  });
```

- [ ] **Step 2: Run service tests to verify they fail**

Run:

```bash
pnpm --filter @xiaipet/customer-miniapp exec vitest run --config vitest.config.ts src/services/cart.test.ts
```

Expected:

- FAIL because `updateCartItemSpec` currently mutates or merges immediately and does not expose enough information for safe page-level reconciliation.

- [ ] **Step 3: Implement preflight validation and richer result metadata**

Update `apps/customer-miniapp/src/services/cart.ts` so spec changes can be validated before mutation and merged rows can be reconciled by the page:

```ts
interface CartSpecUpdateResult {
  item: CartItem | null;
  replacedItemId: string | null;
  mergedFromItemId: string | null;
  capped: boolean;
}

function canMergeQuantity(targetQuantity: number, incomingQuantity: number, stock: number) {
  return targetQuantity + incomingQuantity <= stock;
}

export function updateCartItemSpec(itemId: string, product: CatalogProduct, specId: string): CartSpecUpdateResult {
  const item = cartItems.find((entry) => entry.id === itemId) ?? null;

  if (!item) {
    return { item: null, replacedItemId: null, mergedFromItemId: null, capped: false };
  }

  const resolvedSpec = resolveSpec(product, specId);
  const nextItemId = buildCartItemId(product.id, resolvedSpec.specId);

  if (item.id === nextItemId) {
    return { item, replacedItemId: null, mergedFromItemId: null, capped: false };
  }

  const targetItem = cartItems.find((entry) => entry.id === nextItemId) ?? null;

  if (targetItem && !canMergeQuantity(targetItem.quantity, item.quantity, product.stock)) {
    return { item: null, replacedItemId: null, mergedFromItemId: null, capped: true };
  }

  if (!targetItem && item.quantity > product.stock) {
    return { item: null, replacedItemId: null, mergedFromItemId: null, capped: true };
  }

  const mergedSelected = item.selected || targetItem?.selected || false;
  const replacedItemId = item.id;
  const mergedFromItemId = targetItem?.id ?? null;

  removeCartItem(item.id);
  const result = addCartItem(product, resolvedSpec.specId, item.quantity);

  if (result.item) {
    result.item.selected = mergedSelected;
  }

  return {
    item: result.item,
    replacedItemId,
    mergedFromItemId,
    capped: result.capped
  };
}
```

- [ ] **Step 4: Run service tests to verify they pass**

Run:

```bash
pnpm --filter @xiaipet/customer-miniapp exec vitest run --config vitest.config.ts src/services/cart.test.ts
```

Expected:

- PASS for all cart service tests, including the two new spec-update tests.

- [ ] **Step 5: Commit service semantics**

```bash
git add apps/customer-miniapp/src/services/cart.ts apps/customer-miniapp/src/services/cart.test.ts
git commit -m "fix: harden cart spec update semantics"
```

---

### Task 2: Add stable row reconciliation and swipe-delete page state

**Files:**
- Modify: `apps/customer-miniapp/pages/cart/index.ts`
- Test: `apps/customer-miniapp/pages/cart-checkout.test.ts`

- [ ] **Step 1: Write failing cart-page tests for row stability, stock warning, and delete confirmation**

Append tests to `apps/customer-miniapp/pages/cart-checkout.test.ts`:

```ts
  it('keeps the edited row in place when a spec update merges into an existing row', async () => {
    const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/cart/index.ts');
    const { getProductById } = await import('../src/services/catalog');
    const { addCartItem, clearCart } = await import('../src/services/cart');

    clearCart();

    const product = getProductById('ocean-party');

    if (!product || product.specs.length < 2) {
      throw new Error('missing product fixture');
    }

    addCartItem(product, product.specs[0]!.id, 1);
    addCartItem(product, product.specs[1]!.id, 2);

    const instance = createPageInstance(page);
    instance.onShow();

    const firstRowId = instance.data.items[0].id;

    instance.handleOpenSpecModal({ currentTarget: { dataset: { itemId: firstRowId } } });
    instance.handleEditingSpecTap({ currentTarget: { dataset: { specId: product.specs[1]!.id } } });
    instance.handleConfirmSpec();

    expect(instance.data.items[0].specId).toBe(product.specs[1]!.id);
    expect(instance.data.items[0].quantity).toBe(3);
  });

  it('shows stock warning and leaves the row unchanged when a spec update would exceed stock', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/cart/index.ts');
    const { getProductById } = await import('../src/services/catalog');
    const { addCartItem, clearCart } = await import('../src/services/cart');

    clearCart();

    const product = getProductById('ocean-party');

    if (!product || product.specs.length < 2) {
      throw new Error('missing product fixture');
    }

    addCartItem(product, product.specs[0]!.id, 4);
    addCartItem(product, product.specs[1]!.id, product.stock);

    const instance = createPageInstance(page);
    instance.onShow();

    const sourceRow = instance.data.items.find((item: { specId: string }) => item.specId === product.specs[0]!.id);

    instance.handleOpenSpecModal({ currentTarget: { dataset: { itemId: sourceRow.id } } });
    instance.handleEditingSpecTap({ currentTarget: { dataset: { specId: product.specs[1]!.id } } });
    instance.handleConfirmSpec();

    expect(wx.showToast).toHaveBeenCalledWith({ title: '库存不足，请看看别的吧~', icon: 'none' });
    expect(instance.data.items.find((item: { id: string }) => item.id === sourceRow.id)?.specId).toBe(product.specs[0]!.id);
  });

  it('reveals delete state for one row at a time and only removes after confirmation', async () => {
    const { page, wx } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/cart/index.ts');
    const { getProductById } = await import('../src/services/catalog');
    const { addCartItem, clearCart } = await import('../src/services/cart');

    wx.showModal = vi.fn().mockResolvedValue({ confirm: true, cancel: false });

    clearCart();

    const a = getProductById('sea-sponge');
    const b = getProductById('ocean-party');

    if (!a || !b) {
      throw new Error('missing product fixtures');
    }

    addCartItem(a, '', 1);
    addCartItem(b, b.specs[0]!.id, 1);

    const instance = createPageInstance(page);
    instance.onShow();

    instance.handleRowSwipeStart({ currentTarget: { dataset: { itemId: instance.data.items[0].id } }, touches: [{ clientX: 120 }] });
    instance.handleRowSwipeMove({ currentTarget: { dataset: { itemId: instance.data.items[0].id } }, touches: [{ clientX: 20 }] });
    instance.handleRowSwipeEnd({ currentTarget: { dataset: { itemId: instance.data.items[0].id } } });

    expect(instance.data.swipedItemId).toBe(instance.data.items[0].id);

    await instance.handleRequestDelete({ currentTarget: { dataset: { itemId: instance.data.items[0].id } } });

    expect(wx.showModal).toHaveBeenCalled();
    expect(instance.data.items).toHaveLength(1);
  });
```

- [ ] **Step 2: Run cart-page tests to verify failure**

Run:

```bash
pnpm --filter @xiaipet/customer-miniapp exec vitest run --config vitest.config.ts pages/cart-checkout.test.ts
```

Expected:

- FAIL because the cart page has no swipe state, no delete confirmation, and no row-order reconciliation after spec updates.

- [ ] **Step 3: Implement cart-page state and handlers**

Extend `apps/customer-miniapp/pages/cart/index.ts` with stable display reconciliation and swipe/delete state:

```ts
interface CartPageData {
  items: CartItem[];
  cartCount: number;
  selectedTotalPrice: number;
  selectedCount: number;
  isAllSelected: boolean;
  showSpecModal: boolean;
  editingItem: CartItem | null;
  editingSpecId: string;
  swipedItemId: string;
}

interface CartPageInstance {
  data: CartPageData;
  _swipeStartX?: number;
  setData(data: Record<string, unknown>, callback?: () => void): void;
  refreshCart(previousItems?: CartItem[]): void;
  reconcileItems(nextItems: CartItem[], previousItems: CartItem[]): CartItem[];
}

reconcileItems(this: CartPageInstance, nextItems: CartItem[], previousItems: CartItem[] = []) {
  if (!previousItems.length) {
    return nextItems;
  }

  const byId = new Map(nextItems.map((item) => [item.id, item]));
  const ordered: CartItem[] = [];

  previousItems.forEach((item) => {
    const next = byId.get(item.id);
    if (next) {
      ordered.push(next);
      byId.delete(item.id);
    }
  });

  byId.forEach((item) => {
    ordered.push(item);
  });

  return ordered;
}

handleConfirmSpec(this: CartPageInstance) {
  const editingItem = this.data.editingItem;

  if (!editingItem) {
    return;
  }

  const product = getProductById(editingItem.productId);

  if (!product) {
    return;
  }

  const previousItems = [...this.data.items];
  const previousIndex = previousItems.findIndex((item) => item.id === editingItem.id);
  const result = updateCartItemSpec(editingItem.id, product, this.data.editingSpecId);

  this.setData({
    showSpecModal: false,
    editingItem: null,
    editingSpecId: '',
    swipedItemId: ''
  });

  if (!result.item && result.capped) {
    wx.showToast({ title: '库存不足，请看看别的吧~', icon: 'none' });
    return;
  }

  const nextItems = [...getCartItems()];

  if (result.item && result.replacedItemId && previousIndex >= 0) {
    const filtered = nextItems.filter((item) => item.id !== result.item!.id);
    filtered.splice(previousIndex, 0, result.item);
    this.refreshCart(filtered);
    return;
  }

  this.refreshCart(nextItems);
}

handleRowSwipeStart(this: CartPageInstance, event: { touches?: Array<{ clientX: number }> }) {
  this._swipeStartX = event.touches?.[0]?.clientX ?? 0;
}

handleRowSwipeMove(this: CartPageInstance, event: { currentTarget?: { dataset?: { itemId?: string } }; touches?: Array<{ clientX: number }> }) {
  const itemId = event.currentTarget?.dataset?.itemId;
  const currentX = event.touches?.[0]?.clientX ?? 0;

  if (!itemId || this._swipeStartX === undefined) {
    return;
  }

  if (this._swipeStartX - currentX > 48) {
    this.setData({ swipedItemId: itemId });
  }
}

handleRowSwipeEnd(this: CartPageInstance) {
  this._swipeStartX = undefined;
}

async handleRequestDelete(this: CartPageInstance, event: { currentTarget?: { dataset?: { itemId?: string } } }) {
  const itemId = event.currentTarget?.dataset?.itemId;

  if (!itemId) {
    return;
  }

  const result = await wx.showModal({
    title: '删除商品',
    content: '确认把这个商品从购物车中删除吗？',
    confirmText: '删除',
    confirmColor: '#FF3B30'
  });

  if (!result.confirm) {
    return;
  }

  removeCartItem(itemId);
  this.setData({ swipedItemId: '' });
  this.refreshCart();
}
```

- [ ] **Step 4: Run cart-page tests to verify they pass**

Run:

```bash
pnpm --filter @xiaipet/customer-miniapp exec vitest run --config vitest.config.ts pages/cart-checkout.test.ts
```

Expected:

- PASS for cart clear, checkout guard, plus the new spec-update and swipe-delete regressions.

- [ ] **Step 5: Commit page-state logic**

```bash
git add apps/customer-miniapp/pages/cart/index.ts apps/customer-miniapp/pages/cart-checkout.test.ts
git commit -m "fix: stabilize cart row editing and delete flow"
```

---

### Task 3: Rebuild cart page structure and styling

**Files:**
- Modify: `apps/customer-miniapp/pages/cart/index.wxml`
- Modify: `apps/customer-miniapp/pages/cart/index.wxss`
- Test: `apps/customer-miniapp/pages/cart-checkout.test.ts`

- [ ] **Step 1: Write the failing structural assertions**

Extend `apps/customer-miniapp/pages/cart-checkout.test.ts` with assertions that depend on new data/state values:

```ts
  it('marks checkout disabled when no items are selected after deselecting all', async () => {
    const { page } = await loadPageModule('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/pages/cart/index.ts');
    const { getProductById } = await import('../src/services/catalog');
    const { addCartItem, clearCart } = await import('../src/services/cart');

    clearCart();

    const product = getProductById('sea-sponge');

    if (!product) {
      throw new Error('missing product fixture');
    }

    addCartItem(product, '', 1);

    const instance = createPageInstance(page);
    instance.onShow();
    instance.handleToggleAll();

    expect(instance.data.selectedCount).toBe(0);
    expect(instance.data.isAllSelected).toBe(false);
  });
```

- [ ] **Step 2: Run the focused cart tests**

Run:

```bash
pnpm --filter @xiaipet/customer-miniapp exec vitest run --config vitest.config.ts pages/cart-checkout.test.ts
```

Expected:

- PASS or unchanged. This step guards that the layout refactor does not require more page-state changes before touching markup.

- [ ] **Step 3: Rewrite cart markup for bounded scrolling and swipe reveal**

Update `apps/customer-miniapp/pages/cart/index.wxml` to this structure:

```xml
<view class="cart-page">
  <page-nav />

  <view class="cart-shell" wx:if="{{items.length}}">
    <view class="cart-toolbar">
      <view class="select-all" bindtap="handleToggleAll">
        <view class="checkbox {{isAllSelected ? 'active' : ''}}">{{isAllSelected ? '✓' : ''}}</view>
        <text class="select-all-label">全选</text>
      </view>
      <text class="clear-action" bindtap="handleClearCart">清空</text>
    </view>

    <scroll-view class="cart-list-scroll" scroll-y>
      <view class="cart-list">
        <view class="cart-swipe-row" wx:for="{{items}}" wx:key="id">
          <view class="cart-delete-action" data-item-id="{{item.id}}" bindtap="handleRequestDelete">删除</view>

          <view
            class="cart-row {{swipedItemId === item.id ? 'swiped' : ''}}"
            data-item-id="{{item.id}}"
            bindtouchstart="handleRowSwipeStart"
            bindtouchmove="handleRowSwipeMove"
            bindtouchend="handleRowSwipeEnd"
          >
            <view class="row-check" bindtap="handleToggleItem" data-item-id="{{item.id}}">
              <view class="checkbox {{item.selected ? 'active' : ''}}">{{item.selected ? '✓' : ''}}</view>
            </view>

            <image class="row-image" mode="aspectFill" src="{{item.thumbnail}}" />

            <view class="row-main">
              <text class="row-name">{{item.name}}</text>
              <view class="row-meta">
                <view class="row-spec-trigger" wx:if="{{item.specs.length}}" data-item-id="{{item.id}}" bindtap="handleOpenSpecModal">
                  <text class="row-spec-label">{{item.specLabel || '选择规格'}}</text>
                  <text class="row-spec-arrow">∨</text>
                </view>
                <text class="row-stock">库存 {{item.stock}}</text>
              </view>
              <text class="row-price">￥{{item.price}}</text>
            </view>

            <view class="row-stepper">
              <view class="stepper-btn" data-item-id="{{item.id}}" bindtap="handleMinus">-</view>
              <text class="stepper-count">{{item.quantity}}</text>
              <view class="stepper-btn plus" data-item-id="{{item.id}}" bindtap="handlePlus">+</view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>

  <view class="empty-state" wx:else>
    <text class="empty-title">购物车还是空的</text>
    <text class="empty-body">先去挑几款蛋糕或零食，再回来结算。</text>
    <button class="empty-action" bindtap="handleContinueShopping">去逛逛</button>
  </view>

  <view class="cart-bottom-bar">
    <view class="bottom-total">
      已选 {{selectedCount}} 件 合计
      <text class="bottom-total-price">￥{{selectedTotalPrice}}</text>
    </view>
    <button class="checkout-button {{selectedCount ? '' : 'disabled'}}" disabled="{{!selectedCount}}" bindtap="handleCheckout">结算</button>
  </view>

  <view class="quick-buy-mask" wx:if="{{showSpecModal}}">
    <view class="quick-buy-panel">
      <image class="quick-buy-image" mode="aspectFill" src="{{editingItem.thumbnail}}" />
      <view class="quick-buy-close" bindtap="handleCloseSpecModal">×</view>
      <view class="quick-buy-content">
        <text class="quick-buy-name">{{editingItem.name}}</text>
        <text class="quick-buy-summary">{{editingItem.summary}}</text>
        <text class="quick-buy-spec-title">尺寸&amp;口味选择</text>
        <view class="quick-buy-specs">
          <view class="quick-buy-spec {{editingSpecId === item.id ? 'active' : ''}}" wx:for="{{editingItem.specs}}" wx:key="id" data-spec-id="{{item.id}}" bindtap="handleEditingSpecTap">{{item.label}}</view>
        </view>
      </view>
      <button class="quick-buy-submit" bindtap="handleConfirmSpec">更新购物车</button>
    </view>
  </view>
</view>
```

- [ ] **Step 4: Update cart styling for circles, gaps, swipe delete, and 50% checkout width**

Replace the relevant cart layout styles in `apps/customer-miniapp/pages/cart/index.wxss` with:

```css
.cart-page {
  height: 100vh;
  padding-bottom: 180rpx;
  box-sizing: border-box;
  background: #F7F7F7;
}

.cart-shell {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 220rpx);
  margin: 20rpx 20rpx 0;
  padding: 18rpx 18rpx 8rpx;
  box-sizing: border-box;
  border-radius: 20rpx;
  background: #FFFFFF;
}

.cart-list-scroll {
  flex: 1;
  min-height: 0;
}

.checkbox,
.row-check,
.stepper-btn {
  flex-shrink: 0;
}

.checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
}

.cart-swipe-row {
  position: relative;
  overflow: hidden;
  border-bottom: 2rpx solid #F4F4F4;
}

.cart-delete-action {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 132rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FF4D4F;
  font-size: 24rpx;
  font-weight: 700;
  color: #FFFFFF;
}

.cart-row {
  position: relative;
  display: flex;
  gap: 16rpx;
  padding: 26rpx 0;
  background: #FFFFFF;
  transform: translateX(0);
}

.cart-row.swiped {
  transform: translateX(-132rpx);
}

.row-meta {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 14rpx;
}

.row-spec-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
}

.row-stepper {
  align-self: flex-end;
  gap: 18rpx;
}

.stepper-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  font-size: 34rpx;
  line-height: 1;
}

.cart-bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 22rpx 20rpx 30rpx;
  background: rgba(255, 255, 255, 0.98);
}

.bottom-total {
  flex: 1;
  min-width: 0;
}

.checkout-button {
  width: 50%;
  min-width: 0;
  border-radius: 999rpx;
  background: #F7C43C;
  color: #FFFFFF;
}
```

- [ ] **Step 5: Run cart tests, typecheck, and build**

Run:

```bash
pnpm --filter @xiaipet/customer-miniapp exec vitest run --config vitest.config.ts pages/cart-checkout.test.ts
pnpm --filter @xiaipet/customer-miniapp typecheck
pnpm --filter @xiaipet/customer-miniapp build
```

Expected:

- PASS for cart checkout tests
- PASS for typecheck
- PASS for build

- [ ] **Step 6: Commit cart page UI refinement**

```bash
git add apps/customer-miniapp/pages/cart/index.wxml apps/customer-miniapp/pages/cart/index.wxss apps/customer-miniapp/pages/cart-checkout.test.ts
git commit -m "fix: refine cart page layout and swipe delete"
```

---

### Task 4: Full verification and manual handoff notes

**Files:**
- Modify: `apps/customer-miniapp/pages/cart-checkout.test.ts` if any final assertion adjustments are needed
- No new files

- [ ] **Step 1: Run focused automated verification**

Run:

```bash
pnpm --filter @xiaipet/customer-miniapp exec vitest run --config vitest.config.ts pages/cart-checkout.test.ts src/services/cart.test.ts
```

Expected:

- PASS for all cart service and cart page tests.

- [ ] **Step 2: Run broader customer miniapp verification**

Run:

```bash
pnpm --filter @xiaipet/customer-miniapp test
pnpm --filter @xiaipet/customer-miniapp typecheck
pnpm --filter @xiaipet/customer-miniapp build
```

Expected:

- If unrelated legacy failures remain elsewhere in the suite, capture them explicitly and confirm the cart-related files stay green.

- [ ] **Step 3: Manual verification checklist in WeChat DevTools**

Check these exact flows:

```text
1. Open cart with multiple rows and confirm the list scroll starts below 全选/清空.
2. Swipe one row left and confirm only one delete action is visible at a time.
3. Tap 删除, confirm the modal appears, then cancel and verify the row remains.
4. Tap 删除 again, confirm, and verify the row is removed.
5. Edit a spec to another in-stock spec and verify the edited row stays in the same visual position.
6. Edit a spec to an out-of-stock merge target and verify the toast shows “库存不足，请看看别的吧~” while the row remains unchanged.
7. Confirm the selection circle stays round, the stepper glyphs are centered, the spec chip and stock badge have visible spacing, and the checkout button occupies the right half of the bottom bar.
```

- [ ] **Step 4: Commit final verification updates**

```bash
git add apps/customer-miniapp/pages/cart-checkout.test.ts apps/customer-miniapp/src/services/cart.test.ts
git commit -m "test: verify cart page refinement flow"
```

---

## Spec Coverage Check

- Stable edited-row position: Task 1 + Task 2
- Insufficient-stock spec update warning and no mutation: Task 1 + Task 2
- Swipe-to-delete with confirmation: Task 2 + Task 3
- Bounded scroll below toolbar: Task 3
- Checkbox non-shrink and centered stepper glyphs: Task 3
- Spec/stock spacing at 4-based gap: Task 3
- Checkout button at right-half width: Task 3
- Automated and manual verification: Task 4
