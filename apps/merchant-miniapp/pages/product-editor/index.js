"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const catalog_admin_1 = require("../../src/services/catalog-admin");
function createDraft(categoryId = '') {
    return (0, catalog_admin_1.createEmptyProductEditorPayload)(categoryId);
}
function refreshEditorView(instance, draft, activeStep) {
    instance.setData({
        draft,
        activeStep,
        editorView: (0, catalog_admin_1.getProductEditorViewModel)(draft, activeStep)
    });
}
function updateSpecRow(draft, index, key, value) {
    draft.pricing.specs[index] = {
        ...draft.pricing.specs[index],
        [key]: key === 'surcharge' ? Number(value || 0) : value
    };
}
function updateFormulaRow(draft, index, key, value) {
    draft.pricing.formulas[index] = {
        ...draft.pricing.formulas[index],
        [key]: key === 'surcharge' ? Number(value || 0) : value
    };
}
Page({
    data: {
        loading: true,
        saving: false,
        imageUploading: false,
        activeStep: 'basicInfo',
        categories: [],
        draft: createDraft(),
        editorView: (0, catalog_admin_1.getProductEditorViewModel)(createDraft(), 'basicInfo')
    },
    async onLoad(options) {
        await this.hydrateEditor(options === null || options === void 0 ? void 0 : options.productId, options === null || options === void 0 ? void 0 : options.categoryId);
    },
    async hydrateEditor(productId = '', categoryId = '') {
        this.setData({ loading: true });
        const categories = await (0, catalog_admin_1.queryCategories)();
        let draft = createDraft(categoryId);
        if (productId) {
            const products = await (0, catalog_admin_1.queryProducts)();
            const product = products.find((item) => item.id === productId);
            if (product) {
                draft = (0, catalog_admin_1.splitProductEditorPayload)(product);
            }
        }
        this.setData({
            loading: false,
            categories
        });
        refreshEditorView(this, draft, 'basicInfo');
    },
    handleStepTap(event) {
        var _a, _b;
        const step = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.step;
        if (!step) {
            return;
        }
        refreshEditorView(this, this.data.draft, step);
    },
    handleBasicInput(event) {
        var _a, _b, _c, _d;
        const field = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.field;
        const value = (_d = (_c = event.detail) === null || _c === void 0 ? void 0 : _c.value) !== null && _d !== void 0 ? _d : '';
        const draft = { ...this.data.draft, basicInfo: { ...this.data.draft.basicInfo } };
        if (field === 'stock') {
            draft.basicInfo.stock = Number(value || 0);
        }
        else if (field && field in draft.basicInfo) {
            draft.basicInfo[field] = value;
        }
        refreshEditorView(this, draft, this.data.activeStep);
    },
    handleCategoryTap(event) {
        var _a, _b, _c;
        const categoryId = (_c = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : '';
        const draft = { ...this.data.draft, basicInfo: { ...this.data.draft.basicInfo, categoryId } };
        refreshEditorView(this, draft, this.data.activeStep);
    },
    async handleUploadImage() {
        wx.chooseImage({
            count: 1,
            success: async (result) => {
                var _a, _b;
                const filePath = (_a = result.tempFilePaths) === null || _a === void 0 ? void 0 : _a[0];
                if (!filePath) {
                    return;
                }
                this.setData({ imageUploading: true });
                try {
                    const uploaded = await (0, catalog_admin_1.uploadProductCoverAsset)(filePath);
                    const draft = {
                        ...this.data.draft,
                        basicInfo: {
                            ...this.data.draft.basicInfo,
                            imageFileId: uploaded.storageId,
                            imageAsset: uploaded.asset,
                            imagePreviewUrl: uploaded.asset.url
                        }
                    };
                    refreshEditorView(this, draft, this.data.activeStep);
                }
                catch (error) {
                    (_b = wx.showToast) === null || _b === void 0 ? void 0 : _b.call(wx, {
                        title: error instanceof Error && error.message === 'Image exceeds the upload size limit' ? '图片过大' : '上传失败',
                        icon: 'none'
                    });
                }
                finally {
                    this.setData({ imageUploading: false });
                }
            }
        });
    },
    handleBasePriceInput(event) {
        var _a, _b;
        const draft = { ...this.data.draft, pricing: { ...this.data.draft.pricing, basePrice: Number((_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : 0) } };
        refreshEditorView(this, draft, this.data.activeStep);
    },
    handleAddSpec() {
        const draft = {
            ...this.data.draft,
            pricing: {
                ...this.data.draft.pricing,
                specs: [
                    ...this.data.draft.pricing.specs,
                    { id: `spec-${Date.now()}`, label: '', surcharge: 0 }
                ]
            }
        };
        refreshEditorView(this, draft, this.data.activeStep);
    },
    handleSpecInput(event) {
        var _a, _b, _c, _d, _e, _f, _g;
        const index = Number((_c = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.index) !== null && _c !== void 0 ? _c : -1);
        const field = (_e = (_d = event.currentTarget) === null || _d === void 0 ? void 0 : _d.dataset) === null || _e === void 0 ? void 0 : _e.field;
        if (index < 0 || !field) {
            return;
        }
        const draft = {
            ...this.data.draft,
            pricing: {
                ...this.data.draft.pricing,
                specs: [...this.data.draft.pricing.specs]
            }
        };
        updateSpecRow(draft, index, field, (_g = (_f = event.detail) === null || _f === void 0 ? void 0 : _f.value) !== null && _g !== void 0 ? _g : '');
        refreshEditorView(this, draft, this.data.activeStep);
    },
    handleRemoveSpec(event) {
        var _a, _b, _c;
        const index = Number((_c = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.index) !== null && _c !== void 0 ? _c : -1);
        const draft = {
            ...this.data.draft,
            pricing: {
                ...this.data.draft.pricing,
                specs: this.data.draft.pricing.specs.filter((_, itemIndex) => itemIndex !== index)
            }
        };
        refreshEditorView(this, draft, this.data.activeStep);
    },
    handleAddFormula() {
        const draft = {
            ...this.data.draft,
            pricing: {
                ...this.data.draft.pricing,
                formulas: [
                    ...this.data.draft.pricing.formulas,
                    { id: `formula-${Date.now()}`, label: '', surcharge: 0 }
                ]
            }
        };
        refreshEditorView(this, draft, this.data.activeStep);
    },
    handleFormulaInput(event) {
        var _a, _b, _c, _d, _e, _f, _g;
        const index = Number((_c = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.index) !== null && _c !== void 0 ? _c : -1);
        const field = (_e = (_d = event.currentTarget) === null || _d === void 0 ? void 0 : _d.dataset) === null || _e === void 0 ? void 0 : _e.field;
        if (index < 0 || !field) {
            return;
        }
        const draft = {
            ...this.data.draft,
            pricing: {
                ...this.data.draft.pricing,
                formulas: [...this.data.draft.pricing.formulas]
            }
        };
        updateFormulaRow(draft, index, field, (_g = (_f = event.detail) === null || _f === void 0 ? void 0 : _f.value) !== null && _g !== void 0 ? _g : '');
        refreshEditorView(this, draft, this.data.activeStep);
    },
    handleRemoveFormula(event) {
        var _a, _b, _c;
        const index = Number((_c = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.index) !== null && _c !== void 0 ? _c : -1);
        const draft = {
            ...this.data.draft,
            pricing: {
                ...this.data.draft.pricing,
                formulas: this.data.draft.pricing.formulas.filter((_, itemIndex) => itemIndex !== index)
            }
        };
        refreshEditorView(this, draft, this.data.activeStep);
    },
    handlePurchaseLimitToggle() {
        var _a;
        const enabled = !this.data.draft.pricing.purchaseLimit.enabled;
        const draft = {
            ...this.data.draft,
            pricing: {
                ...this.data.draft.pricing,
                purchaseLimit: {
                    enabled,
                    maxQuantity: enabled ? (_a = this.data.draft.pricing.purchaseLimit.maxQuantity) !== null && _a !== void 0 ? _a : 1 : null
                }
            }
        };
        refreshEditorView(this, draft, this.data.activeStep);
    },
    handlePurchaseLimitInput(event) {
        var _a, _b;
        const draft = {
            ...this.data.draft,
            pricing: {
                ...this.data.draft.pricing,
                purchaseLimit: {
                    ...this.data.draft.pricing.purchaseLimit,
                    maxQuantity: Number((_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : 0)
                }
            }
        };
        refreshEditorView(this, draft, this.data.activeStep);
    },
    handleDetailContentInput(event) {
        var _a, _b;
        const draft = {
            ...this.data.draft,
            pricing: {
                ...this.data.draft.pricing,
                detailContent: (_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : ''
            }
        };
        refreshEditorView(this, draft, this.data.activeStep);
    },
    handleStatusTap(event) {
        var _a, _b;
        const status = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.status;
        if (!status) {
            return;
        }
        const draft = {
            ...this.data.draft,
            publishSettings: {
                ...this.data.draft.publishSettings,
                status
            }
        };
        refreshEditorView(this, draft, this.data.activeStep);
    },
    handleFulfillmentTap(event) {
        var _a, _b;
        const mode = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.mode;
        if (!mode) {
            return;
        }
        const modes = this.data.draft.publishSettings.fulfillmentModes.includes(mode)
            ? this.data.draft.publishSettings.fulfillmentModes.filter((item) => item !== mode)
            : [...this.data.draft.publishSettings.fulfillmentModes, mode];
        const draft = {
            ...this.data.draft,
            publishSettings: {
                ...this.data.draft.publishSettings,
                fulfillmentModes: modes
            }
        };
        refreshEditorView(this, draft, this.data.activeStep);
    },
    handleTrackInventoryToggle() {
        const draft = {
            ...this.data.draft,
            publishSettings: {
                ...this.data.draft.publishSettings,
                trackInventory: !this.data.draft.publishSettings.trackInventory
            }
        };
        refreshEditorView(this, draft, this.data.activeStep);
    },
    async handleStepSubmit() {
        if (this.data.activeStep === 'basicInfo') {
            if (!this.data.draft.basicInfo.name.trim() || !this.data.draft.basicInfo.categoryId || !this.data.draft.basicInfo.imageFileId) {
                wx.showToast({
                    title: '请完善基础信息',
                    icon: 'none'
                });
                return;
            }
            refreshEditorView(this, this.data.draft, 'pricing');
            return;
        }
        if (this.data.activeStep === 'pricing') {
            refreshEditorView(this, this.data.draft, 'publishSettings');
            return;
        }
        if (!this.data.draft.publishSettings.fulfillmentModes.length) {
            wx.showToast({
                title: '至少选择一种履约方式',
                icon: 'none'
            });
            return;
        }
        this.setData({ saving: true });
        await (0, catalog_admin_1.saveProduct)(this.data.draft);
        this.setData({ saving: false });
        wx.showToast({
            title: '商品已保存',
            icon: 'success'
        });
        wx.navigateBack();
    }
});
