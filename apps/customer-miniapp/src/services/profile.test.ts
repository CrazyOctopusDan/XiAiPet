import { beforeEach, describe, expect, it } from 'vitest';

import {
  getProfile,
  getProfileSummary,
  hydrateProfile,
  hasBoundPhone,
  getPhoneBindingRedirectUrl,
  resetProfile,
  saveProfile,
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
      avatarText: '喜',
      nickname: '喜爱宠家长',
      memberLevel: '普通会员',
      balance: 0,
      totalSpent: 0,
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
    expect(hasBoundPhone()).toBe(true);
  });

  it('builds a phone binding redirect for balance entry when the profile is unbound', () => {
    expect(hasBoundPhone()).toBe(false);
    expect(getPhoneBindingRedirectUrl('/pages/balance/index')).toBe(
      '/pages/contact-bind/index?redirect=%2Fpages%2Fbalance%2Findex'
    );
  });

  it('persists profile updates through the customer profile API', async () => {
    const request = async <T>(path: string, options?: { method?: string; body?: unknown; auth?: string }) => {
      expect(path).toBe('/api/v1/customer/profile');
      expect(options).toMatchObject({
        method: 'PUT',
        auth: 'customer',
        body: {
          profile: {
            nickname: 'Lucky 家长',
            gender: 'female',
            birthday: '2024-05-09',
            birthdayLocked: true
          }
        }
      });

      return {
        ok: true,
        profile: {
          nickname: 'Lucky 家长',
          gender: 'female',
          birthday: '2024-05-09',
          birthdayLocked: true
        }
      } as T;
    };

    await saveProfile(
      {
        nickname: 'Lucky 家长',
        gender: 'female',
        birthday: '2024-05-09',
        birthdayLocked: true
      },
      request
    );

    expect(getProfile()).toMatchObject({
      nickname: 'Lucky 家长',
      gender: 'female',
      birthday: '2024-05-09',
      birthdayLocked: true
    });
  });

  it('hydrates profile and balance summary from the customer profile API', async () => {
    const request = async <T>(path: string, options?: { method?: string; auth?: string }) => {
      expect(path).toBe('/api/v1/customer/profile');
      expect(options).toMatchObject({ method: 'GET', auth: 'customer' });
      return {
        ok: true,
        profile: {
          avatarText: 'L',
          nickname: 'Lucky 家长',
          gender: 'female',
          memberLevel: '普通会员',
          balance: 180,
          totalSpent: 520,
          birthday: '2024-05-09',
          birthdayLocked: true,
          contactPhoneMasked: '138****8000'
        }
      } as T;
    };

    await hydrateProfile(request);

    expect(getProfileSummary()).toMatchObject({
      nickname: 'Lucky 家长',
      balance: 180,
      contactPhoneLabel: '138****8000'
    });
  });
});
