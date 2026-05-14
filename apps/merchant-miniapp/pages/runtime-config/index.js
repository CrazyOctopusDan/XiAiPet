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
        }
    },
    async onShow() {
        await this.refreshSections();
    },
    async refreshSections() {
        this.setData({ loading: true });
        const sections = await (0, runtime_config_admin_1.queryRuntimeConfigSections)();
        this.setData({
            loading: false
        });
        refreshView(this, sections, this.data.dirty);
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
            ...(section.sectionId === 'store-profile' ? section.value : { address: '', latitude: 0, longitude: 0, contactPhone: '' }),
            [field]: field === 'latitude' || field === 'longitude' ? Number(value || 0) : value
        }, section));
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
                var _a;
                const filePath = (_a = result.tempFilePaths) === null || _a === void 0 ? void 0 : _a[0];
                if (!filePath) {
                    return;
                }
                try {
                    const uploaded = await (0, runtime_config_admin_1.uploadRuntimeBannerAsset)(filePath);
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
                catch (_b) {
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
            content: '配送费按距离和价格阶梯展示，保存后会同步到下单页。',
            showCancel: false
        });
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
});
