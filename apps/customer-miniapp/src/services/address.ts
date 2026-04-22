export type AddressType = 'city' | 'express';

export type AddressSelectionTarget = 'checkout';

export interface CustomerAddress {
  id: string;
  type: AddressType;
  recipientName: string;
  phoneNumber: string;
  regionLabel: string;
  detailAddress: string;
  tag: string;
}

interface CreateAddressInput {
  type: AddressType;
  recipientName: string;
  phoneNumber: string;
  regionLabel: string;
  detailAddress: string;
  tag: string;
}

interface UpdateAddressInput {
  recipientName?: string;
  phoneNumber?: string;
  regionLabel?: string;
  detailAddress?: string;
  tag?: string;
}

interface AddressSelectionRequest {
  target: AddressSelectionTarget;
  type: AddressType;
}

const initialAddresses: CustomerAddress[] = [
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

const initialSelectedIds: Record<AddressType, string> = {
  city: 'address-city-home',
  express: 'address-express-home'
};

let addresses = initialAddresses.map((item) => ({ ...item }));
let selectedIds = { ...initialSelectedIds };
let checkoutAddressType: AddressType = 'city';
let selectionRequest: AddressSelectionRequest | null = null;
let nextAddressId = 1;

function cloneAddress(address: CustomerAddress) {
  return { ...address };
}

function cloneAddresses(list: CustomerAddress[]) {
  return list.map(cloneAddress);
}

function sortAddresses(list: CustomerAddress[]) {
  return [...list].sort((left, right) => {
    const leftSelected = selectedIds[left.type] === left.id ? 1 : 0;
    const rightSelected = selectedIds[right.type] === right.id ? 1 : 0;

    if (leftSelected !== rightSelected) {
      return rightSelected - leftSelected;
    }

    return left.id.localeCompare(right.id);
  });
}

function getAddressIndexById(addressId: string) {
  return addresses.findIndex((item) => item.id === addressId);
}

export function resetAddresses() {
  addresses = initialAddresses.map((item) => ({ ...item }));
  selectedIds = { ...initialSelectedIds };
  checkoutAddressType = 'city';
  selectionRequest = null;
  nextAddressId = 1;
}

export function getAddresses(type?: AddressType) {
  if (!type) {
    return cloneAddresses(sortAddresses(addresses));
  }

  return cloneAddresses(sortAddresses(addresses.filter((item) => item.type === type)));
}

export function getAddressById(addressId: string) {
  const address = addresses.find((item) => item.id === addressId);
  return address ? cloneAddress(address) : null;
}

export function createAddress(input: CreateAddressInput) {
  const created: CustomerAddress = {
    id: `address-${input.type}-${nextAddressId++}`,
    ...input
  };

  addresses = [created, ...addresses];
  return cloneAddress(created);
}

export function updateAddress(addressId: string, updates: UpdateAddressInput) {
  const index = getAddressIndexById(addressId);

  if (index < 0) {
    throw new Error(`address_not_found:${addressId}`);
  }

  const current = addresses[index];
  const updated: CustomerAddress = {
    ...current,
    ...updates,
    type: current.type
  };

  addresses = addresses.map((item, itemIndex) => (itemIndex === index ? updated : item));
  return cloneAddress(updated);
}

export function selectAddress(addressId: string) {
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

export function getSelectedAddress(type: AddressType) {
  const selectedId = selectedIds[type];
  const address = selectedId ? addresses.find((item) => item.id === selectedId) : null;
  return address ? cloneAddress(address) : null;
}

export function setCheckoutAddressType(type: AddressType) {
  checkoutAddressType = type;
}

export function getCheckoutAddressType() {
  return checkoutAddressType;
}

export function beginAddressSelection(target: AddressSelectionTarget, type: AddressType) {
  selectionRequest = {
    target,
    type
  };
  checkoutAddressType = type;
}

export function getAddressSelectionRequest() {
  return selectionRequest ? { ...selectionRequest } : null;
}

export function clearAddressSelectionRequest() {
  selectionRequest = null;
}
