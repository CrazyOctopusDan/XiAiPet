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
function logProductImageUploadFailure(scope, error) {
    if (typeof console !== 'undefined' && typeof console.error === 'function') {
        console.error('[xiaipet] product editor image upload failed', {
            scope,
            error
        });
    }
}
function getProductImageUploadToastTitle(error) {
    if (error instanceof Error && error.message === 'Image exceeds the upload size limit') {
        return '图片过大';
    }
    return '上传失败';
}
function shouldIgnoreChooseImageFailure(error) {
    return Boolean(error &&
        typeof error === 'object' &&
        'errMsg' in error &&
        typeof error.errMsg === 'string' &&
        error.errMsg.includes('cancel'));
}
function getChosenImageFiles(result, count) {
    var _a, _b;
    const tempFiles = (_a = result.tempFiles) !== null && _a !== void 0 ? _a : [];
    const paths = (_b = result.tempFilePaths) !== null && _b !== void 0 ? _b : [];
    return paths.slice(0, count).map((filePath, index) => {
        var _a, _b, _c, _d, _e;
        return ({
            filePath: (_d = (_b = (_a = tempFiles[index]) === null || _a === void 0 ? void 0 : _a.path) !== null && _b !== void 0 ? _b : (_c = tempFiles[index]) === null || _c === void 0 ? void 0 : _c.tempFilePath) !== null && _d !== void 0 ? _d : filePath,
            sizeBytes: (_e = tempFiles[index]) === null || _e === void 0 ? void 0 : _e.size
        });
    });
}
function normalizeImageUrlForDisplay(value) {
    const trimmed = value.trim();
    if (!trimmed) {
        return '';
    }
    if (trimmed.startsWith('https://')) {
        return trimmed;
    }
    if (trimmed.startsWith('http://')) {
        return `https://${trimmed.slice('http://'.length)}`;
    }
    if (trimmed.startsWith('/') ||
        trimmed.startsWith('cloud://') ||
        trimmed.startsWith('oss://') ||
        /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
        return trimmed;
    }
    return `https://${trimmed.replace(/^\/+/, '')}`;
}
function normalizeAssetForDraft(asset) {
    return {
        ...asset,
        url: normalizeImageUrlForDisplay(asset.url),
        variants: asset.variants.map((variant) => ({
            ...variant,
            url: normalizeImageUrlForDisplay(variant.url)
        }))
    };
}
function parseMoneyInput(value) {
    const numeric = Number(value !== null && value !== void 0 ? value : 0);
    if (!Number.isFinite(numeric) || numeric <= 0) {
        return 0;
    }
    return Math.floor(numeric * 100) / 100;
}
function normalizeMoneyInputText(value) {
    const sanitized = (value !== null && value !== void 0 ? value : '').replace(/[^\d.]/g, '');
    const [integerPart = '', ...decimalParts] = sanitized.split('.');
    if (!sanitized.includes('.')) {
        return integerPart;
    }
    return `${integerPart}.${decimalParts.join('').slice(0, 2)}`;
}
function isPendingMoneyInput(value) {
    return typeof value === 'string' && /^\d*\.$/.test(value);
}
function updateSpecRow(draft, index, key, value) {
    draft.pricing.specs[index] = {
        ...draft.pricing.specs[index],
        [key]: key === 'surcharge' ? parseMoneyInput(value) : value
    };
}
function updateFormulaRow(draft, index, key, value) {
    draft.pricing.formulas[index] = {
        ...draft.pricing.formulas[index],
        [key]: key === 'surcharge' ? parseMoneyInput(value) : value
    };
}
function assetToStorageId(asset) {
    return `oss://${asset.bucket}/${asset.objectKey}`;
}
function getDraftBasicImageAssets(draft) {
    var _a;
    if ((_a = draft.basicInfo.introductionImageAssets) === null || _a === void 0 ? void 0 : _a.length) {
        return draft.basicInfo.introductionImageAssets.slice(0, 3);
    }
    return draft.basicInfo.imageAsset ? [draft.basicInfo.imageAsset] : [];
}
function applyBasicImageAssets(draft, assets) {
    var _a;
    const normalizedAssets = assets.slice(0, 3).map(normalizeAssetForDraft);
    const cover = normalizedAssets[0];
    return {
        ...draft,
        basicInfo: {
            ...draft.basicInfo,
            imageFileId: cover ? assetToStorageId(cover) : '',
            imageAsset: cover,
            imagePreviewUrl: (_a = cover === null || cover === void 0 ? void 0 : cover.url) !== null && _a !== void 0 ? _a : '',
            introductionImageAssets: normalizedAssets
        }
    };
}
function getDraftDetailImageAssets(draft) {
    var _a;
    return ((_a = draft.basicInfo.detailImageAssets) !== null && _a !== void 0 ? _a : []).slice(0, 9);
}
function applyDetailImageAssets(draft, assets) {
    const normalizedAssets = assets.slice(0, 9).map(normalizeAssetForDraft);
    return {
        ...draft,
        basicInfo: {
            ...draft.basicInfo,
            detailImageAssets: normalizedAssets
        }
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
        try {
            const categories = await (0, catalog_admin_1.queryCategories)();
            let draft = createDraft(categoryId);
            if (productId) {
                const product = await (0, catalog_admin_1.getProductDetail)(productId);
                draft = (0, catalog_admin_1.splitProductEditorPayload)(product);
            }
            this.setData({
                loading: false,
                categories
            });
            refreshEditorView(this, draft, 'basicInfo');
        }
        catch (_a) {
            this.setData({ loading: false });
            wx.showToast({
                title: '商品加载失败',
                icon: 'none'
            });
        }
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
    async handleUploadImage(event) {
        var _a, _b;
        const replaceIndexValue = (_b = (_a = event === null || event === void 0 ? void 0 : event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.index;
        const replaceIndex = replaceIndexValue === undefined ? -1 : Number(replaceIndexValue);
        const currentAssets = getDraftBasicImageAssets(this.data.draft);
        const remainingSlots = Math.max(0, 3 - currentAssets.length);
        const isReplacing = Number.isInteger(replaceIndex) && replaceIndex >= 0;
        const count = isReplacing ? 1 : remainingSlots;
        if (count <= 0) {
            wx.showToast({
                title: '最多上传 3 张',
                icon: 'none'
            });
            return;
        }
        wx.chooseImage({
            count,
            success: async (result) => {
                var _a;
                const files = getChosenImageFiles(result, count);
                if (!files.length) {
                    return;
                }
                this.setData({ imageUploading: true });
                try {
                    const uploadedAssets = [];
                    for (const file of files) {
                        const uploaded = await (0, catalog_admin_1.uploadProductCoverAsset)(file);
                        uploadedAssets.push(uploaded.asset);
                    }
                    const baseAssets = getDraftBasicImageAssets(this.data.draft);
                    const nextAssets = isReplacing
                        ? baseAssets.length
                            ? baseAssets.map((asset, index) => (index === replaceIndex ? uploadedAssets[0] : asset))
                            : uploadedAssets
                        : [...baseAssets, ...uploadedAssets].slice(0, 3);
                    const draft = applyBasicImageAssets(this.data.draft, nextAssets);
                    refreshEditorView(this, draft, this.data.activeStep);
                }
                catch (error) {
                    logProductImageUploadFailure('basic', error);
                    (_a = wx.showToast) === null || _a === void 0 ? void 0 : _a.call(wx, {
                        title: getProductImageUploadToastTitle(error),
                        icon: 'none'
                    });
                }
                finally {
                    this.setData({ imageUploading: false });
                }
            },
            fail: (error) => {
                var _a;
                if (shouldIgnoreChooseImageFailure(error)) {
                    return;
                }
                logProductImageUploadFailure('choose-basic', error);
                (_a = wx.showToast) === null || _a === void 0 ? void 0 : _a.call(wx, {
                    title: '选择图片失败',
                    icon: 'none'
                });
            }
        });
    },
    handleRemoveImage(event) {
        var _a, _b, _c;
        const index = Number((_c = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.index) !== null && _c !== void 0 ? _c : -1);
        const assets = getDraftBasicImageAssets(this.data.draft);
        if (index < 0) {
            return;
        }
        const draft = applyBasicImageAssets(this.data.draft, assets.filter((_, itemIndex) => itemIndex !== index));
        refreshEditorView(this, draft, this.data.activeStep);
    },
    async handleUploadDetailImage(event) {
        var _a, _b;
        const replaceIndexValue = (_b = (_a = event === null || event === void 0 ? void 0 : event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.index;
        const replaceIndex = replaceIndexValue === undefined ? -1 : Number(replaceIndexValue);
        const currentAssets = getDraftDetailImageAssets(this.data.draft);
        const remainingSlots = Math.max(0, 9 - currentAssets.length);
        const isReplacing = Number.isInteger(replaceIndex) && replaceIndex >= 0;
        const count = isReplacing ? 1 : remainingSlots;
        if (count <= 0) {
            wx.showToast({
                title: '最多上传 9 张',
                icon: 'none'
            });
            return;
        }
        wx.chooseImage({
            count,
            success: async (result) => {
                var _a;
                const files = getChosenImageFiles(result, count);
                if (!files.length) {
                    return;
                }
                this.setData({ imageUploading: true });
                try {
                    const uploadedAssets = [];
                    for (const file of files) {
                        const uploaded = await (0, catalog_admin_1.uploadProductDetailAsset)(file);
                        uploadedAssets.push(uploaded.asset);
                    }
                    const baseAssets = getDraftDetailImageAssets(this.data.draft);
                    const nextAssets = isReplacing
                        ? baseAssets.length
                            ? baseAssets.map((asset, index) => (index === replaceIndex ? uploadedAssets[0] : asset))
                            : uploadedAssets
                        : [...baseAssets, ...uploadedAssets].slice(0, 9);
                    const draft = applyDetailImageAssets(this.data.draft, nextAssets);
                    refreshEditorView(this, draft, this.data.activeStep);
                }
                catch (error) {
                    logProductImageUploadFailure('detail', error);
                    (_a = wx.showToast) === null || _a === void 0 ? void 0 : _a.call(wx, {
                        title: getProductImageUploadToastTitle(error),
                        icon: 'none'
                    });
                }
                finally {
                    this.setData({ imageUploading: false });
                }
            },
            fail: (error) => {
                var _a;
                if (shouldIgnoreChooseImageFailure(error)) {
                    return;
                }
                logProductImageUploadFailure('choose-detail', error);
                (_a = wx.showToast) === null || _a === void 0 ? void 0 : _a.call(wx, {
                    title: '选择图片失败',
                    icon: 'none'
                });
            }
        });
    },
    handleRemoveDetailImage(event) {
        var _a, _b, _c;
        const index = Number((_c = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.index) !== null && _c !== void 0 ? _c : -1);
        if (index < 0) {
            return;
        }
        const draft = applyDetailImageAssets(this.data.draft, getDraftDetailImageAssets(this.data.draft).filter((_, itemIndex) => itemIndex !== index));
        refreshEditorView(this, draft, this.data.activeStep);
    },
    handleBasePriceInput(event) {
        var _a;
        const value = normalizeMoneyInputText((_a = event.detail) === null || _a === void 0 ? void 0 : _a.value);
        if (isPendingMoneyInput(value)) {
            return value;
        }
        const draft = { ...this.data.draft, pricing: { ...this.data.draft.pricing, basePrice: parseMoneyInput(value) } };
        refreshEditorView(this, draft, this.data.activeStep);
        return value;
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
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const index = Number((_c = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.index) !== null && _c !== void 0 ? _c : -1);
        const field = (_e = (_d = event.currentTarget) === null || _d === void 0 ? void 0 : _d.dataset) === null || _e === void 0 ? void 0 : _e.field;
        if (index < 0 || !field) {
            return;
        }
        const value = field === 'surcharge' ? normalizeMoneyInputText((_f = event.detail) === null || _f === void 0 ? void 0 : _f.value) : ((_h = (_g = event.detail) === null || _g === void 0 ? void 0 : _g.value) !== null && _h !== void 0 ? _h : '');
        if (field === 'surcharge' && isPendingMoneyInput(value)) {
            return value;
        }
        const draft = {
            ...this.data.draft,
            pricing: {
                ...this.data.draft.pricing,
                specs: [...this.data.draft.pricing.specs]
            }
        };
        updateSpecRow(draft, index, field, value);
        refreshEditorView(this, draft, this.data.activeStep);
        return value;
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
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const index = Number((_c = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.index) !== null && _c !== void 0 ? _c : -1);
        const field = (_e = (_d = event.currentTarget) === null || _d === void 0 ? void 0 : _d.dataset) === null || _e === void 0 ? void 0 : _e.field;
        if (index < 0 || !field) {
            return;
        }
        const value = field === 'surcharge' ? normalizeMoneyInputText((_f = event.detail) === null || _f === void 0 ? void 0 : _f.value) : ((_h = (_g = event.detail) === null || _g === void 0 ? void 0 : _g.value) !== null && _h !== void 0 ? _h : '');
        if (field === 'surcharge' && isPendingMoneyInput(value)) {
            return value;
        }
        const draft = {
            ...this.data.draft,
            pricing: {
                ...this.data.draft.pricing,
                formulas: [...this.data.draft.pricing.formulas]
            }
        };
        updateFormulaRow(draft, index, field, value);
        refreshEditorView(this, draft, this.data.activeStep);
        return value;
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
    handlePreviousStep() {
        if (this.data.activeStep === 'pricing') {
            refreshEditorView(this, this.data.draft, 'basicInfo');
            return;
        }
        if (this.data.activeStep === 'publishSettings') {
            refreshEditorView(this, this.data.draft, 'pricing');
        }
    },
    async handleStepSubmit() {
        if (this.data.activeStep === 'basicInfo') {
            if (!this.data.draft.basicInfo.name.trim() || !this.data.draft.basicInfo.categoryId || !getDraftBasicImageAssets(this.data.draft).length) {
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
        try {
            await (0, catalog_admin_1.saveProduct)(this.data.draft);
            this.setData({ saving: false });
            wx.showToast({
                title: '商品已保存',
                icon: 'success'
            });
            wx.navigateBack();
        }
        catch (_a) {
            this.setData({ saving: false });
            wx.showToast({
                title: '保存失败',
                icon: 'none'
            });
        }
    }
});
