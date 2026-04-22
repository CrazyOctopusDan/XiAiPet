"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetAddresses = resetAddresses;
exports.getAddresses = getAddresses;
exports.getAddressById = getAddressById;
exports.createAddress = createAddress;
exports.updateAddress = updateAddress;
exports.selectAddress = selectAddress;
exports.getSelectedAddress = getSelectedAddress;
exports.setCheckoutAddressType = setCheckoutAddressType;
exports.getCheckoutAddressType = getCheckoutAddressType;
exports.beginAddressSelection = beginAddressSelection;
exports.getAddressSelectionRequest = getAddressSelectionRequest;
exports.clearAddressSelectionRequest = clearAddressSelectionRequest;
const initialAddresses = [
    {
        id: 'address-city-home',
        type: 'city',
        recipientName: '虾衣妈妈',
        phoneNumber: '13800001234',
        regionLabel: '上海市 静安区',
        detailAddress: '南京西路 1266 号 8 楼',
        tag: '家'
    },
    {
        id: 'address-city-studio',
        type: 'city',
        recipientName: '虾衣爸爸',
        phoneNumber: '13700004567',
        regionLabel: '上海市 徐汇区',
        detailAddress: '永嘉路 511 弄 12 号',
        tag: '工作室'
    },
    {
        id: 'address-express-home',
        type: 'express',
        recipientName: '奶油',
        phoneNumber: '13600007890',
        regionLabel: '浙江省 杭州市 西湖区',
        detailAddress: '文三路 90 号 2 单元 1102',
        tag: '家'
    },
    {
        id: 'address-express-office',
        type: 'express',
        recipientName: '雪团',
        phoneNumber: '13500004321',
        regionLabel: '江苏省 苏州市 工业园区',
        detailAddress: '苏雅路 158 号 5 幢 603',
        tag: '公司'
    }
];
const initialSelectedIds = {
    city: 'address-city-home',
    express: 'address-express-home'
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
