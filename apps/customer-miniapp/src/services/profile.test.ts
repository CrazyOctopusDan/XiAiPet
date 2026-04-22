import { beforeEach, describe, expect, it } from 'vitest';

import {
  getProfile,
  getProfileSummary,
  resetProfile,
  setBirthday,
  updateProfile
} from './profile';

describe('profile service', () => {
  beforeEach(() => {
    resetProfile();
  });

  it('returns summary fields for the profile hub', () => {
    const summary = getProfileSummary();

    expect(summary).toEqual({
      avatarText: '虾',
      nickname: '虾衣宠家长',
      memberLevel: '普通会员',
      balance: 268,
      totalSpent: 1288,
      birthdayLabel: '未设置生日',
      contactPhoneLabel: '未绑定手机号'
    });
  });

  it('updates nickname and gender without changing birthday state', () => {
    updateProfile({
      nickname: 'Lucky 家长',
      gender: 'female'
    });

    expect(getProfile()).toMatchObject({
      nickname: 'Lucky 家长',
      gender: 'female',
      birthdayLocked: false
    });
  });

  it('allows birthday to be set once and locks further changes', () => {
    const firstResult = setBirthday('2020-08-18');
    const secondResult = setBirthday('2021-09-19');

    expect(firstResult).toEqual({
      ok: true,
      profile: expect.objectContaining({
        birthday: '2020-08-18',
        birthdayLocked: true
      })
    });
    expect(secondResult).toEqual({
      ok: false,
      reason: 'birthday_locked'
    });
    expect(getProfile()).toMatchObject({
      birthday: '2020-08-18',
      birthdayLocked: true
    });
  });

  it('formats a bound phone and birthday into the summary', () => {
    updateProfile({
      contactPhoneMasked: '138****1234',
      birthday: '2020-08-18',
      birthdayLocked: true
    });

    const summary = getProfileSummary();

    expect(summary.birthdayLabel).toBe('2020-08-18');
    expect(summary.contactPhoneLabel).toBe('138****1234');
  });
});
