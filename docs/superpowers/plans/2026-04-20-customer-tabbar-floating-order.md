# Customer Tabbar Floating Order Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the duplicated page-level bottom tab bars in the customer miniapp with one shared component that renders a larger floating center order entry and keeps Home/Profile labels.

**Architecture:** Add a reusable `custom-tabbar` mini program component under `apps/customer-miniapp/components/`, keep its script in plain `js` so it drops into the current build without changing `tsconfig`, and migrate the three first-level pages to render it with an `active` prop. Cover the component behavior with a focused Vitest file that validates page switching and active-page no-op behavior before implementing the component.

**Tech Stack:** WeChat mini program components, WXML, WXSS, plain component JS, existing page TS modules, Vitest, pnpm

---

## File Structure

- Create: `apps/customer-miniapp/components/custom-tabbar/index.js`
- Create: `apps/customer-miniapp/components/custom-tabbar/index.json`
- Create: `apps/customer-miniapp/components/custom-tabbar/index.wxml`
- Create: `apps/customer-miniapp/components/custom-tabbar/index.wxss`
- Create: `apps/customer-miniapp/pages/custom-tabbar.test.ts`
- Modify: `apps/customer-miniapp/pages/home/index.wxml`
- Modify: `apps/customer-miniapp/pages/home/index.wxss`
- Modify: `apps/customer-miniapp/pages/home/index.json`
- Modify: `apps/customer-miniapp/pages/orders/index.wxml`
- Modify: `apps/customer-miniapp/pages/orders/index.wxss`
- Modify: `apps/customer-miniapp/pages/orders/index.json`
- Modify: `apps/customer-miniapp/pages/profile/index.wxml`
- Modify: `apps/customer-miniapp/pages/profile/index.wxss`
- Modify: `apps/customer-miniapp/pages/profile/index.json`

### Task 1: Add a failing component behavior test

**Files:**
- Create: `apps/customer-miniapp/pages/custom-tabbar.test.ts`
- Test: `apps/customer-miniapp/pages/custom-tabbar.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

type ComponentOptions = Record<string, any> & {
  properties?: Record<string, unknown>;
  methods?: Record<string, (...args: any[]) => unknown>;
};

async function loadComponentModule() {
  let capturedComponent: ComponentOptions | null = null;
  const wxMock = {
    redirectTo: vi.fn()
  };

  vi.resetModules();
  vi.unstubAllGlobals();
  vi.stubGlobal('wx', wxMock);
  vi.stubGlobal('Component', (options: ComponentOptions) => {
    capturedComponent = options;
  });

  await import('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/components/custom-tabbar/index.js');

  if (!capturedComponent) {
    throw new Error('component not registered');
  }

  return { component: capturedComponent, wx: wxMock };
}

function createComponentInstance(component: ComponentOptions, active: 'home' | 'orders' | 'profile') {
  return {
    data: { active },
    properties: { active },
    ...component.methods
  };
}

describe('custom tabbar component', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('redirects to another first-level page when tapping an inactive item', async () => {
    const { component, wx } = await loadComponentModule();
    const instance = createComponentInstance(component, 'home');

    instance.handleTabTap({
      currentTarget: {
        dataset: {
          key: 'orders',
          url: '/pages/orders/index'
        }
      }
    });

    expect(wx.redirectTo).toHaveBeenCalledWith({
      url: '/pages/orders/index'
    });
  });

  it('does nothing when tapping the active item', async () => {
    const { component, wx } = await loadComponentModule();
    const instance = createComponentInstance(component, 'orders');

    instance.handleTabTap({
      currentTarget: {
        dataset: {
          key: 'orders',
          url: '/pages/orders/index'
        }
      }
    });

    expect(wx.redirectTo).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @xiaipet/customer-miniapp test -- pages/custom-tabbar.test.ts`
