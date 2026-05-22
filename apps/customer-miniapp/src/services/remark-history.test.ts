import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  deleteRemarkHistoryEntry,
  getRemarkHistory,
  hydrateRemarkHistory,
  rememberRemark,
  resetRemarkHistory
} from './remark-history';

describe('remark history service', () => {
  beforeEach(() => {
    resetRemarkHistory();
    vi.unstubAllGlobals();
  });

  it('keeps the latest unique remarks with the newest entry first', () => {
    rememberRemark('少糖');
    rememberRemark('加急，请提前联系');
    rememberRemark('少糖');

    expect(getRemarkHistory()).toEqual(['少糖', '加急，请提前联系']);
  });

  it('caps history at 20 entries and allows deleting a remembered remark', () => {
    Array.from({ length: 22 }).forEach((_, index) => {
      rememberRemark(`备注 ${index + 1}`);
    });

    expect(getRemarkHistory()).toHaveLength(20);
    expect(getRemarkHistory()[0]).toBe('备注 22');
    expect(getRemarkHistory()).not.toContain('备注 1');

    deleteRemarkHistoryEntry('备注 8');

    expect(getRemarkHistory()).not.toContain('备注 8');
  });

  it('limits remarks to 100 characters and persists simple string history in local storage', () => {
    const storage = new Map<string, unknown>();
    vi.stubGlobal('wx', {
      getStorageSync: vi.fn((key: string) => storage.get(key)),
      setStorageSync: vi.fn((key: string, value: unknown) => storage.set(key, value))
    });

    const longRemark = '这是一条很长的订单备注'.repeat(20);

    rememberRemark(longRemark);
    rememberRemark('少糖');
    rememberRemark('少糖');
    hydrateRemarkHistory();

    expect(getRemarkHistory()).toEqual(['少糖', longRemark.slice(0, 100)]);
    expect(storage.get('xiaipet:checkout:remark-history')).toEqual(['少糖', longRemark.slice(0, 100)]);
  });
});
