declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import {
  createExpressAddressInputFromCity,
  createAddressRemote,
  getAddressById,
  getSelectedAddress,
  persistSelectedAddress,
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
  showSyncExpressAddress: boolean;
  syncExpressAddress: boolean;
  recognitionModalVisible: boolean;
  recognitionInput: string;
  locationPrivacyAuthorizationRequired: boolean;
  privacyContractName: string;
}

interface AddressFormPageInstance {
  data: AddressFormPageData;
  setData(data: Record<string, unknown>): void;
  handleChooseLocation(): void;
  handleRequestLocationPrivacy(): void;
  handleAgreeLocationPrivacyAuthorization(): void;
  handleRecognitionButtonTap(): void;
  handleRecognitionInput(event: { detail?: { value?: string } }): void;
  handleCloseRecognitionModal(): void;
  handleRecognitionModalTap(): void;
  handleApplyRecognition(): void;
  applyLocationSelection(result: { name?: string; address?: string; latitude: number; longitude: number }): void;
  pendingLocationPrivacyResolve?: (result: { event: string; buttonId?: string }) => void;
  resolvingLocationPrivacyAuthorization?: boolean;
  lastLocationPrivacyAuthorizationAt?: number;
}

interface AddressRecognitionResult {
  recipientName?: string;
  phoneNumber?: string;
  regionLabel?: string;
  detailAddress?: string;
}

const NAME_LABEL_PATTERN = /^(?:收件人|收货人|联系人|姓名|名字)\s*[:：]?\s*(.+)$/;
const PHONE_LABEL_PATTERN = /^(?:手机号码|手机号|手机|联系电话|电话|联系方式)\s*[:：]?\s*(.+)$/;
const REGION_LABEL_PATTERN = /^(?:所在地区|地区|省市区|省市县|省市|区域)\s*[:：]?\s*(.+)$/;
const DETAIL_LABEL_PATTERN = /^(?:详细地址|地址详情|门牌号|街道地址|收货地址|地址)\s*[:：]?\s*(.+)$/;
const PHONE_PATTERN = /(?:^|[^\d])((?:\+?86[-\s]?)?1[3-9]\d(?:[-\s]?\d{4}){2})(?!\d)/;
const ADMIN_SUFFIX_PATTERN = /(特别行政区|自治区|自治州|自治县|地区|街道|省|市|区|县|旗|镇|乡)/g;

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

function isPrivacyLocationFailure(errMsg = '') {
  return errMsg.includes('privacy') || errMsg.includes('authorize') || errMsg.includes('auth deny');
}

function isLocationScopeConfigurationFailure(error: { errMsg?: string; errno?: number }) {
  return error.errno === 112 || (error.errMsg ?? '').includes('api scope is not declared');
}