Expected: FAIL because `apps/customer-miniapp/components/custom-tabbar/index.js` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```js
Component({
  properties: {
    active: {
      type: String,
      value: 'home'
    }
  },
  methods: {
    handleTabTap(event) {
      const { key, url } = event.currentTarget.dataset || {};

      if (!key || !url || key === this.properties.active) {
        return;
      }

      wx.redirectTo({ url });
    }
  }
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @xiaipet/customer-miniapp test -- pages/custom-tabbar.test.ts`
Expected: PASS with 2 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/customer-miniapp/components/custom-tabbar/index.js apps/customer-miniapp/pages/custom-tabbar.test.ts
git commit -m "test: cover custom tabbar navigation behavior"
```

### Task 2: Render the shared floating tab bar component

**Files:**
- Create: `apps/customer-miniapp/components/custom-tabbar/index.json`
- Create: `apps/customer-miniapp/components/custom-tabbar/index.wxml`
- Create: `apps/customer-miniapp/components/custom-tabbar/index.wxss`
- Modify: `apps/customer-miniapp/pages/home/index.json`
- Modify: `apps/customer-miniapp/pages/home/index.wxml`
- Modify: `apps/customer-miniapp/pages/home/index.wxss`
- Modify: `apps/customer-miniapp/pages/orders/index.json`
- Modify: `apps/customer-miniapp/pages/orders/index.wxml`
- Modify: `apps/customer-miniapp/pages/orders/index.wxss`
- Modify: `apps/customer-miniapp/pages/profile/index.json`
- Modify: `apps/customer-miniapp/pages/profile/index.wxml`
- Modify: `apps/customer-miniapp/pages/profile/index.wxss`

- [ ] **Step 1: Register the shared component in the three page configs**

```json
{
  "navigationStyle": "custom",
  "backgroundColor": "#F8F2D0",
  "backgroundTextStyle": "light",
  "usingComponents": {
    "custom-tabbar": "/components/custom-tabbar/index"
  }
}
```

Apply the same `usingComponents` entry to `pages/orders/index.json` and `pages/profile/index.json` while preserving their existing background settings.

- [ ] **Step 2: Replace the duplicated inline tab bar markup**

```xml
<custom-tabbar active="home" />
```

Use:
- `active="home"` in `pages/home/index.wxml`
- `active="orders"` in `pages/orders/index.wxml`
- `active="profile"` in `pages/profile/index.wxml`

Remove the repeated inline `home-tabbar`, `tab-item`, and `center-button` markup blocks from each page.

- [ ] **Step 3: Implement the shared component view**

```xml
<view class="custom-tabbar">
  <view class="custom-tabbar__shell">
    <view
      class="custom-tabbar__item {{active === 'home' ? 'is-active' : ''}}"
      data-key="home"
      data-url="/pages/home/index"
      bindtap="handleTabTap"
    >
      <view class="custom-tabbar__home-icon"></view>
      <text class="custom-tabbar__label">首页</text>
    </view>

    <view
      class="custom-tabbar__center-hitbox"
      data-key="orders"
      data-url="/pages/orders/index"
      bindtap="handleTabTap"
    >
      <view class="custom-tabbar__center-ring">
        <view class="custom-tabbar__center-button">
          <view class="custom-tabbar__order-icon">
            <view class="custom-tabbar__order-line"></view>
            <view class="custom-tabbar__order-line custom-tabbar__order-line--short"></view>
            <view class="custom-tabbar__order-line custom-tabbar__order-line--tiny"></view>
          </view>
        </view>
      </view>
    </view>

    <view
      class="custom-tabbar__item {{active === 'profile' ? 'is-active' : ''}}"
      data-key="profile"
      data-url="/pages/profile/index"
      bindtap="handleTabTap"
    >
      <view class="custom-tabbar__profile-icon">
        <view class="custom-tabbar__profile-head"></view>
        <view class="custom-tabbar__profile-body"></view>
      </view>
      <text class="custom-tabbar__label">个人中心</text>
    </view>
  </view>
