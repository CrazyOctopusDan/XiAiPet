"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetCheckoutDraft = resetCheckoutDraft;
exports.getFulfillmentModes = getFulfillmentModes;
exports.getCheckoutDraft = getCheckoutDraft;
exports.setFulfillmentMode = setFulfillmentMode;
exports.hydratePickupPhoneFromProfile = hydratePickupPhoneFromProfile;
exports.ensureContactPhoneFromProfile = ensureContactPhoneFromProfile;
exports.setPickupPhone = setPickupPhone;
exports.setReservationSelection = setReservationSelection;
exports.toggleSelectedPet = toggleSelectedPet;
exports.setCustomNoticeAcknowledged = setCustomNoticeAcknowledged;
exports.setCheckoutRemark = setCheckoutRemark;
exports.getCheckoutViewModel = getCheckoutViewModel;
const address_1 = require("./address");
const pets_1 = require("./pets");
const profile_1 = require("./profile");
const runtime_config_1 = require("./runtime-config");
const cart_1 = require("./cart");
const FULFILLMENT_MODES = [
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
const INITIAL_DRAFT = {
    mode: 'delivery',
    contactPhone: '',
    pickupPhone: '',
    selectedPetIds: [],
    reservationSelection: null,
    remark: '',
    hasReadCustomNotice: false
};
let checkoutDraft = {
    ...INITIAL_DRAFT
};
function cloneReservationSelection(selection) {
    return selection ? { ...selection } : null;
}
function cloneDraft(draft) {
    return {
        ...draft,
        selectedPetIds: [...draft.selectedPetIds],
        reservationSelection: cloneReservationSelection(draft.reservationSelection)
    };
}
function padNumber(value) {
    return String(value).padStart(2, '0');
}
function addDays(base, days) {
    const next = new Date(base);
    next.setDate(base.getDate() + days);
    return next;
}
function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
function ceilToNextHalfHour(date) {
    const next = new Date(date);
    next.setSeconds(0, 0);
    const minutes = next.getMinutes();
    if (minutes === 0 || minutes === 30) {
        next.setMinutes(minutes + 30);
    }
    else if (minutes < 30) {
        next.setMinutes(30);
    }
    else {
        next.setHours(next.getHours() + 1, 0, 0, 0);
    }
    return next;
}
function formatDateValue(date) {
    return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;
}
function formatTimeValue(date) {
    return `${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`;
}
function buildDayLabel(date, offset) {
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
    const options = [];
    for (let offset = 0; offset < 17; offset += 1) {
        const day = addDays(startOfDay(now), offset);
        const start = offset === 0 ? ceilToNextHalfHour(now) : new Date(day.getFullYear(), day.getMonth(), day.getDate(), 10, 0, 0, 0);
        const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 21, 0, 0, 0);
        const slots = [];
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
function resolveAddressType(mode) {
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
    return (0, pets_1.getPets)().filter((pet) => selectedIds.has(pet.id));
}
function isMaskedContactPhone(value) {
    return value.includes('*');
}
function getPreferredContactPhone(mode) {
    var _a, _b;
    const currentContactPhone = checkoutDraft.contactPhone.trim();
    const addressType = resolveAddressType(mode);
    const addressPhone = addressType ? (_b = (_a = (0, address_1.getSelectedAddress)(addressType)) === null || _a === void 0 ? void 0 : _a.phoneNumber.trim()) !== null && _b !== void 0 ? _b : '' : '';
    const profile = (0, profile_1.getProfile)();
    const profileContactPhone = profile.contactPhone.trim();
    const profileMaskedPhone = profile.contactPhoneMasked.trim();
    if (currentContactPhone && !isMaskedContactPhone(currentContactPhone)) {
        return currentContactPhone;
    }
    return addressPhone || profileContactPhone || currentContactPhone || profileMaskedPhone;
}
function getActiveCustomNotice() {
    const runtimeConfig = (0, runtime_config_1.getCachedCustomerRuntimeConfig)();
    if (!runtimeConfig.customNotice.enabled) {
        return '';
    }
    return runtimeConfig.customNotice.content.trim();
}
function getSubmitDisabledReasons(mode) {
    const reasons = [];
    const addressType = resolveAddressType(mode);
    const selectedAddress = addressType ? (0, address_1.getSelectedAddress)(addressType) : null;
    const customNotice = getActiveCustomNotice();
    if (!(0, cart_1.getSelectedCartFulfillmentModes)().length) {
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
function resetCheckoutDraft() {
    checkoutDraft = cloneDraft(INITIAL_DRAFT);
    (0, address_1.setCheckoutAddressType)('city');
}
function getFulfillmentModes() {
    const selectedModes = new Set((0, cart_1.getSelectedCartFulfillmentModes)());
    return FULFILLMENT_MODES
        .filter((item) => selectedModes.has(item.value))
        .map((item) => ({ ...item }));
}
function resolveActiveFulfillmentMode() {
    var _a, _b, _c;
    const modes = getFulfillmentModes();
    const currentMode = (_a = modes.find((item) => item.value === checkoutDraft.mode)) === null || _a === void 0 ? void 0 : _a.value;
    if (currentMode) {
        return currentMode;
    }
    return (_c = (_b = modes[0]) === null || _b === void 0 ? void 0 : _b.value) !== null && _c !== void 0 ? _c : 'delivery';
}
function getCheckoutDraft() {
    return cloneDraft(checkoutDraft);
}
function setFulfillmentMode(mode) {
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
        (0, address_1.setCheckoutAddressType)(addressType);
    }
}
function hydratePickupPhoneFromProfile() {
    return ensureContactPhoneFromProfile();
}
function ensureContactPhoneFromProfile(mode = checkoutDraft.mode) {
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
function setPickupPhone(value) {
    const contactPhone = value.trim();
    checkoutDraft = {
        ...checkoutDraft,
        contactPhone,
        pickupPhone: contactPhone
    };
}
function setReservationSelection(selection) {
    checkoutDraft = {
        ...checkoutDraft,
        reservationSelection: cloneReservationSelection(selection)
    };
}
function toggleSelectedPet(petId) {
    const current = new Set(checkoutDraft.selectedPetIds);
    if (current.has(petId)) {
        current.delete(petId);
    }
    else {
        current.add(petId);
    }
    checkoutDraft = {
        ...checkoutDraft,
        selectedPetIds: [...current]
    };
    return [...checkoutDraft.selectedPetIds];
}
function setCustomNoticeAcknowledged(value) {
    checkoutDraft = {
        ...checkoutDraft,
        hasReadCustomNotice: value
    };
}
function setCheckoutRemark(value) {
    checkoutDraft = {
        ...checkoutDraft,
        remark: value.trim().slice(0, 100)
    };
}
function getCheckoutViewModel(now = new Date()) {
    const activeMode = resolveActiveFulfillmentMode();
    if (checkoutDraft.mode !== activeMode) {
        checkoutDraft = {
            ...checkoutDraft,
            mode: activeMode
        };
        const addressType = resolveAddressType(activeMode);
        if (addressType) {
            (0, address_1.setCheckoutAddressType)(addressType);
        }
    }
    ensureContactPhoneFromProfile(activeMode);
    const runtimeConfig = (0, runtime_config_1.getCachedCustomerRuntimeConfig)();
    const addressType = resolveAddressType(activeMode);
    const selectedAddress = addressType ? (0, address_1.getSelectedAddress)(addressType) : null;
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
