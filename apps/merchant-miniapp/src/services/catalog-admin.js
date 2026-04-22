"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryCategories = queryCategories;
exports.saveCategory = saveCategory;
exports.deleteCategory = deleteCategory;
exports.getCategoryPageViewModel = getCategoryPageViewModel;
exports.queryProducts = queryProducts;
exports.getProductPageViewModel = getProductPageViewModel;
exports.createEmptyProductEditorPayload = createEmptyProductEditorPayload;
exports.splitProductEditorPayload = splitProductEditorPayload;
exports.getProductEditorViewModel = getProductEditorViewModel;
exports.uploadProductImage = uploadProductImage;
exports.saveProduct = saveProduct;
const product_pricing_1 = require("../shared/product-pricing");
function getCloudCaller() {
    return (payload) => wx.cloud.callFunction(payload);
}
function getUploader() {
    return (payload) => wx.cloud.uploadFile(payload);
}
function formatMoney(value) {
    return `￥${value.toFixed(2)}`;
}
function getStatusLabel(status) {
    if (status === 'published') {
        return '已上架';
    }
    if (status === 'archived') {
        return '已归档';
    }
    return '草稿';
}
function getFulfillmentModeLabel(mode) {
    if (mode === 'pickup') {
        return '自取';
    }
    if (mode === 'express') {
        return '快递';
    }
    return '配送';
}
function getPriceRangeLabel(product) {
    const resolvedPrices = [product.basePrice];
    product.specs.forEach((spec) => {
        product.formulas.forEach((formula) => {
            resolvedPrices.push((0, product_pricing_1.resolveProductCombinationPrice)(product, {
                specId: spec.id,
                formulaId: formula.id
            }).finalPrice);
        });
    });
    const min = Math.min(...resolvedPrices);
    const max = Math.max(...resolvedPrices);
    if (min === max) {
        return formatMoney(min);
    }
    return `${formatMoney(min)} 起`;
}
function getStepLabel(step) {
    if (step === 'basicInfo') {
        return '基础信息';
    }
    if (step === 'pricing') {
        return '规格配方与价格';
    }
    return '上架设置';
}
function getStepCtaLabel(step) {
    if (step === 'basicInfo') {
        return '保存基础信息并继续';
    }
    if (step === 'pricing') {
        return '保存规格配方并继续';
    }
    return '保存商品';
}
function createPricePreviewRows(basePrice, specs, formulas, overrides) {
    const previewProduct = {
        basePrice,
        specs,
        formulas,
        priceOverrides: overrides
    };
    return specs.flatMap((spec) => formulas.map((formula) => {
        const resolution = (0, product_pricing_1.resolveProductCombinationPrice)(previewProduct, {
            specId: spec.id,
            formulaId: formula.id
        });
        return {
            label: `${spec.label} × ${formula.label}`,
            computedPriceLabel: formatMoney(resolution.computedPrice),
            finalPriceLabel: formatMoney(resolution.finalPrice),
            overrideLabel: resolution.source === 'override' ? '已覆盖自动计算' : null
        };
    }));
}
function getDraftProductId() {
    return `product-${Date.now()}`;
}
async function queryCategories(callFunction = getCloudCaller()) {
    var _a;
    const response = (await callFunction({
        name: 'queryCategories',
        data: {}
    }));
    return (_a = response.result.categories) !== null && _a !== void 0 ? _a : [];
}
async function saveCategory(category, callFunction = getCloudCaller()) {
    const response = (await callFunction({
        name: 'upsertCategory',
        data: {
            action: 'update',
            category
        }
    }));
    return response.result.category;
}
async function deleteCategory(categoryId, callFunction = getCloudCaller()) {
    const response = (await callFunction({
        name: 'upsertCategory',
        data: {
            action: 'delete',
            categoryId
        }
    }));
    return response.result.deletedCategoryId;
}
function getCategoryPageViewModel(categories) {
    return {
        isEmpty: categories.length === 0,
        cards: categories.map((category) => ({
            id: category.id,
            name: category.name,
            iconToken: category.iconToken,
            linkedProductCountLabel: `${category.linkedProductCount} 个商品`,
            deleteActionLabel: category.canDelete ? '删除品类' : '先迁移商品',
            helperText: category.canDelete ? '当前可以直接删除' : '删除前请先迁移该品类下商品'
        }))
    };
}
async function queryProducts(categoryId = '', callFunction = getCloudCaller()) {
    var _a;
    const response = (await callFunction({
        name: 'queryProducts',
        data: categoryId ? { categoryId } : {}
    }));
    return (_a = response.result.products) !== null && _a !== void 0 ? _a : [];
}
function getProductPageViewModel(products, categories, activeCategoryId, keyword) {
    const normalizedKeyword = keyword.trim();
    const filteredProducts = products.filter((product) => {
        if (activeCategoryId && product.categoryId !== activeCategoryId) {
            return false;
        }
        if (!normalizedKeyword) {
            return true;
        }
        return `${product.name} ${product.description} ${product.detailContent}`.includes(normalizedKeyword);
    });
    return {
        isEmpty: filteredProducts.length === 0,
        categoryFilters: categories.map((category) => ({
            id: category.id,
            label: category.name,
            isActive: category.id === activeCategoryId
        })),
        cards: filteredProducts.map((product) => {
            var _a;
            return ({
                id: product.id,
                name: product.name,
                statusLabel: getStatusLabel(product.status),
                stockLabel: product.trackInventory ? `库存 ${product.stock}` : '库存不跟踪',
                priceRangeLabel: getPriceRangeLabel(product),
                fulfillmentModesLabel: product.fulfillmentModes.map(getFulfillmentModeLabel).join(' / '),
                imagePreviewUrl: (_a = product.imagePreviewUrl) !== null && _a !== void 0 ? _a : product.imageFileId
            });
        })
    };
}
function createEmptyProductEditorPayload(categoryId = '') {
    return {
        basicInfo: {
            productId: getDraftProductId(),
            name: '',
            description: '',
            categoryId,
            imageFileId: '',
            imagePreviewUrl: '',
            memberLevelId: null,
            stock: 0
        },
        pricing: {
            basePrice: 0,
            specs: [],
            formulas: [],
            overrides: [],
            purchaseLimit: {
                enabled: false,
                maxQuantity: null
            },
            detailContent: ''
        },
        publishSettings: {
            status: 'draft',
            fulfillmentModes: ['delivery'],
            trackInventory: true
        }
    };
}
function splitProductEditorPayload(product) {
    var _a;
    return {
        basicInfo: {
            productId: product.id,
            name: product.name,
            description: product.description,
            categoryId: product.categoryId,
            imageFileId: product.imageFileId,
            imagePreviewUrl: (_a = product.imagePreviewUrl) !== null && _a !== void 0 ? _a : product.imageFileId,
            memberLevelId: product.memberLevelId,
            stock: product.stock
        },
        pricing: {
            basePrice: product.basePrice,
            specs: product.specs,
            formulas: product.formulas,
            overrides: product.priceOverrides,
            purchaseLimit: product.purchaseLimit,
            detailContent: product.detailContent
        },
        publishSettings: {
            status: product.status,
            fulfillmentModes: product.fulfillmentModes,
            trackInventory: product.trackInventory
        }
    };
}
function getProductEditorViewModel(payload, activeStep) {
    var _a;
    const steps = ['basicInfo', 'pricing', 'publishSettings'];
    return {
        steps: steps.map((step, index) => ({
            value: step,
            label: getStepLabel(step),
            isActive: step === activeStep,
            isDone: steps.indexOf(activeStep) > index
        })),
        ctaLabel: getStepCtaLabel(activeStep),
        purchaseLimitLabel: payload.pricing.purchaseLimit.enabled
            ? `限购 ${(_a = payload.pricing.purchaseLimit.maxQuantity) !== null && _a !== void 0 ? _a : 0} 件`
            : '不限购',
        detailContentLabel: payload.pricing.detailContent ? '详情内容已填写' : '详情内容待填写',
        fulfillmentModeLabels: payload.publishSettings.fulfillmentModes.map(getFulfillmentModeLabel),
        pricePreviewRows: createPricePreviewRows(payload.pricing.basePrice, payload.pricing.specs, payload.pricing.formulas, payload.pricing.overrides)
    };
}
async function uploadProductImage(filePath, productId, uploader = getUploader()) {
    var _a;
    const response = (await uploader({
        cloudPath: `products/${productId}/${Date.now()}-${(_a = filePath.split('/').pop()) !== null && _a !== void 0 ? _a : 'cover.png'}`,
        filePath
    }));
    return response.fileID;
}
async function saveProduct(payload, callFunction = getCloudCaller()) {
    const response = (await callFunction({
        name: 'upsertProduct',
        data: {
            payload
        }
    }));
    return response.result.product;
}
