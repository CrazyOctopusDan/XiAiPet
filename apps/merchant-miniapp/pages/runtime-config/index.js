"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const runtime_config_admin_1 = require("../../src/services/runtime-config-admin");
function getSection(sections, sectionId) {
    var _a;
    return (_a = sections.find((item) => item.sectionId === sectionId)) !== null && _a !== void 0 ? _a : null;
}
function refreshView(instance, sections, dirty) {
    instance.setData({
        sections,
        dirty,
        view: (0, runtime_config_admin_1.getRuntimeConfigAdminViewModel)(sections, dirty)
    });
}
function getStoreProfileFallback() {
    return {
        storeName: '',
        address: '',
        latitude: 0,
        longitude: 0,
        wechatId: '',
        ownerPhone: ''
    };
}
function getDeliveryRulesSection(sections) {
    const section = getSection(sections, 'delivery-rules');
    return (section === null || section === void 0 ? void 0 : section.sectionId) === 'delivery-rules' ? section : null;
}
function buildDeliveryRuleDraft(row) {
    return {
        distanceKm: row ? String(row.distanceKm) : '',
        minimumOrderAmount: (row === null || row === void 0 ? void 0 : row.minimumOrderAmount) === null || (row === null || row === void 0 ? void 0 : row.minimumOrderAmount) === undefined ? '' : String(row.minimumOrderAmount),
        deliveryFee: row ? String(row.deliveryFee) : ''
    };
}
Page({
    data: {
        loading: true,
        dirty: {},
        sections: [],
        view: {
            summary: {
                totalSections: 0,
                dirtySections: 0,
                deliveryRuleCount: 0
            },
            sections: []
        },
        deliveryEditorVisible: false,
        deliveryEditorIndex: -1,
        deliveryEditorDraft: buildDeliveryRuleDraft()
    },
    async onShow() {
        await this.refreshSections();
    },
    async refreshSections() {
        this.setData({ loading: true });
        try {
            const sections = await (0, runtime_config_admin_1.queryRuntimeConfigSections)();
            this.setData({
                loading: false
            });
            refreshView(this, sections, this.data.dirty);
        }
        catch (_a) {
            this.setData({ loading: false });
            wx.showToast({
                title: '配置加载失败',
                icon: 'none'
            });
        }
    },
    patchSection(sectionId, updater) {
        const sections = this.data.sections.map((section) => (section.sectionId === sectionId ? updater(section) : section));
        const dirty = {
            ...this.data.dirty,
            [sectionId]: true
        };
        refreshView(this, sections, dirty);
    },
    handleStoreInput(event) {
        var _a, _b, _c, _d;
        const field = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.field;
        const value = (_d = (_c = event.detail) === null || _c === void 0 ? void 0 : _c.value) !== null && _d !== void 0 ? _d : '';
        if (!field) {
            return;
        }
        this.patchSection('store-profile', (section) => (0, runtime_config_admin_1.buildRuntimeConfigSectionDocument)('store-profile', {
            ...(section.sectionId === 'store-profile' ? section.value : getStoreProfileFallback()),
            [field]: value
        }, section));
    },
    handleChooseStoreLocation() {
        wx.chooseLocation({
            success: (result) => {
                this.patchSection('store-profile', (section) => {
                    var _a, _b;
                    return (0, runtime_config_admin_1.buildRuntimeConfigSectionDocument)('store-profile', {
                        ...(section.sectionId === 'store-profile' ? section.value : getStoreProfileFallback()),
                        address: result.address || result.name || '',
                        latitude: (_a = result.latitude) !== null && _a !== void 0 ? _a : 0,
                        longitude: (_b = result.longitude) !== null && _b !== void 0 ? _b : 0
                    }, section);
                });
            },
            fail: (error) => {
                var _a;
                const message = (_a = error.errMsg) !== null && _a !== void 0 ? _a : '';
                if (message.includes('cancel')) {
                    wx.showToast({
                        title: '已取消选择位置',
                        icon: 'none'
                    });
                    return;
                }
                const content = message.includes('auth') || message.includes('authorize') || message.includes('permission')
                    ? '位置权限未开启。请在微信开发者工具或手机系统权限中允许使用位置后重试。'
                    : '位置选择失败。请检查小程序后台是否开通位置接口，并确认 app.json 已声明位置权限用途。';
                wx.showModal({
                    title: '无法选择店铺位置',
                    content,
                    showCancel: false,
                    confirmText: '知道了'
                });
            }
        });
    },
    handleMembershipInput(event) {
        var _a, _b, _c, _d, _e, _f, _g;
        const index = Number((_c = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.index) !== null && _c !== void 0 ? _c : -1);
        const field = (_e = (_d = event.currentTarget) === null || _d === void 0 ? void 0 : _d.dataset) === null || _e === void 0 ? void 0 : _e.field;
        const value = (_g = (_f = event.detail) === null || _f === void 0 ? void 0 : _f.value) !== null && _g !== void 0 ? _g : '';
        this.patchSection('membership-tiers', (section) => {
            if (section.sectionId !== 'membership-tiers') {
                return section;
            }
            const tiers = [...section.value.tiers];
            const current = tiers[index];
            if (!current || !field) {
                return section;
            }
            tiers[index] = {
                ...current,
                [field]: field === 'threshold' ? Number(value || 0) : value
            };
            return (0, runtime_config_admin_1.buildRuntimeConfigSectionDocument)('membership-tiers', { tiers }, section);
        });
    },
    handleAddTier() {
        this.patchSection('membership-tiers', (section) => {
            if (section.sectionId !== 'membership-tiers') {
                return section;
            }
            return (0, runtime_config_admin_1.buildRuntimeConfigSectionDocument)('membership-tiers', {
                tiers: [
                    ...section.value.tiers,
                    {
                        tierId: `tier-${Date.now()}`,
                        threshold: 0,
                        name: '',
                        description: ''
                    }
                ]
            }, section);
        });
    },
    handleAddDeliveryRule() {
        this.setData({
            deliveryEditorVisible: true,
            deliveryEditorIndex: -1,
            deliveryEditorDraft: buildDeliveryRuleDraft()
        });
    },
    handleDeliveryRowTap(event) {
        var _a, _b, _c;
        const index = Number((_c = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.index) !== null && _c !== void 0 ? _c : -1);
        const section = getDeliveryRulesSection(this.data.sections);
        const row = section === null || section === void 0 ? void 0 : section.value.tiers[index];
        if (!row) {
            return;
        }
        wx.showActionSheet({
            itemList: ['编辑', '删除'],
            success: (result) => {
                if (result.tapIndex === 0) {
                    this.setData({
                        deliveryEditorVisible: true,
                        deliveryEditorIndex: index,
                        deliveryEditorDraft: buildDeliveryRuleDraft(row)
                    });
                }
                if (result.tapIndex === 1) {
                    wx.showModal({
                        title: '删除配送档',
                        content: `确认删除 ${row.distanceKm}km 配送档吗？`,
                        success: (modalResult) => {
                            if (!modalResult.confirm) {
                                return;
                            }
                            this.patchSection('delivery-rules', (section) => {
                                if (section.sectionId !== 'delivery-rules') {
                                    return section;
                                }
                                if (section.value.tiers.length <= 1) {
                                    wx.showToast({
                                        title: '至少保留一个配送档',
                                        icon: 'none'
                                    });
                                    return section;
                                }
                                const tiers = section.value.tiers.filter((_, rowIndex) => rowIndex !== index);
                                return (0, runtime_config_admin_1.buildRuntimeConfigSectionDocument)('delivery-rules', { tiers }, section);
                            });
                        }
                    });
                }
            }
        });
    },
    handleDeliveryEditorInput(event) {
        var _a, _b, _c, _d;
        const field = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.field;
        if (!field) {
            return;
        }
        this.setData({
            deliveryEditorDraft: {
                ...this.data.deliveryEditorDraft,
                [field]: (_d = (_c = event.detail) === null || _c === void 0 ? void 0 : _c.value) !== null && _d !== void 0 ? _d : ''
            }
        });
    },
    handleCloseDeliveryEditor() {
        this.setData({
            deliveryEditorVisible: false,
            deliveryEditorIndex: -1,
            deliveryEditorDraft: buildDeliveryRuleDraft()
        });
    },
    handleConfirmDeliveryEditor() {
        const distanceKm = Number(this.data.deliveryEditorDraft.distanceKm);
        const minimumOrderAmount = this.data.deliveryEditorDraft.minimumOrderAmount.trim()
            ? Number(this.data.deliveryEditorDraft.minimumOrderAmount)
            : null;
        const deliveryFee = Number(this.data.deliveryEditorDraft.deliveryFee);
        if (!Number.isFinite(distanceKm) || distanceKm <= 0 || !Number.isFinite(deliveryFee) || deliveryFee < 0) {
            wx.showToast({
                title: '请填写有效配送数据',
                icon: 'none'
            });
            return;
        }
        if (minimumOrderAmount !== null && (!Number.isFinite(minimumOrderAmount) || minimumOrderAmount < 0)) {
            wx.showToast({
                title: '请填写有效起送金额',
                icon: 'none'
            });
            return;
        }
        this.patchSection('delivery-rules', (section) => {
            if (section.sectionId !== 'delivery-rules') {
                return section;
            }
            const row = {
                distanceKm,
                minimumOrderAmount,
                deliveryFee,
                explainer: (0, runtime_config_admin_1.buildDeliveryRuleExplainer)({ distanceKm, minimumOrderAmount, deliveryFee })
            };
            const tiers = [...section.value.tiers];
            if (this.data.deliveryEditorIndex >= 0) {
                tiers[this.data.deliveryEditorIndex] = row;
            }
            else {
                tiers.push(row);
            }
            tiers.sort((left, right) => left.distanceKm - right.distanceKm);
            return (0, runtime_config_admin_1.buildRuntimeConfigSectionDocument)('delivery-rules', { tiers }, section);
        });
        this.handleCloseDeliveryEditor();
    },
    handleBannerInput(event) {
        var _a, _b, _c, _d;
        const field = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.field;
        const value = (_d = (_c = event.detail) === null || _c === void 0 ? void 0 : _c.value) !== null && _d !== void 0 ? _d : '';
        if (!field) {
            return;
        }
        this.patchSection('banner', (section) => (0, runtime_config_admin_1.buildRuntimeConfigSectionDocument)('banner', {
            ...(section.sectionId === 'banner' ? section.value : { fileId: '', altText: '' }),
            [field]: value
        }, section));
    },
    async handleUploadBanner() {
        wx.chooseImage({
            count: 1,
            success: async (result) => {
                var _a, _b, _c, _d;
                const filePath = (_a = result.tempFilePaths) === null || _a === void 0 ? void 0 : _a[0];
                if (!filePath) {
                    return;
                }
                const tempFile = (_b = result.tempFiles) === null || _b === void 0 ? void 0 : _b[0];
                try {
                    const uploaded = await (0, runtime_config_admin_1.uploadRuntimeBannerAsset)({
                        filePath: (_d = (_c = tempFile === null || tempFile === void 0 ? void 0 : tempFile.path) !== null && _c !== void 0 ? _c : tempFile === null || tempFile === void 0 ? void 0 : tempFile.tempFilePath) !== null && _d !== void 0 ? _d : filePath,
                        sizeBytes: tempFile === null || tempFile === void 0 ? void 0 : tempFile.size
                    });
                    this.patchSection('banner', (section) => (0, runtime_config_admin_1.buildRuntimeConfigSectionDocument)('banner', {
                        ...(section.sectionId === 'banner' ? section.value : { fileId: '', altText: '' }),
                        fileId: uploaded.storageId,
                        asset: uploaded.asset
                    }, section));
                    wx.showToast({
                        title: '上传成功',
                        icon: 'success'
                    });
                }
                catch (_e) {
                    wx.showToast({
                        title: '上传失败',
                        icon: 'none'
                    });
                }
            }
        });
    },
    handleNoticeInput(event) {
        var _a, _b, _c, _d;
        const field = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.field;
        const value = (_d = (_c = event.detail) === null || _c === void 0 ? void 0 : _c.value) !== null && _d !== void 0 ? _d : '';
        this.patchSection('custom-notice', (section) => (0, runtime_config_admin_1.buildRuntimeConfigSectionDocument)('custom-notice', {
            ...(section.sectionId === 'custom-notice' ? section.value : { enabled: true, content: '' }),
            [field !== null && field !== void 0 ? field : 'content']: field === 'enabled' ? value === 'true' : value
        }, section));
    },
    handleNoticeToggle() {
        this.patchSection('custom-notice', (section) => {
            if (section.sectionId !== 'custom-notice') {
                return section;
            }
            return (0, runtime_config_admin_1.buildRuntimeConfigSectionDocument)('custom-notice', {
                ...section.value,
                enabled: !section.value.enabled
            }, section);
        });
    },
    handleOpenDeliveryNotice() {
        wx.showModal({
            title: '配送费说明',
            content: '点击配送档可以编辑或删除；新增和保存后会同步到用户端展示。',
            showCancel: false
        });
    },
    handleEditorTap() {
        return undefined;
    },
    async handleSaveSection(event) {
        var _a, _b;
        const sectionId = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.sectionId;
        if (!sectionId) {
            return;
        }
        const section = getSection(this.data.sections, sectionId);
        if (!section) {
            return;
        }
        if (section.sectionId === 'membership-tiers' && section.value.tiers.some((tier) => !tier.name.trim())) {
            wx.showToast({
                title: '请填写等级名称',
                icon: 'none'
            });
            return;
        }
        try {
            const saved = await (0, runtime_config_admin_1.saveRuntimeConfigSection)(section);
            const sections = this.data.sections.map((item) => (item.sectionId === sectionId ? saved : item));
            const dirty = {
                ...this.data.dirty,
                [sectionId]: false
            };
            refreshView(this, sections, dirty);
            wx.showToast({
                title: '保存成功',
                icon: 'success'
            });
        }
        catch (_c) {
            wx.showToast({
                title: '保存失败',
                icon: 'none'
            });
        }
    }
});
