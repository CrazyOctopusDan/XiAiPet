import { beforeEach, describe, expect, it } from 'vitest';

import { createAddress, resetAddresses, selectAddress } from './address';
import {
  ensureContactPhoneFromProfile,
  getCheckoutDraft,
  getCheckoutViewModel,
  hydratePickupPhoneFromProfile,
  resetCheckoutDraft,
  setCustomNoticeAcknowledged,
  setFulfillmentMode,
  setReservationSelection,
  toggleSelectedPet
} from './checkout';
import { createPet, resetPets, getPets } from './pets';
import { resetProfile, updateProfile } from './profile';

describe('checkout service', () => {
  beforeEach(() => {
    resetAddresses();
    resetPets();
    resetProfile();
    resetCheckoutDraft();
  });

  it('defaults to delivery mode and blocks submit until address, reservation, and notice are ready', () => {
    const draft = getCheckoutDraft();
    const view = getCheckoutViewModel();

    expect(draft.mode).toBe('delivery');
    expect(view.addressType).toBe('city');
    expect(view.canSubmit).toBe(false);
    expect(view.submitDisabledReasons).toEqual(
      expect.arrayContaining(['missing_registration', 'missing_address', 'missing_reservation', 'custom_notice_unchecked'])
    );
  });

  it('hydrates pickup phone from the existing profile contact when switching to pickup', () => {
    updateProfile({
      contactPhoneMasked: '138****1234'
    });

    setFulfillmentMode('pickup');
    hydratePickupPhoneFromProfile();

    expect(getCheckoutDraft()).toMatchObject({
      mode: 'pickup',
      pickupPhone: '138****1234'
    });
    expect(getCheckoutViewModel().addressType).toBe(null);
  });

  it('hydrates the shared order contact from the selected delivery address before masked profile contact', () => {
    const cityAddress = createAddress({
      type: 'city',
      recipientName: '奶油',
      phoneNumber: '13900001111',
      regionLabel: '上海市 黄浦区',
      detailAddress: '外滩 18 号 201',
      tag: '公司'
    });

    if (!cityAddress) {
      throw new Error('missing city address fixture');
    }

    updateProfile({
      contactPhoneMasked: '138****1234'
    });
    selectAddress(cityAddress.id);

    ensureContactPhoneFromProfile();

    expect(getCheckoutDraft()).toMatchObject({
      mode: 'delivery',
      contactPhone: cityAddress.phoneNumber
    });
    expect(getCheckoutViewModel()).toMatchObject({
      mode: 'delivery',
      contactPhone: cityAddress.phoneNumber
    });
  });

  it('supports multi-pet selection and only requires reservation for delivery or pickup', () => {
    updateProfile({
      contactPhoneMasked: '138****1234'
    });
    const cityAddress = createAddress({
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
    createPet({
      name: '布丁',
      gender: 'female',
      birthday: '2023-04-12',
      allergyNotes: ''
    });
    createPet({
      name: '芝麻',
      gender: 'male',
      birthday: '2022-11-08',
      allergyNotes: ''
    });
    const pets = getPets();

    if (!cityAddress || pets.length < 2) {
      throw new Error('missing checkout fixtures');
    }

    selectAddress(cityAddress.id);
    toggleSelectedPet(pets[0].id);
    toggleSelectedPet(pets[1].id);
    setReservationSelection({
      dateLabel: '今天 04-17',
      dateValue: '2026-04-17',
      timeLabel: '10:30',
      timeValue: '10:30'
    });
    setCustomNoticeAcknowledged(true);

    const deliveryView = getCheckoutViewModel();

    expect(deliveryView.selectedPets).toHaveLength(2);
    expect(deliveryView.canSubmit).toBe(true);

    setFulfillmentMode('express');

    const expressView = getCheckoutViewModel();

    expect(expressView.addressType).toBe('express');
    expect(expressView.submitDisabledReasons).not.toContain('missing_reservation');
  });
});