function normalizeRecognitionLine(value: string) {
  return value
    .replace(/\u3000/g, ' ')
    .replace(/[，,；;]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeRecognitionInput(value: string) {
  return value
    .replace(/\r/g, '\n')
    .split('\n')
    .map(normalizeRecognitionLine)
    .filter(Boolean);
}

function normalizePhoneNumber(value: string) {
  const match = value.match(PHONE_PATTERN);

  if (!match?.[1]) {
    return '';
  }

  const digits = match[1].replace(/\D/g, '');
  return digits.length > 11 && digits.startsWith('86') ? digits.slice(-11) : digits;
}

function removePhoneNumber(value: string, phoneNumber: string) {
  if (!phoneNumber) {
    return value;
  }

  const spacedPhone = phoneNumber.replace(/(\d{3})(\d{4})(\d{4})/, '$1\\s*[- ]?\\s*$2\\s*[- ]?\\s*$3');
  return value
    .replace(new RegExp(`(?:\\+?86\\s*[- ]?\\s*)?${spacedPhone}`), ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitRegionAndDetail(value: string) {
  const normalized = normalizeRecognitionLine(value);

  if (!normalized) {
    return {};
  }

  let lastAdminEnd = 0;
  let match: RegExpExecArray | null;
  ADMIN_SUFFIX_PATTERN.lastIndex = 0;

  while ((match = ADMIN_SUFFIX_PATTERN.exec(normalized))) {
    const nextEnd = match.index + match[0].length;

    if (nextEnd <= 32) {
      lastAdminEnd = nextEnd;
    }
  }

  if (lastAdminEnd > 0 && lastAdminEnd < normalized.length) {
    return {
      regionLabel: normalized.slice(0, lastAdminEnd).trim(),
      detailAddress: normalized.slice(lastAdminEnd).trim()
    };
  }

  return {
    detailAddress: normalized
  };
}

function parseAddressRecognitionInput(value: string): AddressRecognitionResult {
  const lines = normalizeRecognitionInput(value);
  const result: AddressRecognitionResult = {};
  const unstructuredLines: string[] = [];

  for (const line of lines) {
    const nameMatch = line.match(NAME_LABEL_PATTERN);
    const phoneMatch = line.match(PHONE_LABEL_PATTERN);
    const regionMatch = line.match(REGION_LABEL_PATTERN);
    const detailMatch = line.match(DETAIL_LABEL_PATTERN);

    if (nameMatch?.[1]) {
      result.recipientName = normalizeRecognitionLine(nameMatch[1]);
      continue;
    }

    if (phoneMatch?.[1]) {
      result.phoneNumber = normalizePhoneNumber(phoneMatch[1]) || normalizeRecognitionLine(phoneMatch[1]);
      continue;
    }

    if (regionMatch?.[1]) {
      result.regionLabel = normalizeRecognitionLine(regionMatch[1]);
      continue;
    }

    if (detailMatch?.[1]) {
      result.detailAddress = normalizeRecognitionLine(detailMatch[1]);
      continue;
    }

    unstructuredLines.push(line);
  }

  const combined = unstructuredLines.join(' ');
  const phoneNumber = result.phoneNumber || normalizePhoneNumber(combined);

  if (phoneNumber) {
    result.phoneNumber = phoneNumber;
  }

  let addressText = removePhoneNumber(combined, result.phoneNumber ?? '');
  const segments = addressText.split(/\s+/).map(normalizeRecognitionLine).filter(Boolean);
  const firstAddressSegmentIndex = segments.findIndex((segment) => /[省市区县镇乡街道路号幢栋单元室]/.test(segment));

  if (!result.recipientName && firstAddressSegmentIndex > 0) {
    result.recipientName = segments.slice(0, firstAddressSegmentIndex).join(' ');
    addressText = segments.slice(firstAddressSegmentIndex).join('');
  } else if (result.recipientName) {
    addressText = addressText.replace(result.recipientName, '').trim();
  } else {
    addressText = segments.join('');
  }

  if (!result.regionLabel || !result.detailAddress) {
    const split = splitRegionAndDetail(addressText);

    result.regionLabel = result.regionLabel || split.regionLabel;
    result.detailAddress = result.detailAddress || split.detailAddress;
  }

  if (!result.regionLabel && result.detailAddress) {
    const split = splitRegionAndDetail(result.detailAddress);

    if (split.regionLabel && split.detailAddress) {
      result.regionLabel = split.regionLabel;
      result.detailAddress = split.detailAddress;
    }
  }

  return Object.fromEntries(
    Object.entries(result).filter(([, entryValue]) => Boolean(entryValue?.trim()))
  ) as AddressRecognitionResult;
}

Page({
  data: {
    mode: 'create',
    typeLabel: '同城地址',
    form: createEmptyForm('city'),
    showSyncExpressAddress: true,
    syncExpressAddress: false,
    recognitionModalVisible: false,
    recognitionInput: '',
    locationPrivacyAuthorizationRequired: false,
    privacyContractName: '隐私保护指引'
  },
  onLoad(this: AddressFormPageInstance, options?: { id?: string; type?: AddressType }) {
    wx.onNeedPrivacyAuthorization?.((resolve: (result: { event: string; buttonId?: string }) => void) => {
      this.pendingLocationPrivacyResolve = resolve;
      this.setData({
        locationPrivacyAuthorizationRequired: true
      });
    });

    const editingAddress = options?.id ? getAddressById(options.id) : null;
    const type = editingAddress?.type ?? (options?.type === 'express' ? 'express' : 'city');
    const showSyncExpressAddress = !editingAddress && type === 'city';

    this.setData({
      mode: editingAddress ? 'edit' : 'create',
      typeLabel: getTypeLabel(type),
      form: editingAddress ? { ...editingAddress } : createEmptyForm(type),
      showSyncExpressAddress,
      syncExpressAddress: false,
      recognitionModalVisible: false,
      recognitionInput: '',
      locationPrivacyAuthorizationRequired: false
    });
  },
  onShow(this: AddressFormPageInstance) {
    wx.getPrivacySetting?.({
      success: (result: { needAuthorization?: boolean; privacyContractName?: string }) => {
        this.setData({
          locationPrivacyAuthorizationRequired: Boolean(result.needAuthorization),
          privacyContractName: result.privacyContractName || '隐私保护指引'
        });
      }
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
  handleSyncExpressTap(this: AddressFormPageInstance) {
    if (!this.data.showSyncExpressAddress) {
      return;
    }

    this.setData({
      syncExpressAddress: !this.data.syncExpressAddress
    });
  },
  handleRecognitionButtonTap(this: AddressFormPageInstance) {
    this.setData({
      recognitionModalVisible: true,
      recognitionInput: ''
    });
  },
  handleRecognitionInput(this: AddressFormPageInstance, event: { detail?: { value?: string } }) {
    this.setData({
      recognitionInput: event.detail?.value ?? ''
    });
  },
  handleCloseRecognitionModal(this: AddressFormPageInstance) {
    this.setData({
      recognitionModalVisible: false,
      recognitionInput: ''
    });
  },
  handleRecognitionModalTap() {
    // Stops overlay taps from closing the modal content in the miniapp event model.
  },
  handleApplyRecognition(this: AddressFormPageInstance) {
    const parsed = parseAddressRecognitionInput(this.data.recognitionInput);

    if (!parsed.recipientName && !parsed.phoneNumber && !parsed.regionLabel && !parsed.detailAddress) {
      wx.showToast({ title: '未识别到地址信息', icon: 'none' });
      return;
    }

    const nextForm: AddressFormValue = {
      ...this.data.form,
      ...parsed
    };

    if (nextForm.type === 'city') {
      delete nextForm.latitude;
      delete nextForm.longitude;
    }

    this.setData({
      form: nextForm,
      recognitionModalVisible: false,
      recognitionInput: ''
    });
    wx.showToast({ title: '已填入地址信息', icon: 'none' });
  },
  handleLocationButtonTap(this: AddressFormPageInstance) {
    this.handleRequestLocationPrivacy();
  },
  handleRequestLocationPrivacy(this: AddressFormPageInstance) {
    if (wx.requirePrivacyAuthorize) {
      wx.requirePrivacyAuthorize({
        success: () => {
          this.setData({ locationPrivacyAuthorizationRequired: false });
          this.handleChooseLocation();
        },
        fail: () => {
          this.setData({ locationPrivacyAuthorizationRequired: true });
          wx.showToast({ title: '请先同意隐私保护指引，再选择位置', icon: 'none' });
        }
      });
      return;
    }

    this.handleChooseLocation();
  },
  handleAgreeLocationPrivacyAuthorization(this: AddressFormPageInstance) {
    const now = Date.now();

    if (this.lastLocationPrivacyAuthorizationAt && now - this.lastLocationPrivacyAuthorizationAt < 600) {
      return;
    }

    if (this.resolvingLocationPrivacyAuthorization) {
      return;
    }

    this.lastLocationPrivacyAuthorizationAt = now;
    this.resolvingLocationPrivacyAuthorization = true;
    const finish = () => {
      this.resolvingLocationPrivacyAuthorization = false;
    };

    if (this.pendingLocationPrivacyResolve) {
      const resolve = this.pendingLocationPrivacyResolve;
      this.pendingLocationPrivacyResolve = undefined;
      resolve({
        event: 'agree',
        buttonId: 'location-privacy-agree'
      });
      finish();
      this.setData({ locationPrivacyAuthorizationRequired: false });
      return;
    }

    finish();
    this.setData({ locationPrivacyAuthorizationRequired: false });
    this.handleChooseLocation();
  },
  applyLocationSelection(this: AddressFormPageInstance, result: { name?: string; address?: string; latitude: number; longitude: number }) {
    const address = (result.address ?? '').trim();
    const name = (result.name ?? '').trim();

    this.setData({
      form: {
        ...this.data.form,
        regionLabel: address || this.data.form.regionLabel,
        detailAddress: name || this.data.form.detailAddress,
        latitude: result.latitude,
        longitude: result.longitude
      }
    });
  },
  handleChooseLocation(this: AddressFormPageInstance) {
    const options: {
      latitude?: number;
      longitude?: number;
      success: (result: { name?: string; address?: string; latitude?: number; longitude?: number }) => void;
      fail: (error: { errMsg?: string; errno?: number }) => void;
    } = {
      success: (result: { name?: string; address?: string; latitude?: number; longitude?: number }) => {
        const latitude = result.latitude;
        const longitude = result.longitude;

        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
          wx.showToast({ title: '未获取到经纬度，请重新选择', icon: 'none' });
          return;
        }

        this.applyLocationSelection({
          name: result.name,
          address: result.address,
          latitude,
          longitude
        });
      },
      fail: (error: { errMsg?: string; errno?: number }) => {
        if (error.errMsg?.includes('cancel')) {
          wx.showToast({ title: '位置选择已取消', icon: 'none' });
          return;
        }
        if (isLocationScopeConfigurationFailure(error)) {
          wx.showToast({ title: '位置选择失败，请重试', icon: 'none' });
          return;
        }
        if (isPrivacyLocationFailure(error.errMsg)) {
          this.setData({ locationPrivacyAuthorizationRequired: true });
          wx.showToast({ title: '请先同意隐私保护指引，再选择位置', icon: 'none' });
          return;
        }
        wx.showToast({ title: '位置选择失败，请重试', icon: 'none' });
      }
    };

    if (hasLocation(this.data.form)) {
      options.latitude = this.data.form.latitude;
      options.longitude = this.data.form.longitude;
    }

    wx.chooseLocation(options);
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

    const addressInput = {
      type: this.data.form.type,
      recipientName,
      phoneNumber,
      regionLabel,
      detailAddress,
      tag,
      latitude: this.data.form.latitude,
      longitude: this.data.form.longitude
    };
    let toastTitle = this.data.mode === 'edit' ? '地址已更新' : '地址已新增';

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
        await createAddressRemote(addressInput);

        if (this.data.syncExpressAddress && this.data.showSyncExpressAddress) {
          try {
            const hadExpressDefault = Boolean(getSelectedAddress('express'));
            const expressAddress = await createAddressRemote(createExpressAddressInputFromCity(addressInput));
            toastTitle = '地址已新增，已同步快递地址';

            if (!hadExpressDefault) {
              try {
                await persistSelectedAddress(expressAddress.id);
              } catch {
                toastTitle = '地址已新增，快递默认地址同步失败';
              }
            }
          } catch {
            toastTitle = '同城地址已保存，快递地址同步失败，可稍后手动新增';
          }
        }
      }
    } catch {
      wx.showToast({ title: '地址保存失败', icon: 'none' });
      return;
    }

    wx.showToast({ title: toastTitle, icon: 'none' });
    wx.navigateBack();
  }
});
