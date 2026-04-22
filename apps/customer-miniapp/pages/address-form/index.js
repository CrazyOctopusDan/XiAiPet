"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const address_1 = require("../../src/services/address");
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
Page({
    data: {
        mode: 'create',
        typeLabel: '同城地址',
        form: createEmptyForm('city')
    },
    onLoad(options) {
        var _a;
        const editingAddress = (options === null || options === void 0 ? void 0 : options.id) ? (0, address_1.getAddressById)(options.id) : null;
        const type = (_a = editingAddress === null || editingAddress === void 0 ? void 0 : editingAddress.type) !== null && _a !== void 0 ? _a : ((options === null || options === void 0 ? void 0 : options.type) === 'express' ? 'express' : 'city');
        this.setData({
            mode: editingAddress ? 'edit' : 'create',
            typeLabel: getTypeLabel(type),
            form: editingAddress ? { ...editingAddress } : createEmptyForm(type)
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
    handleSubmit() {
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
            (0, address_1.updateAddress)(this.data.form.id, {
                recipientName,
                phoneNumber,
                regionLabel,
                detailAddress,
                tag
            });
        }
        else {
            (0, address_1.createAddress)({
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
