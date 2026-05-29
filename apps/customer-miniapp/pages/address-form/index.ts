declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import {
  createAddressRemote,
  getAddressById,
  updateAddressRemote,
  type AddressType
} from '../../src/services/address';

interface AddressFormValue {
  id: string;
  type: AddressType;
  recipientName: string;
  phoneNumber: string;
  regionLabel: string;
  detailAddress: string;
  tag: string;
  latitude?: number;
  longitude?: number;
}

interface AddressFormPageData {
  mode: 'create' | 'edit';
  typeLabel: string;
  form: AddressFormValue;
}

interface AddressFormPageInstance {
  data: AddressFormPageData;
  setData(data: Record<string, unknown>): void;
}

function createEmptyForm(type: AddressType): AddressFormValue {
  return {
    id: '',
    type,
    recipientName: '',
    phoneNumber: '',
    regionLabel: '',
    detailAddress: '',
    tag: ''
  };
}

function getTypeLabel(type: AddressType) {
  return type === 'express' ? '快递地址' : '同城地址';
}

function hasLocation(value: AddressFormValue) {
  return typeof value.latitude === 'number' && Number.isFinite(value.latitude) &&
    typeof value.longitude === 'number' && Number.isFinite(value.longitude);
}

Page({
  data: {
    mode: 'create',
    typeLabel: '同城地址',
    form: createEmptyForm('city')
  },
  onLoad(this: AddressFormPageInstance, options?: { id?: string; type?: AddressType }) {
    const editingAddress = options?.id ? getAddressById(options.id) : null;
    const type = editingAddress?.type ?? (options?.type === 'express' ? 'express' : 'city');

    this.setData({
      mode: editingAddress ? 'edit' : 'create',
      typeLabel: getTypeLabel(type),
      form: editingAddress ? { ...editingAddress } : createEmptyForm(type)
    });
  },
  handleRecipientInput(this: AddressFormPageInstance, event: { detail?: { value?: string } }) {
    this.setData({
      form: {
        ...this.data.form,
        recipientName: event.detail?.value ?? ''
      }
    });
  },
  handlePhoneInput(this: AddressFormPageInstance, event: { detail?: { value?: string } }) {
    this.setData({
      form: {
        ...this.data.form,
        phoneNumber: event.detail?.value ?? ''
      }
    });
  },
  handleRegionInput(this: AddressFormPageInstance, event: { detail?: { value?: string } }) {
    this.setData({
      form: {
        ...this.data.form,
        regionLabel: event.detail?.value ?? ''
      }
    });
  },
  handleDetailInput(this: AddressFormPageInstance, event: { detail?: { value?: string } }) {
    this.setData({
      form: {
        ...this.data.form,
        detailAddress: event.detail?.value ?? ''
      }
    });
  },
  handleTagInput(this: AddressFormPageInstance, event: { detail?: { value?: string } }) {
    this.setData({
      form: {
        ...this.data.form,
        tag: event.detail?.value ?? ''
      }
    });
  },
  handleChooseLocation(this: AddressFormPageInstance) {
    wx.chooseLocation({
      success: (result: { name?: string; address?: string; latitude?: number; longitude?: number }) => {
        const address = (result.address ?? '').trim();
        const name = (result.name ?? '').trim();
        const latitude = result.latitude;
        const longitude = result.longitude;

        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
          wx.showToast({ title: '未获取到经纬度，请重新选择', icon: 'none' });
          return;
        }

        this.setData({
          form: {
            ...this.data.form,
            regionLabel: address || this.data.form.regionLabel,
            detailAddress: name || this.data.form.detailAddress,
            latitude,
            longitude
          }
        });
      },
      fail: (error: { errMsg?: string }) => {
        if (error.errMsg?.includes('cancel')) {
          wx.showToast({ title: '位置选择已取消', icon: 'none' });
          return;
        }
        wx.showToast({ title: '位置选择失败，请重试', icon: 'none' });
      }
    });
  },
  async handleSubmit(this: AddressFormPageInstance) {
    const recipientName = this.data.form.recipientName.trim();
    const phoneNumber = this.data.form.phoneNumber.trim();
    const regionLabel = this.data.form.regionLabel.trim();
    const detailAddress = this.data.form.detailAddress.trim();
    const tag = this.data.form.tag.trim() || '常用';

    if (!recipientName || !phoneNumber || !regionLabel || !detailAddress) {
      wx.showToast({ title: '请补齐地址信息', icon: 'none' });
      return;
    }

    if (this.data.form.type === 'city' && !hasLocation(this.data.form)) {
      wx.showToast({ title: '请选择地图地址，用于计算配送费', icon: 'none' });
      return;
    }

    try {
      if (this.data.mode === 'edit' && this.data.form.id) {
        await updateAddressRemote(this.data.form.id, {
          recipientName,
          phoneNumber,
          regionLabel,
          detailAddress,
          tag,
          latitude: this.data.form.latitude,
          longitude: this.data.form.longitude
        });
      } else {
        await createAddressRemote({
          type: this.data.form.type,
          recipientName,
          phoneNumber,
          regionLabel,
          detailAddress,
          tag,
          latitude: this.data.form.latitude,
          longitude: this.data.form.longitude
        });
      }
    } catch {
      wx.showToast({ title: '地址保存失败', icon: 'none' });
      return;
    }

    wx.showToast({ title: this.data.mode === 'edit' ? '地址已更新' : '地址已新增', icon: 'none' });
    wx.navigateBack();
  }
});
