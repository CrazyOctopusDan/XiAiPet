import { describe, expect, it } from 'vitest';

import { main } from './index';

process.env.CLOUDBASE_ENV_NAME = 'dev';

describe('bindPhone cloud function', () => {
  it('resolves a WeChat getPhoneNumber code into a normalized phone binding update', async () => {
    await expect(
      main(
        {
          phoneCode: 'wechat-phone-code',
          openid: 'user-openid'
        },
        undefined,
        {
          async getPhoneNumber(code) {
            expect(code).toBe('wechat-phone-code');
            return {
              phoneNumber: '13800138123',
              countryCode: '86',
              source: 'wechat'
            };
          }
        }
      )
    ).resolves.toEqual({
      ok: true,
      openid: 'user-openid',
      update: {
        phoneBindingState: 'bound',
        contactPhoneMasked: '138****8123',
        contactPhoneCountryCode: '+86'
      }
    });
  });

  it('keeps accepting manual phone payloads', async () => {
    await expect(
      main({
        openid: 'user-openid',
        payload: {
          phoneNumber: '13900139123',
          countryCode: '+86',
          source: 'manual'
        }
      })
    ).resolves.toMatchObject({
      ok: true,
      update: {
        phoneBindingState: 'bound',
        contactPhoneMasked: '139****9123',
        contactPhoneCountryCode: '+86'
      }
    });
  });
});
