import { beforeEach, describe, expect, it, vi } from 'vitest';

type ComponentOptions = Record<string, any> & {
  properties?: Record<string, unknown>;
  methods?: Record<string, (...args: any[]) => unknown>;
};

async function loadComponentModule() {
  const componentModulePath = '/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/custom-tab-bar/index.js';
  let capturedComponent: ComponentOptions | null = null;
  const wxMock = {
    switchTab: vi.fn()
  };

  vi.resetModules();
  vi.unstubAllGlobals();
  vi.stubGlobal('wx', wxMock);
  vi.stubGlobal('Component', (options: ComponentOptions) => {
    capturedComponent = options;
  });

  await import(componentModulePath);

  if (!capturedComponent) {
    throw new Error('component not registered');
  }

  return {
    component: capturedComponent,
    wx: wxMock
  };
}

function createComponentInstance(component: ComponentOptions, active: 'home' | 'orders' | 'profile') {
  return {
    data: {
      selectedKey: active
    },
    setData(updates: Record<string, unknown>) {
      this.data = {
        ...this.data,
        ...updates
      };
    },
    ...component.methods
  } as Record<string, any>;
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

    expect(wx.switchTab).toHaveBeenCalledWith({
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

    expect(wx.switchTab).not.toHaveBeenCalled();
  });
});
