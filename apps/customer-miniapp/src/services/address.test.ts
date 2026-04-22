import { beforeEach, describe, expect, it } from 'vitest';

import {
  beginAddressSelection,
  clearAddressSelectionRequest,
  createAddress,
  getAddressSelectionRequest,
  getAddresses,
  getCheckoutAddressType,
  getSelectedAddress,
  resetAddresses,
  selectAddress,
  setCheckoutAddressType,
  updateAddress
} from './address';

describe('address service', () => {
  beforeEach(() => {
    resetAddresses();
  });

  it('filters city and express addresses from a shared store', () => {
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
    const expressAddress = getAddresses('express')[0];

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
});
