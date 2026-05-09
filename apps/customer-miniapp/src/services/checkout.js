"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetCheckoutDraft = resetCheckoutDraft;
exports.getFulfillmentModes = getFulfillmentModes;
exports.getCheckoutDraft = getCheckoutDraft;
exports.setFulfillmentMode = setFulfillmentMode;
exports.hydratePickupPhoneFromProfile = hydratePickupPhoneFromProfile;
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
const FULFILLMENT_MODES = [
    {
        value: 'delivery',
        label: '配送',
        hint: '同城地址 + 预约时间'
    },
    {
        value: 'pickup',
        label: '自取',
        hint: '到店自提 + 预留电话'
    },
    {
        value: 'express',
        label: '快递',
        hint: '快递地址直达'
    }
];
const INITIAL_DRAFT = {
    mode: 'delivery',
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
    if (addressType && !selectedAddress) {
        reasons.push('missing_address');
    }
    if ((mode === 'delivery' || mode === 'pickup') && !checkoutDraft.reservationSelection) {
        reasons.push('missing_reservation');
    }
    if (mode === 'pickup' && !checkoutDraft.pickupPhone.trim()) {
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
    return FULFILLMENT_MODES.map((item) => ({ ...item }));
}
function getCheckoutDraft() {
    return cloneDraft(checkoutDraft);
}
function setFulfillmentMode(mode) {
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
    const profile = (0, profile_1.getProfile)();
    if (!profile.contactPhoneMasked) {
        return '';
    }
    checkoutDraft = {
        ...checkoutDraft,
        pickupPhone: profile.contactPhoneMasked
    };
    return checkoutDraft.pickupPhone;
}
function setPickupPhone(value) {
    checkoutDraft = {
        ...checkoutDraft,
        pickupPhone: value.trim()
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
        remark: value.trim()
    };
}
function getCheckoutViewModel(now = new Date()) {
    const runtimeConfig = (0, runtime_config_1.getCachedCustomerRuntimeConfig)();
    const addressType = resolveAddressType(checkoutDraft.mode);
    const selectedAddress = addressType ? (0, address_1.getSelectedAddress)(addressType) : null;
    const submitDisabledReasons = getSubmitDisabledReasons(checkoutDraft.mode);
    return {
        mode: checkoutDraft.mode,
        addressType,
        selectedAddress,
        selectedPets: getSelectedPets(),
        pickupPhone: checkoutDraft.pickupPhone,
        reservationSelection: cloneReservationSelection(checkoutDraft.reservationSelection),
        reservationOptions: checkoutDraft.mode === 'express' ? [] : buildReservationOptions(now),
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
        storePhone: runtimeConfig.store.contactPhone,
        deliveryRuleExplainers: runtimeConfig.deliveryRules.tiers.map((item) => item.explainer)
    };
}
