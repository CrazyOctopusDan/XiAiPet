declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import {
  createAddress,
  getAddressById,
  updateAddress,
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
  handleSubmit(this: AddressFormPageInstance) {
    const recipientName = this.data.form.recipientName.trim();
    const phoneNumber = this.data.form.phoneNumber.trim();
    const regionLabel = this.data.form.regionLabel.trim();
    const detailAddress = this.data.form.detailAddress.trim();
    const tag = this.data.form.tag.trim() || '常用';

    if (!recipientName || !phoneNumber || !regionLabel || !detailAddress) {
      wx.showToast({ title: '请补齐地址信息', icon: 'none' });
      return;
    }

    if (this.data.mode === 'edit' && this.data.form.id) {
      updateAddress(this.data.form.id, {
        recipientName,
        phoneNumber,
        regionLabel,
        detailAddress,
        tag
      });
    } else {
      createAddress({
        type: this.data.form.type,
        recipientName,
        phoneNumber,
        regionLabel,
        detailAddress,
        tag
      });
    }

    wx.showToast({ title: this.data.mode === 'edit' ? '地址已更新' : '地址已新增', icon: 'none' });
    wx.navigateBack();
  }
});
