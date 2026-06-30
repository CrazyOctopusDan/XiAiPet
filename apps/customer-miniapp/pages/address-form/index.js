"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const address_1 = require("../../src/services/address");
const NAME_LABEL_PATTERN = /^(?:收件人|收货人|联系人|姓名|名字)\s*[:：]?\s*(.+)$/;
const PHONE_LABEL_PATTERN = /^(?:手机号码|手机号|手机|联系电话|电话|联系方式)\s*[:：]?\s*(.+)$/;
const REGION_LABEL_PATTERN = /^(?:所在地区|地区|省市区|省市县|省市|区域)\s*[:：]?\s*(.+)$/;
const DETAIL_LABEL_PATTERN = /^(?:详细地址|地址详情|门牌号|街道地址|收货地址|地址)\s*[:：]?\s*(.+)$/;
const PHONE_PATTERN = /(?:^|[^\d])((?:\+?86[-\s]?)?1[3-9]\d(?:[-\s]?\d{4}){2})(?!\d)/;
const ADMIN_SUFFIX_PATTERN = /(特别行政区|自治区|自治州|自治县|地区|街道|省|市|区|县|旗|镇|乡)/g;
function createEmptyForm(type) {
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
function getTypeLabel(type) {
    return type === 'express' ? '快递地址' : '同城地址';
}
function hasLocation(value) {
    return typeof value.latitude === 'number' && Number.isFinite(value.latitude) &&
        typeof value.longitude === 'number' && Number.isFinite(value.longitude);
}
function isPrivacyLocationFailure(errMsg = '') {
    return errMsg.includes('privacy') || errMsg.includes('authorize') || errMsg.includes('auth deny');
}
function isLocationScopeConfigurationFailure(error) {
    var _a;
    return error.errno === 112 || ((_a = error.errMsg) !== null && _a !== void 0 ? _a : '').includes('api scope is not declared');
}
function normalizeRecognitionLine(value) {
    return value
        .replace(/\u3000/g, ' ')
        .replace(/[，,；;]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function normalizeRecognitionInput(value) {
    return value
        .replace(/\r/g, '\n')
        .split('\n')
        .map(normalizeRecognitionLine)
        .filter(Boolean);
}
function normalizePhoneNumber(value) {
    const match = value.match(PHONE_PATTERN);
    if (!(match === null || match === void 0 ? void 0 : match[1])) {
        return '';
    }
    const digits = match[1].replace(/\D/g, '');
    return digits.length > 11 && digits.startsWith('86') ? digits.slice(-11) : digits;
}
function removePhoneNumber(value, phoneNumber) {
    if (!phoneNumber) {
        return value;
    }
    const spacedPhone = phoneNumber.replace(/(\d{3})(\d{4})(\d{4})/, '$1\\s*[- ]?\\s*$2\\s*[- ]?\\s*$3');
    return value
        .replace(new RegExp(`(?:\\+?86\\s*[- ]?\\s*)?${spacedPhone}`), ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function splitRegionAndDetail(value) {
    const normalized = normalizeRecognitionLine(value);
    if (!normalized) {
        return {};
    }
    let lastAdminEnd = 0;
    let match;
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
function parseAddressRecognitionInput(value) {
    var _a;
    const lines = normalizeRecognitionInput(value);
    const result = {};
    const unstructuredLines = [];
    for (const line of lines) {
        const nameMatch = line.match(NAME_LABEL_PATTERN);
        const phoneMatch = line.match(PHONE_LABEL_PATTERN);
        const regionMatch = line.match(REGION_LABEL_PATTERN);
        const detailMatch = line.match(DETAIL_LABEL_PATTERN);
        if (nameMatch === null || nameMatch === void 0 ? void 0 : nameMatch[1]) {
            result.recipientName = normalizeRecognitionLine(nameMatch[1]);
            continue;
        }
        if (phoneMatch === null || phoneMatch === void 0 ? void 0 : phoneMatch[1]) {
            result.phoneNumber = normalizePhoneNumber(phoneMatch[1]) || normalizeRecognitionLine(phoneMatch[1]);
            continue;
        }
        if (regionMatch === null || regionMatch === void 0 ? void 0 : regionMatch[1]) {
            result.regionLabel = normalizeRecognitionLine(regionMatch[1]);
            continue;
        }
        if (detailMatch === null || detailMatch === void 0 ? void 0 : detailMatch[1]) {
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
    let addressText = removePhoneNumber(combined, (_a = result.phoneNumber) !== null && _a !== void 0 ? _a : '');
    const segments = addressText.split(/\s+/).map(normalizeRecognitionLine).filter(Boolean);
    const firstAddressSegmentIndex = segments.findIndex((segment) => /[省市区县镇乡街道路号幢栋单元室]/.test(segment));
    if (!result.recipientName && firstAddressSegmentIndex > 0) {
        result.recipientName = segments.slice(0, firstAddressSegmentIndex).join(' ');
        addressText = segments.slice(firstAddressSegmentIndex).join('');
    }
    else if (result.recipientName) {
        addressText = addressText.replace(result.recipientName, '').trim();
    }
    else {
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
    return Object.fromEntries(Object.entries(result).filter(([, entryValue]) => Boolean(entryValue === null || entryValue === void 0 ? void 0 : entryValue.trim())));
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
    onLoad(options) {
        var _a, _b;
        (_a = wx.onNeedPrivacyAuthorization) === null || _a === void 0 ? void 0 : _a.call(wx, (resolve) => {
            this.pendingLocationPrivacyResolve = resolve;
            this.setData({
                locationPrivacyAuthorizationRequired: true
            });
        });
        const editingAddress = (options === null || options === void 0 ? void 0 : options.id) ? (0, address_1.getAddressById)(options.id) : null;
        const type = (_b = editingAddress === null || editingAddress === void 0 ? void 0 : editingAddress.type) !== null && _b !== void 0 ? _b : ((options === null || options === void 0 ? void 0 : options.type) === 'express' ? 'express' : 'city');
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
    onShow() {
        var _a;
        (_a = wx.getPrivacySetting) === null || _a === void 0 ? void 0 : _a.call(wx, {
            success: (result) => {
                this.setData({
                    locationPrivacyAuthorizationRequired: Boolean(result.needAuthorization),
                    privacyContractName: result.privacyContractName || '隐私保护指引'
                });
            }
        });
    },
    handleRecipientInput(event) {
        var _a, _b;
        this.setData({
            form: {
                ...this.data.form,
                recipientName: (_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : ''
            }
        });
    },
    handlePhoneInput(event) {
        var _a, _b;
        this.setData({
            form: {
                ...this.data.form,
                phoneNumber: (_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : ''
            }
        });
    },
    handleRegionInput(event) {
        var _a, _b;
        this.setData({
            form: {
                ...this.data.form,
                regionLabel: (_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : ''
            }
        });
    },
    handleDetailInput(event) {
        var _a, _b;
        this.setData({
            form: {
                ...this.data.form,
                detailAddress: (_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : ''
            }
        });
    },
    handleTagInput(event) {
        var _a, _b;
        this.setData({
            form: {
                ...this.data.form,
                tag: (_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : ''
            }
        });
    },
    handleSyncExpressTap() {
        if (!this.data.showSyncExpressAddress) {
            return;
        }
        this.setData({
            syncExpressAddress: !this.data.syncExpressAddress
        });
    },
    handleRecognitionButtonTap() {
        this.setData({
            recognitionModalVisible: true,
            recognitionInput: ''
        });
    },
    handleRecognitionInput(event) {
        var _a, _b;
        this.setData({
            recognitionInput: (_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : ''
        });
    },
    handleCloseRecognitionModal() {
        this.setData({
            recognitionModalVisible: false,
            recognitionInput: ''
        });
    },
    handleRecognitionModalTap() {
        // Stops overlay taps from closing the modal content in the miniapp event model.
    },
    handleApplyRecognition() {
        const parsed = parseAddressRecognitionInput(this.data.recognitionInput);
        if (!parsed.recipientName && !parsed.phoneNumber && !parsed.regionLabel && !parsed.detailAddress) {
            wx.showToast({ title: '未识别到地址信息', icon: 'none' });
            return;
        }
        const nextForm = {
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
    handleLocationButtonTap() {
        this.handleRequestLocationPrivacy();
    },
    handleRequestLocationPrivacy() {
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
    handleAgreeLocationPrivacyAuthorization() {
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
    applyLocationSelection(result) {
        var _a, _b;
        const address = ((_a = result.address) !== null && _a !== void 0 ? _a : '').trim();
        const name = ((_b = result.name) !== null && _b !== void 0 ? _b : '').trim();
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
    handleChooseLocation() {
        const options = {
            success: (result) => {
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
            fail: (error) => {
                var _a;
                if ((_a = error.errMsg) === null || _a === void 0 ? void 0 : _a.includes('cancel')) {
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
    async handleSubmit() {
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
                await (0, address_1.updateAddressRemote)(this.data.form.id, {
                    recipientName,
                    phoneNumber,
                    regionLabel,
                    detailAddress,
                    tag,
                    latitude: this.data.form.latitude,
                    longitude: this.data.form.longitude
                });
            }
            else {
                await (0, address_1.createAddressRemote)(addressInput);
                if (this.data.syncExpressAddress && this.data.showSyncExpressAddress) {
                    try {
                        const hadExpressDefault = Boolean((0, address_1.getSelectedAddress)('express'));
                        const expressAddress = await (0, address_1.createAddressRemote)((0, address_1.createExpressAddressInputFromCity)(addressInput));
                        toastTitle = '地址已新增，已同步快递地址';
                        if (!hadExpressDefault) {
                            try {
                                await (0, address_1.persistSelectedAddress)(expressAddress.id);
                            }
                            catch (_a) {
                                toastTitle = '地址已新增，快递默认地址同步失败';
                            }
                        }
                    }
                    catch (_b) {
                        toastTitle = '同城地址已保存，快递地址同步失败，可稍后手动新增';
                    }
                }
            }
        }
        catch (_c) {
            wx.showToast({ title: '地址保存失败', icon: 'none' });
            return;
        }
        wx.showToast({ title: toastTitle, icon: 'none' });
        wx.navigateBack();
    }
});
