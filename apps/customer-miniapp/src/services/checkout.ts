import {
  getSelectedAddress,
  setCheckoutAddressType,
  type AddressType,
  type CustomerAddress
} from './address';
import { getPets, type PetProfile } from './pets';
import { getProfile } from './profile';
import { getCachedCustomerRuntimeConfig } from './runtime-config';
import { getSelectedCartFulfillmentModes } from './cart';

export type FulfillmentMode = 'delivery' | 'pickup' | 'express';

export interface ReservationSelection {
  dateLabel: string;
  dateValue: string;
  timeLabel: string;
  timeValue: string;
}

export interface ReservationTimeOption {
  label: string;
  value: string;
}

export interface ReservationDayOption {
  label: string;
  value: string;
  slots: ReservationTimeOption[];
}

export interface FulfillmentModeOption {
  value: FulfillmentMode;
  label: string;
  hint: string;
}

export interface StoreLocationSummary {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface CheckoutDraft {
  mode: FulfillmentMode;
  contactPhone: string;
  pickupPhone: string;
  selectedPetIds: string[];
  reservationSelection: ReservationSelection | null;
  remark: string;
  hasReadCustomNotice: boolean;
}

export interface CheckoutViewModel {
  mode: FulfillmentMode;
  addressType: AddressType | null;
  selectedAddress: CustomerAddress | null;
  selectedPets: PetProfile[];
  contactPhone: string;
  pickupPhone: string;
  reservationSelection: ReservationSelection | null;
  reservationOptions: ReservationDayOption[];
  customNotice: string;
  hasReadCustomNotice: boolean;
  canSubmit: boolean;
  submitDisabledReasons: string[];
  remark: string;
  store: StoreLocationSummary;
  storePhone: string;
  deliveryRuleExplainers: string[];
}

const FULFILLMENT_MODES: FulfillmentModeOption[] = [
  {
    value: 'delivery',
    label: '配送',
    hint: '同城地址 + 预约时间'
  },
  {
    value: 'pickup',
    label: '自取',
    hint: '到店自提 + 联系电话'
  },
  {
    value: 'express',
    label: '快递',
    hint: '快递地址直达'
  }
];

const INITIAL_DRAFT: CheckoutDraft = {
  mode: 'delivery',
  contactPhone: '',
  pickupPhone: '',
  selectedPetIds: [],
  reservationSelection: null,
  remark: '',
  hasReadCustomNotice: false
};

let checkoutDraft: CheckoutDraft = {
  ...INITIAL_DRAFT
};

function cloneReservationSelection(selection: ReservationSelection | null) {
  return selection ? { ...selection } : null;
}

function cloneDraft(draft: CheckoutDraft) {
  return {
    ...draft,
    selectedPetIds: [...draft.selectedPetIds],
    reservationSelection: cloneReservationSelection(draft.reservationSelection)
  };
}

function padNumber(value: number) {
  return String(value).padStart(2, '0');
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(base.getDate() + days);
  return next;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function ceilToNextHalfHour(date: Date) {
  const next = new Date(date);
  next.setSeconds(0, 0);

  const minutes = next.getMinutes();
  if (minutes === 0 || minutes === 30) {
    next.setMinutes(minutes + 30);
  } else if (minutes < 30) {
    next.setMinutes(30);
  } else {
    next.setHours(next.getHours() + 1, 0, 0, 0);
  }

  return next;
}

function formatDateValue(date: Date) {
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;
}

function formatTimeValue(date: Date) {
  return `${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`;
}

function buildDayLabel(date: Date, offset: number) {
  const dateLabel = `${date.getMonth() + 1}月${date.getDate()}日`;

  if (offset === 0) {
    return `今天 ${dateLabel}`;
  }

  if (offset === 1) {
    return `明天 ${dateLabel}`;
  }

  if (offset === 2) {
    return `后天 ${dateLabel}`;
  }

  return dateLabel;
}

function buildReservationOptions(now = new Date()) {
  const options: ReservationDayOption[] = [];

  for (let offset = 0; offset < 17; offset += 1) {
    const day = addDays(startOfDay(now), offset);
    const start = offset === 0 ? ceilToNextHalfHour(now) : new Date(day.getFullYear(), day.getMonth(), day.getDate(), 10, 0, 0, 0);
    const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 21, 0, 0, 0);
    const slots: ReservationTimeOption[] = [];

    for (let cursor = new Date(start); cursor <= end; cursor = new Date(cursor.getTime() + 30 * 60 * 1000)) {
      if (cursor.getDate() !== day.getDate()) {
        break;
      }

      slots.push({
        label: formatTimeValue(cursor),
        value: formatTimeValue(cursor)
      });
    }

    if (slots.length) {
      options.push({
        label: buildDayLabel(day, offset),
        value: formatDateValue(day),
        slots
      });
    }
  }

  return options;
}

function resolveAddressType(mode: FulfillmentMode): AddressType | null {
  if (mode === 'delivery') {
    return 'city';
  }

  if (mode === 'express') {
    return 'express';
  }

  return null;
}

function getSelectedPets() {
  const selectedIds = new Set(checkoutDraft.selectedPetIds);
  return getPets().filter((pet) => selectedIds.has(pet.id));
}

function isMaskedContactPhone(value: string) {
  return value.includes('*');
}

function getPreferredContactPhone(mode: FulfillmentMode) {
  const currentContactPhone = checkoutDraft.contactPhone.trim();
  const addressType = resolveAddressType(mode);
  const addressPhone = addressType ? getSelectedAddress(addressType)?.phoneNumber.trim() ?? '' : '';
  const profile = getProfile();
  const profileContactPhone = profile.contactPhone.trim();
  const profileMaskedPhone = profile.contactPhoneMasked.trim();

  if (currentContactPhone && !isMaskedContactPhone(currentContactPhone)) {
    return currentContactPhone;
  }

  return addressPhone || profileContactPhone || currentContactPhone || profileMaskedPhone;
}

function getActiveCustomNotice() {
  const runtimeConfig = getCachedCustomerRuntimeConfig();

  if (!runtimeConfig.customNotice.enabled) {
    return '';
  }

  return runtimeConfig.customNotice.content.trim();
}

function getSubmitDisabledReasons(mode: FulfillmentMode) {
  const reasons: string[] = [];
  const addressType = resolveAddressType(mode);
  const selectedAddress = addressType ? getSelectedAddress(addressType) : null;
  const customNotice = getActiveCustomNotice();

  if (!getSelectedCartFulfillmentModes().length) {
    reasons.push('incompatible_fulfillment');
  }

  if (addressType && !selectedAddress) {
    reasons.push('missing_address');
  }

  if ((mode === 'delivery' || mode === 'pickup') && !checkoutDraft.reservationSelection) {
    reasons.push('missing_reservation');
  }

  if (mode === 'pickup' && !checkoutDraft.contactPhone.trim()) {
    reasons.push('missing_pickup_phone');
  }

  if (customNotice && !checkoutDraft.hasReadCustomNotice) {
    reasons.push('custom_notice_unchecked');
  }

  return reasons;
}

export function resetCheckoutDraft() {
  checkoutDraft = cloneDraft(INITIAL_DRAFT);
  setCheckoutAddressType('city');
}

export function getFulfillmentModes() {
  const selectedModes = new Set(getSelectedCartFulfillmentModes());
  return FULFILLMENT_MODES
    .filter((item) => selectedModes.has(item.value))
    .map((item) => ({ ...item }));
}

function resolveActiveFulfillmentMode() {
  const modes = getFulfillmentModes();
  const currentMode = modes.find((item) => item.value === checkoutDraft.mode)?.value;

  if (currentMode) {
    return currentMode;
  }

  return modes[0]?.value ?? 'delivery';
}

export function getCheckoutDraft() {
  return cloneDraft(checkoutDraft);
}

export function setFulfillmentMode(mode: FulfillmentMode) {
  const allowedModes = new Set(getFulfillmentModes().map((item) => item.value));

  if (!allowedModes.has(mode)) {
    return;
  }

  checkoutDraft = {
    ...checkoutDraft,
    mode
  };

  const addressType = resolveAddressType(mode);
  if (addressType) {
    setCheckoutAddressType(addressType);
  }
}

export function hydratePickupPhoneFromProfile() {
  return ensureContactPhoneFromProfile();
}

export function ensureContactPhoneFromProfile(mode: FulfillmentMode = checkoutDraft.mode) {
  const contactPhone = getPreferredContactPhone(mode);

  if (contactPhone && contactPhone !== checkoutDraft.contactPhone) {
    checkoutDraft = {
      ...checkoutDraft,
      contactPhone,
      pickupPhone: contactPhone
    };
  }

  return checkoutDraft.contactPhone;
}

export function setPickupPhone(value: string) {
  const contactPhone = value.trim();
  checkoutDraft = {
    ...checkoutDraft,
    contactPhone,
    pickupPhone: contactPhone
  };
}

export function setReservationSelection(selection: ReservationSelection | null) {
  checkoutDraft = {
    ...checkoutDraft,
    reservationSelection: cloneReservationSelection(selection)
  };
}

export function toggleSelectedPet(petId: string) {
  const current = new Set(checkoutDraft.selectedPetIds);

  if (current.has(petId)) {
    current.delete(petId);
  } else {
    current.add(petId);
  }

  checkoutDraft = {
    ...checkoutDraft,
    selectedPetIds: [...current]
  };

  return [...checkoutDraft.selectedPetIds];
}

export function setCustomNoticeAcknowledged(value: boolean) {
  checkoutDraft = {
    ...checkoutDraft,
    hasReadCustomNotice: value
  };
}

export function setCheckoutRemark(value: string) {
  checkoutDraft = {
    ...checkoutDraft,
    remark: value.trim().slice(0, 100)
  };
}

export function getCheckoutViewModel(now = new Date()): CheckoutViewModel {
  const activeMode = resolveActiveFulfillmentMode();

  if (checkoutDraft.mode !== activeMode) {
    checkoutDraft = {
      ...checkoutDraft,
      mode: activeMode
    };

    const addressType = resolveAddressType(activeMode);
    if (addressType) {
      setCheckoutAddressType(addressType);
    }
  }

  ensureContactPhoneFromProfile(activeMode);

  const runtimeConfig = getCachedCustomerRuntimeConfig();
  const addressType = resolveAddressType(activeMode);
  const selectedAddress = addressType ? getSelectedAddress(addressType) : null;
  const submitDisabledReasons = getSubmitDisabledReasons(activeMode);

  return {
    mode: activeMode,
    addressType,
    selectedAddress,
    selectedPets: getSelectedPets(),
    contactPhone: checkoutDraft.contactPhone,
    pickupPhone: checkoutDraft.pickupPhone,
    reservationSelection: cloneReservationSelection(checkoutDraft.reservationSelection),
    reservationOptions: activeMode === 'express' ? [] : buildReservationOptions(now),
    customNotice: getActiveCustomNotice(),
    hasReadCustomNotice: checkoutDraft.hasReadCustomNotice,
    canSubmit: submitDisabledReasons.length === 0,
    submitDisabledReasons,
    remark: checkoutDraft.remark,
    store: {
      name: runtimeConfig.store.name,
      address: runtimeConfig.store.address,
      latitude: runtimeConfig.store.latitude,
      longitude: runtimeConfig.store.longitude
    },
    storePhone: runtimeConfig.store.ownerPhone,
    deliveryRuleExplainers: runtimeConfig.deliveryRules.tiers.map((item) => item.explainer)
  };
}
