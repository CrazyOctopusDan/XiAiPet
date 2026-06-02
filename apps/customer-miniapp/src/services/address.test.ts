import { beforeEach, describe, expect, it } from 'vitest';

import {
  beginAddressSelection,
  clearAddressSelectionRequest,
  createAddress,
  createAddressRemote,
  createExpressAddressInputFromCity,
  getAddressSelectionRequest,
  getAddresses,
  getCheckoutAddressType,
  getSelectedAddress,
  hydrateAddresses,
  persistSelectedAddress,
  resetAddresses,
  selectAddress,
  setCheckoutAddressType,
  updateAddress,
  updateAddressRemote
} from './address';

describe('address service', () => {
  beforeEach(() => {
    resetAddresses();
  });

  it('starts new users with no local address fixtures', () => {
    expect(getAddresses()).toEqual([]);
    expect(getSelectedAddress('city')).toBe(null);
    expect(getSelectedAddress('express')).toBe(null);
  });

  it('filters city and express addresses from a shared store', () => {
    createAddress({
      type: 'city',
      recipientName: '奶油',
      phoneNumber: '13900001111',
      regionLabel: '上海市 黄浦区',
      detailAddress: '外滩 18 号 201',
      tag: '公司'
    });
    createAddress({
      type: 'express',
      recipientName: '奶油',
      phoneNumber: '13900001111',
      regionLabel: '浙江省 杭州市',
      detailAddress: '文三路 90 号',
      tag: '家'
    });

    expect(getAddresses('city').every((item) => item.type === 'city')).toBe(true);
    expect(getAddresses('express').every((item) => item.type === 'express')).toBe(true);
  });

  it('creates and edits an address without losing its type', () => {
    const created = createAddress({
      type: 'city',
      recipientName: '奶油',
      phoneNumber: '13900001111',
      regionLabel: '上海市 黄浦区',
      detailAddress: '外滩 18 号 201',
      tag: '公司'
    });

    expect(getAddresses('city')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: created.id,
          recipientName: '奶油',
          type: 'city'
        })
      ])
    );

    const updated = updateAddress(created.id, {
      detailAddress: '外滩 18 号 202',
      tag: '工作室'
    });

    expect(updated).toMatchObject({
      id: created.id,
      detailAddress: '外滩 18 号 202',
      tag: '工作室',
      type: 'city'
    });
  });

  it('selects an address per type and exposes the checkout address type', () => {
    const expressAddress = createAddress({
      type: 'express',
      recipientName: '奶油',
      phoneNumber: '13900001111',
      regionLabel: '浙江省 杭州市',
      detailAddress: '文三路 90 号',
      tag: '家'
    });

    if (!expressAddress) {
      throw new Error('missing express address fixture');
    }

    setCheckoutAddressType('express');
    selectAddress(expressAddress.id);

    expect(getCheckoutAddressType()).toBe('express');
    expect(getSelectedAddress('express')).toMatchObject({
      id: expressAddress.id,
      type: 'express'
    });
  });

  it('tracks and clears a pending checkout address selection request', () => {
    beginAddressSelection('checkout', 'city');

    expect(getAddressSelectionRequest()).toEqual({
      target: 'checkout',
      type: 'city'
    });

    clearAddressSelectionRequest();

    expect(getAddressSelectionRequest()).toBe(null);
  });

  it('hydrates addresses from the customer address API', async () => {
    const request = async <T>(path: string, options?: { method?: string; auth?: string }) => {
      expect(path).toBe('/api/v1/customer/addresses');
      expect(options).toMatchObject({ method: 'GET', auth: 'customer' });
      return {
        ok: true,
        addresses: [
          {
            id: 'addr-api-city',
            type: 'city',
            recipientName: 'Lucky',
            phoneNumber: '13800138000',
            regionLabel: '上海市 徐汇区',
            detailAddress: '永嘉路 88 号',
            tag: '家',
            isDefault: true
          }
        ]
      } as T;
    };

    await hydrateAddresses(request);

    expect(getAddresses('city')).toEqual([
      expect.objectContaining({
        id: 'addr-api-city',
        recipientName: 'Lucky'
      })
    ]);
    expect(getSelectedAddress('city')).toMatchObject({ id: 'addr-api-city' });
  });

  it('persists address create, update and default selection through the API', async () => {
    const calls: Array<{ path: string; options?: { method?: string; body?: unknown; auth?: string } }> = [];
    const request = async <T>(path: string, options?: { method?: string; body?: unknown; auth?: string }) => {
      calls.push({ path, options });
      if (options?.method === 'POST') {
        return {
          ok: true,
          address: {
            id: 'addr-created',
            type: 'express',
            recipientName: '奶油',
            phoneNumber: '13900001111',
            regionLabel: '浙江省 杭州市',
            detailAddress: '文三路 90 号',
            tag: '家',
            isDefault: false
          }
        } as T;
      }
      if (options?.method === 'PUT') {
        return {
          ok: true,
          address: {
            id: 'addr-created',
            type: 'express',
            recipientName: '奶油',
            phoneNumber: '13900001111',
            regionLabel: '浙江省 杭州市',
            detailAddress: '文三路 91 号',
            tag: '家',
            isDefault: false
          }
        } as T;
      }
      return {
        ok: true,
        address: {
          id: 'addr-created',
          type: 'express',
          recipientName: '奶油',
          phoneNumber: '13900001111',
          regionLabel: '浙江省 杭州市',
          detailAddress: '文三路 91 号',
          tag: '家',
          isDefault: true
        }
      } as T;
    };

    await createAddressRemote({
      type: 'express',
      recipientName: '奶油',
      phoneNumber: '13900001111',
      regionLabel: '浙江省 杭州市',
      detailAddress: '文三路 90 号',
      tag: '家',
      latitude: 30.2767,
      longitude: 120.1258
    }, request);
    await updateAddressRemote('addr-created', {
      detailAddress: '文三路 91 号',
      latitude: 30.277,
      longitude: 120.126
    }, request);
    await persistSelectedAddress('addr-created', request);

    expect(calls.map((call) => [call.path, call.options?.method])).toEqual([
      ['/api/v1/customer/addresses', 'POST'],
      ['/api/v1/customer/addresses/addr-created', 'PUT'],
      ['/api/v1/customer/addresses/addr-created/default', 'PUT']
    ]);
    expect(calls[0]?.options?.body).toMatchObject({ latitude: 30.2767, longitude: 120.1258 });
    expect(calls[1]?.options?.body).toMatchObject({ latitude: 30.277, longitude: 120.126 });
    expect(getSelectedAddress('express')).toMatchObject({ id: 'addr-created' });
  });

  it('copies city address input into an independent express address input with coordinates', () => {
    const cityInput = {
      type: 'city' as const,
      recipientName: '奶油',
      phoneNumber: '13900001111',
      regionLabel: '浙江省 杭州市',
      detailAddress: '文三路 90 号',
      tag: '家',
      latitude: 30.2767,
      longitude: 120.1258
    };

    expect(createExpressAddressInputFromCity(cityInput)).toEqual({
      ...cityInput,
      type: 'express'
    });
  });
});
