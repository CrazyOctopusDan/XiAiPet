import { beforeEach, describe, expect, it, vi } from 'vitest';

const CART_STORAGE_KEY = 'xiaipet:customer:cart:v1';

describe('customer miniapp app bootstrap', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('hydrates persisted cart rows when the miniapp launches', async () => {
    let capturedApp: Record<string, any> | null = null;
    const storage = new Map<string, unknown>();
    storage.set(CART_STORAGE_KEY, {
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      items: [
        {
          productId: 'ocean-party',
          specId: 'ocean-party-3-chicken',
          quantity: 2,
          selected: true,
          snapshot: {
            name: '海洋奇遇',
            summary: '旧的本地快照',
            thumbnail: '',
            specLabel: '3寸鸡肉',
            unitPrice: 138,
            stock: 9,
            deliveryModes: ['delivery', 'pickup']
          },
          updatedAt: new Date().toISOString()
        }
      ]
    });

    vi.stubGlobal('wx', {
      getStorageSync: vi.fn((key: string) => storage.get(key)),
      setStorageSync: vi.fn((key: string, value: unknown) => storage.set(key, value)),
      removeStorageSync: vi.fn((key: string) => storage.delete(key))
    });
    vi.stubGlobal('App', (options: Record<string, any>) => {
      capturedApp = options;
    });

    await import('../app');

    if (!capturedApp) {
      throw new Error('App was not registered');
    }

    const appOptions = capturedApp as Record<string, any>;
    appOptions.onLaunch();

    const { getCartItems } = await import('./services/cart');

    expect(appOptions.onLaunch).toEqual(expect.any(Function));
    expect(getCartItems()).toEqual([
      expect.objectContaining({
        productId: 'ocean-party',
        specId: 'ocean-party-3-chicken',
        quantity: 2,
        selected: true,
        validationStatus: 'unverified'
      })
    ]);
  });
});
