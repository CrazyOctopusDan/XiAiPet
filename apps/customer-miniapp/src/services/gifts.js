"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hydrateMyGifts = hydrateMyGifts;
exports.hydrateCheckoutGifts = hydrateCheckoutGifts;
exports.getMyGiftGroups = getMyGiftGroups;
exports.getCheckoutGiftOptions = getCheckoutGiftOptions;
exports.toggleCheckoutGiftSelection = toggleCheckoutGiftSelection;
exports.getSelectedCheckoutGiftIds = getSelectedCheckoutGiftIds;
exports.resetCheckoutGiftSelection = resetCheckoutGiftSelection;
exports.getSelectedCheckoutGiftSummary = getSelectedCheckoutGiftSummary;
const api_client_1 = require("./api-client");
function createEmptyGiftGroups() {
    return {
        available: [],
        locked: [],
        redeemed: [],
        expired: []
    };
}
let myGiftGroups = createEmptyGiftGroups();
let checkoutGiftOptions = [];
let selectedCheckoutGiftIds = [];
function cloneGift(gift) {
    return {
        ...gift,
        giftSnapshot: { ...gift.giftSnapshot }
    };
}
function cloneGiftGroups(groups) {
    var _a, _b, _c, _d;
    return {
        available: ((_a = groups === null || groups === void 0 ? void 0 : groups.available) !== null && _a !== void 0 ? _a : []).map(cloneGift),
        locked: ((_b = groups === null || groups === void 0 ? void 0 : groups.locked) !== null && _b !== void 0 ? _b : []).map(cloneGift),
        redeemed: ((_c = groups === null || groups === void 0 ? void 0 : groups.redeemed) !== null && _c !== void 0 ? _c : []).map(cloneGift),
        expired: ((_d = groups === null || groups === void 0 ? void 0 : groups.expired) !== null && _d !== void 0 ? _d : []).map(cloneGift)
    };
}
async function hydrateMyGifts(request = api_client_1.customerApiRequest) {
    const response = await request('/api/v1/customer/gifts', {
        method: 'GET',
        auth: 'customer'
    });
    myGiftGroups = cloneGiftGroups(response.groups);
    return getMyGiftGroups();
}
async function hydrateCheckoutGifts(request = api_client_1.customerApiRequest) {
    var _a;
    const response = await request('/api/v1/customer/checkout-gifts', {
        method: 'GET',
        auth: 'customer'
    });
    checkoutGiftOptions = ((_a = response.gifts) !== null && _a !== void 0 ? _a : []).map(cloneGift);
    const validIds = new Set(checkoutGiftOptions.map((gift) => gift.id));
    selectedCheckoutGiftIds = selectedCheckoutGiftIds.filter((giftId) => validIds.has(giftId));
    return getCheckoutGiftOptions();
}
function getMyGiftGroups() {
    return cloneGiftGroups(myGiftGroups);
}
function getCheckoutGiftOptions() {
    const selectedIds = new Set(selectedCheckoutGiftIds);
    return checkoutGiftOptions.map((gift) => ({
        ...cloneGift(gift),
        selected: selectedIds.has(gift.id)
    }));
}
function toggleCheckoutGiftSelection(giftId) {
    const optionIds = new Set(checkoutGiftOptions.map((gift) => gift.id));
    if (!optionIds.has(giftId)) {
        return getSelectedCheckoutGiftIds();
    }
    const current = new Set(selectedCheckoutGiftIds);
    if (current.has(giftId)) {
        current.delete(giftId);
    }
    else {
        current.add(giftId);
    }
    selectedCheckoutGiftIds = checkoutGiftOptions.filter((gift) => current.has(gift.id)).map((gift) => gift.id);
    return getSelectedCheckoutGiftIds();
}
function getSelectedCheckoutGiftIds() {
    return [...selectedCheckoutGiftIds];
}
function resetCheckoutGiftSelection() {
    selectedCheckoutGiftIds = [];
}
function getSelectedCheckoutGiftSummary() {
    const selectedIds = new Set(selectedCheckoutGiftIds);
    return checkoutGiftOptions.filter((gift) => selectedIds.has(gift.id)).map(cloneGift);
}
