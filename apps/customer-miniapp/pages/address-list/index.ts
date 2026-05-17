declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import {
  clearAddressSelectionRequest,
  getAddressSelectionRequest,
  getAddresses,
  getCheckoutAddressType,
  getSelectedAddress,
  hydrateAddresses,
  persistSelectedAddress,
  selectAddress,
  setCheckoutAddressType,
  type AddressType,
  type CustomerAddress
} from '../../src/services/address';

interface AddressListPageData {
  addressTypes: Array<{ value: AddressType; label: string; hint: string }>;
  activeType: AddressType;
  addresses: CustomerAddress[];
  selectedAddressId: string;
  isCheckoutSelection: boolean;
}

interface AddressListPageInstance {
  data: AddressListPageData;
  setData(data: Record<string, unknown>): void;
  refreshAddresses(): Promise<void>;
}

Page({
  data: {
    addressTypes: [
      { value: 'city', label: '同城配送', hint: '附近门店和店员配送' },
      { value: 'express', label: '快递到家', hint: '跨区或异地下单' }
    ],
    activeType: getCheckoutAddressType(),
    addresses: [],
    selectedAddressId: '',
    isCheckoutSelection: false
  },
  onLoad(this: AddressListPageInstance, options?: { type?: AddressType; source?: string }) {
    const activeType = options?.type === 'express' ? 'express' : 'city';
    const isCheckoutSelection = options?.source === 'checkout' || getAddressSelectionRequest()?.target === 'checkout';

    setCheckoutAddressType(activeType);
    this.setData({
      activeType,
      isCheckoutSelection
    });
  },
  onShow(this: AddressListPageInstance) {
    void this.refreshAddresses();
  },
  async refreshAddresses(this: AddressListPageInstance) {
    const render = () => {
      const selectedAddress = getSelectedAddress(this.data.activeType);
      const request = getAddressSelectionRequest();

      this.setData({
        addresses: getAddresses(this.data.activeType),
        selectedAddressId: selectedAddress?.id ?? '',
        isCheckoutSelection: request?.target === 'checkout'
      });
    };

    render();

    try {
      await hydrateAddresses();
    } catch {
      // Keep the last local address snapshot visible if the network is unavailable.
    }
    render();
  },
  handleTypeTap(this: AddressListPageInstance, event: { currentTarget?: { dataset?: { type?: AddressType } } }) {
    const type = event.currentTarget?.dataset?.type;

    if (!type) {
      return;
    }

    setCheckoutAddressType(type);
    this.setData({ activeType: type });
    void this.refreshAddresses();
  },
  handleAddAddress(this: AddressListPageInstance) {
    wx.navigateTo({
      url: `/pages/address-form/index?type=${this.data.activeType}`
    });
  },
  handleEditAddress(event: { currentTarget?: { dataset?: { addressId?: string } } }) {
    const addressId = event.currentTarget?.dataset?.addressId;

    if (!addressId) {
      return;
    }

    wx.navigateTo({
      url: `/pages/address-form/index?id=${addressId}`
    });
  },
  async handleSelectAddress(this: AddressListPageInstance, event: { currentTarget?: { dataset?: { addressId?: string } } }) {
    const addressId = event.currentTarget?.dataset?.addressId;

    if (!addressId) {
      return;
    }

    const selected = selectAddress(addressId);
    setCheckoutAddressType(selected.type);

    try {
      await persistSelectedAddress(addressId);
    } catch {
      wx.showToast({ title: '默认地址同步失败', icon: 'none' });
      this.refreshAddresses();
      return;
    }

    if (this.data.isCheckoutSelection) {
      clearAddressSelectionRequest();
      wx.navigateBack();
      return;
    }

    void this.refreshAddresses();
    wx.showToast({ title: '默认地址已更新', icon: 'none' });
  }
});
