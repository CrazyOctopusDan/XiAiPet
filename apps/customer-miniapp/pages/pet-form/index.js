"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pets_1 = require("../../src/services/pets");
function createEmptyForm() {
    return {
        id: '',
        name: '',
        gender: 'unknown',
        birthday: '',
        allergyNotes: ''
    };
}
Page({
    data: {
        mode: 'create',
        form: createEmptyForm(),
        genderOptions: [
            { value: 'unknown', label: '未设置' },
            { value: 'female', label: '女孩' },
            { value: 'male', label: '男孩' }
        ]
    },
    onLoad(options) {
        const pet = (options === null || options === void 0 ? void 0 : options.id) ? (0, pets_1.getPetById)(options.id) : null;
        this.setData({
            mode: pet ? 'edit' : 'create',
            form: pet ? { ...pet } : createEmptyForm()
        });
    },
    handleNameInput(event) {
        var _a, _b;
        this.setData({
            form: {
                ...this.data.form,
                name: (_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : ''
            }
        });
    },
    handleGenderTap(event) {
        var _a, _b;
        const gender = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.gender;
        if (!gender) {
            return;
        }
        this.setData({
            form: {
                ...this.data.form,
                gender
            }
        });
    },
    handleBirthdayChange(event) {
        var _a, _b;
        this.setData({
            form: {
                ...this.data.form,
                birthday: (_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : ''
            }
        });
    },
    handleAllergyInput(event) {
        var _a, _b;
        this.setData({
            form: {
                ...this.data.form,
                allergyNotes: (_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : ''
            }
        });
    },
    async handleSubmit() {
        const name = this.data.form.name.trim();
        const birthday = this.data.form.birthday.trim();
        const allergyNotes = this.data.form.allergyNotes.trim();
        if (!name) {
            wx.showToast({ title: '请填写宠物名字', icon: 'none' });
            return;
        }
        try {
            if (this.data.mode === 'edit' && this.data.form.id) {
                await (0, pets_1.updatePetRemote)(this.data.form.id, {
                    name,
                    gender: this.data.form.gender,
                    birthday,
                    allergyNotes
                });
            }
            else {
                await (0, pets_1.createPetRemote)({
                    name,
                    gender: this.data.form.gender,
                    birthday,
                    allergyNotes
                });
            }
        }
        catch (_a) {
            wx.showToast({ title: '宠物档案保存失败', icon: 'none' });
            return;
        }
        wx.showToast({ title: this.data.mode === 'edit' ? '宠物档案已更新' : '宠物档案已新增', icon: 'none' });
        wx.navigateBack();
    }
});
