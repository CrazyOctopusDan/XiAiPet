import { beforeEach, describe, expect, it } from 'vitest';

import { getAddresses, resetAddresses, selectAddress } from './address';
import {
  getCheckoutDraft,
  getCheckoutViewModel,
  hydratePickupPhoneFromProfile,
  resetCheckoutDraft,
  setCustomNoticeAcknowledged,
  setFulfillmentMode,
  setReservationSelection,
  toggleSelectedPet
} from './checkout';
import { resetPets, getPets } from './pets';
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
      expect.arrayContaining(['missing_reservation', 'custom_notice_unchecked'])
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

  it('supports multi-pet selection and only requires reservation for delivery or pickup', () => {
    const cityAddress = getAddresses('city')[0];
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
