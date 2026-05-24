"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetAddresses = resetAddresses;
exports.getAddresses = getAddresses;
exports.getAddressById = getAddressById;
exports.createAddress = createAddress;
exports.hydrateAddresses = hydrateAddresses;
exports.createAddressRemote = createAddressRemote;
exports.updateAddress = updateAddress;
exports.updateAddressRemote = updateAddressRemote;
exports.selectAddress = selectAddress;
exports.persistSelectedAddress = persistSelectedAddress;
exports.getSelectedAddress = getSelectedAddress;
exports.setCheckoutAddressType = setCheckoutAddressType;
exports.getCheckoutAddressType = getCheckoutAddressType;
exports.beginAddressSelection = beginAddressSelection;
exports.getAddressSelectionRequest = getAddressSelectionRequest;
exports.clearAddressSelectionRequest = clearAddressSelectionRequest;
const api_client_1 = require("./api-client");
const initialAddresses = [];
const initialSelectedIds = {
    city: '',
    express: ''
};
let addresses = initialAddresses.map((item) => ({ ...item }));
let selectedIds = { ...initialSelectedIds };
let checkoutAddressType = 'city';
let selectionRequest = null;
let nextAddressId = 1;
function cloneAddress(address) {
    return { ...address };
}
function cloneAddresses(list) {
    return list.map(cloneAddress);
}
function sortAddresses(list) {
    return [...list].sort((left, right) => {
        const leftSelected = selectedIds[left.type] === left.id ? 1 : 0;
        const rightSelected = selectedIds[right.type] === right.id ? 1 : 0;
        if (leftSelected !== rightSelected) {
            return rightSelected - leftSelected;
        }
        return left.id.localeCompare(right.id);
    });
}
function getAddressIndexById(addressId) {
    return addresses.findIndex((item) => item.id === addressId);
}
function replaceAddress(address) {
    const index = getAddressIndexById(address.id);
    addresses = index >= 0
        ? addresses.map((item) => (item.id === address.id ? { ...address } : item))
        : [{ ...address }, ...addresses];
    if (address.isDefault) {
        selectedIds = {
            ...selectedIds,
            [address.type]: address.id
        };
    }
    return cloneAddress(address);
}
function replaceAddresses(nextAddresses) {
    addresses = nextAddresses.map((item) => ({ ...item }));
    selectedIds = nextAddresses.reduce((current, address) => address.isDefault
        ? { ...current, [address.type]: address.id }
        : current, {});
}
function resetAddresses() {
    addresses = initialAddresses.map((item) => ({ ...item }));
    selectedIds = { ...initialSelectedIds };
    checkoutAddressType = 'city';
    selectionRequest = null;
    nextAddressId = 1;
}
function getAddresses(type) {
    if (!type) {
        return cloneAddresses(sortAddresses(addresses));
    }
    return cloneAddresses(sortAddresses(addresses.filter((item) => item.type === type)));
}
function getAddressById(addressId) {
    const address = addresses.find((item) => item.id === addressId);
    return address ? cloneAddress(address) : null;
}
function createAddress(input) {
    const created = {
        id: `address-${input.type}-${nextAddressId++}`,
        ...input
    };
    addresses = [created, ...addresses];
    return cloneAddress(created);
}
async function hydrateAddresses(request = api_client_1.customerApiRequest) {
    var _a;
    const response = await request('/api/v1/customer/addresses', {
        method: 'GET',
        auth: 'customer'
    });
    replaceAddresses((_a = response.addresses) !== null && _a !== void 0 ? _a : []);
    return getAddresses();
}
async function createAddressRemote(input, request = api_client_1.customerApiRequest) {
    var _a;
    const response = await request('/api/v1/customer/addresses', {
        method: 'POST',
        auth: 'customer',
        body: input
    });
    return replaceAddress((_a = response.address) !== null && _a !== void 0 ? _a : createAddress(input));
}
function updateAddress(addressId, updates) {
    const index = getAddressIndexById(addressId);
    if (index < 0) {
        throw new Error(`address_not_found:${addressId}`);
    }
    const current = addresses[index];
    const updated = {
        ...current,
        ...updates,
        type: current.type
    };
    addresses = addresses.map((item, itemIndex) => (itemIndex === index ? updated : item));
    return cloneAddress(updated);
}
async function updateAddressRemote(addressId, updates, request = api_client_1.customerApiRequest) {
    var _a;
    const response = await request(`/api/v1/customer/addresses/${addressId}`, {
        method: 'PUT',
        auth: 'customer',
        body: updates
    });
    return replaceAddress((_a = response.address) !== null && _a !== void 0 ? _a : updateAddress(addressId, updates));
}
function selectAddress(addressId) {
    const address = addresses.find((item) => item.id === addressId);
    if (!address) {
        throw new Error(`address_not_found:${addressId}`);
    }
    selectedIds = {
        ...selectedIds,
        [address.type]: address.id
    };
    return cloneAddress(address);
}
async function persistSelectedAddress(addressId, request = api_client_1.customerApiRequest) {
    var _a;
    const response = await request(`/api/v1/customer/addresses/${addressId}/default`, {
        method: 'PUT',
        auth: 'customer'
    });
    if (response.address) {
        replaceAddress(response.address);
    }
    return selectAddress(((_a = response.address) !== null && _a !== void 0 ? _a : { id: addressId }).id);
}
function getSelectedAddress(type) {
    const selectedId = selectedIds[type];
    const address = selectedId ? addresses.find((item) => item.id === selectedId) : null;
    return address ? cloneAddress(address) : null;
}
function setCheckoutAddressType(type) {
    checkoutAddressType = type;
}
function getCheckoutAddressType() {
    return checkoutAddressType;
}
function beginAddressSelection(target, type) {
    selectionRequest = {
        target,
        type
    };
    checkoutAddressType = type;
}
function getAddressSelectionRequest() {
    return selectionRequest ? { ...selectionRequest } : null;
}
function clearAddressSelectionRequest() {
    selectionRequest = null;
}
