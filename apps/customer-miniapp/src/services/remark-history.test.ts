import { beforeEach, describe, expect, it } from 'vitest';

import {
  deleteRemarkHistoryEntry,
  getRemarkHistory,
  rememberRemark,
  resetRemarkHistory
} from './remark-history';

describe('remark history service', () => {
  beforeEach(() => {
    resetRemarkHistory();
  });

  it('keeps the latest unique remarks with the newest entry first', () => {
    rememberRemark('少糖');
    rememberRemark('加急，请提前联系');
    rememberRemark('少糖');

    expect(getRemarkHistory()).toEqual(['少糖', '加急，请提前联系']);
  });

  it('caps history at 10 entries and allows deleting a remembered remark', () => {
    Array.from({ length: 12 }).forEach((_, index) => {
      rememberRemark(`备注 ${index + 1}`);
    });

    expect(getRemarkHistory()).toHaveLength(10);
    expect(getRemarkHistory()[0]).toBe('备注 12');
    expect(getRemarkHistory()).not.toContain('备注 1');

    deleteRemarkHistoryEntry('备注 8');

    expect(getRemarkHistory()).not.toContain('备注 8');
  });
});
