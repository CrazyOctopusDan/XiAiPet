import type { UserGiftDisplayGroup, UserGiftView } from '@xiaipet/shared';

import { customerApiRequest, type CustomerApiRequester } from './api-client';

export type CheckoutGiftOption = UserGiftView & { selected: boolean };

type GiftGroups = Record<UserGiftDisplayGroup, UserGiftView[]>;

function createEmptyGiftGroups(): GiftGroups {
  return {
    available: [],
    locked: [],
    redeemed: [],
    expired: []
  };
}

let myGiftGroups: GiftGroups = createEmptyGiftGroups();
let checkoutGiftOptions: UserGiftView[] = [];
let selectedCheckoutGiftIds: string[] = [];

function cloneGift(gift: UserGiftView): UserGiftView {
  return {
    ...gift,
    giftSnapshot: { ...gift.giftSnapshot }
  };
}

function cloneGiftGroups(groups: Partial<GiftGroups> | undefined): GiftGroups {
  return {
    available: (groups?.available ?? []).map(cloneGift),
    locked: (groups?.locked ?? []).map(cloneGift),
    redeemed: (groups?.redeemed ?? []).map(cloneGift),
    expired: (groups?.expired ?? []).map(cloneGift)
  };
}

export async function hydrateMyGifts(request: CustomerApiRequester = customerApiRequest) {
  const response = await request<{ ok?: boolean; groups?: GiftGroups }>('/api/v1/customer/gifts', {
    method: 'GET',
    auth: 'customer'
  });
  myGiftGroups = cloneGiftGroups(response.groups);
  return getMyGiftGroups();
}

export async function hydrateCheckoutGifts(request: CustomerApiRequester = customerApiRequest) {
  const response = await request<{ ok?: boolean; gifts?: UserGiftView[] }>('/api/v1/customer/checkout-gifts', {
    method: 'GET',
    auth: 'customer'
  });
  checkoutGiftOptions = (response.gifts ?? []).map(cloneGift);

  const validIds = new Set(checkoutGiftOptions.map((gift) => gift.id));
  selectedCheckoutGiftIds = selectedCheckoutGiftIds.filter((giftId) => validIds.has(giftId));

  return getCheckoutGiftOptions();
}

export function getMyGiftGroups() {
  return cloneGiftGroups(myGiftGroups);
}

export function getCheckoutGiftOptions(): CheckoutGiftOption[] {
  const selectedIds = new Set(selectedCheckoutGiftIds);
  return checkoutGiftOptions.map((gift) => ({
    ...cloneGift(gift),
    selected: selectedIds.has(gift.id)
  }));
}

export function toggleCheckoutGiftSelection(giftId: string) {
  const optionIds = new Set(checkoutGiftOptions.map((gift) => gift.id));
  if (!optionIds.has(giftId)) {
    return getSelectedCheckoutGiftIds();
  }

  const current = new Set(selectedCheckoutGiftIds);
  if (current.has(giftId)) {
    current.delete(giftId);
  } else {
    current.add(giftId);
  }

  selectedCheckoutGiftIds = checkoutGiftOptions.filter((gift) => current.has(gift.id)).map((gift) => gift.id);
  return getSelectedCheckoutGiftIds();
}

export function getSelectedCheckoutGiftIds() {
  return [...selectedCheckoutGiftIds];
}

export function resetCheckoutGiftSelection() {
  selectedCheckoutGiftIds = [];
}

export function getSelectedCheckoutGiftSummary() {
  const selectedIds = new Set(selectedCheckoutGiftIds);
  return checkoutGiftOptions.filter((gift) => selectedIds.has(gift.id)).map(cloneGift);
}