</view>
```

- [ ] **Step 4: Implement the floating bar styles**

```css
.custom-tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  pointer-events: none;
}

.custom-tabbar__shell {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 22rpx 54rpx calc(24rpx + env(safe-area-inset-bottom));
  background: rgba(251, 247, 221, 0.96);
  border-top: 2rpx solid rgba(79, 52, 30, 0.05);
  backdrop-filter: blur(12rpx);
  pointer-events: auto;
}

.custom-tabbar__center-hitbox {
  position: absolute;
  left: 50%;
  bottom: calc(30rpx + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  width: 132rpx;
  height: 132rpx;
}

.custom-tabbar__center-button {
  width: 116rpx;
  height: 116rpx;
  border-radius: 58rpx;
  background: #E7D54F;
  box-shadow: 0 14rpx 30rpx rgba(140, 112, 31, 0.22);
}
```

Finish the rest of the selector set so the result matches the approved A2 direction:
- side items keep icon plus label
- center item has no label
- center ring separates the button from the bar
- active side label uses the highlight color

- [ ] **Step 5: Update page bottom padding to fit the larger floating button**

```css
.home-page {
  padding-bottom: calc(228rpx + env(safe-area-inset-bottom));
}
```

Apply equivalent bottom-padding updates to `pages/orders/index.wxss` and `pages/profile/index.wxss`, then delete their old local tab bar selector blocks.

- [ ] **Step 6: Commit**

```bash
git add apps/customer-miniapp/components/custom-tabbar apps/customer-miniapp/pages/home/index.json apps/customer-miniapp/pages/home/index.wxml apps/customer-miniapp/pages/home/index.wxss apps/customer-miniapp/pages/orders/index.json apps/customer-miniapp/pages/orders/index.wxml apps/customer-miniapp/pages/orders/index.wxss apps/customer-miniapp/pages/profile/index.json apps/customer-miniapp/pages/profile/index.wxml apps/customer-miniapp/pages/profile/index.wxss
git commit -m "feat: share customer floating tabbar"
```

### Task 3: Run focused verification and clean up

**Files:**
- Test: `apps/customer-miniapp/pages/custom-tabbar.test.ts`
- Test: `apps/customer-miniapp/pages/orders-flow.test.ts`
- Test: `apps/customer-miniapp/pages/discovery-cart.test.ts`

- [ ] **Step 1: Re-run the focused component test**

Run: `pnpm --filter @xiaipet/customer-miniapp test -- pages/custom-tabbar.test.ts`
Expected: PASS with the component navigation behavior still green.

- [ ] **Step 2: Re-run existing customer page tests**

Run: `pnpm --filter @xiaipet/customer-miniapp test -- pages/orders-flow.test.ts pages/discovery-cart.test.ts`
Expected: PASS, confirming the page modules still load cleanly after adopting the shared component.

- [ ] **Step 3: Run typecheck and runtime build**

Run: `pnpm --filter @xiaipet/customer-miniapp typecheck && pnpm --filter @xiaipet/customer-miniapp build`
Expected: both commands exit 0.

- [ ] **Step 4: Review the touched files for drift**

Check that:
- no inline `home-tabbar` markup remains in the three root pages
- no page-specific `center-button` selector remains
- the center order entry has no text label

- [ ] **Step 5: Commit**

```bash
git add apps/customer-miniapp/pages/custom-tabbar.test.ts apps/customer-miniapp/components/custom-tabbar apps/customer-miniapp/pages/home/index.wxml apps/customer-miniapp/pages/home/index.wxss apps/customer-miniapp/pages/orders/index.wxml apps/customer-miniapp/pages/orders/index.wxss apps/customer-miniapp/pages/profile/index.wxml apps/customer-miniapp/pages/profile/index.wxss
git commit -m "test: verify customer floating tabbar integration"
```
