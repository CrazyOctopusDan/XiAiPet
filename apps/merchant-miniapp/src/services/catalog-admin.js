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
exports.uploadProductCoverAsset = uploadProductCoverAsset;
exports.saveProduct = saveProduct;
const product_pricing_1 = require("../shared/product-pricing");
const api_client_1 = require("./api-client");
const assets_1 = require("./assets");
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
async function queryCategories(request = api_client_1.merchantApiRequest) {
    var _a;
    const response = await request('/api/v1/merchant/categories', {
        method: 'GET',
        auth: 'merchant'
    });
    return ((_a = response.categories) !== null && _a !== void 0 ? _a : []).map((category) => {
        var _a, _b;
        const linkedProductCount = (_a = category.linkedProductCount) !== null && _a !== void 0 ? _a : 0;
        return {
            ...category,
            linkedProductCount,
            canDelete: (_b = category.canDelete) !== null && _b !== void 0 ? _b : linkedProductCount === 0
        };
    });
}
async function saveCategory(category, request = api_client_1.merchantApiRequest) {
    const response = await request(`/api/v1/merchant/categories/${category.id}`, {
        method: 'PUT',
        body: category,
        auth: 'merchant'
    });
    return response.category;
}
async function deleteCategory(categoryId, request = api_client_1.merchantApiRequest) {
    await request(`/api/v1/merchant/categories/${categoryId}`, {
        method: 'DELETE',
        auth: 'merchant'
    });
    return categoryId;
}
function getCategoryPageViewModel(categories) {
    return {
        isEmpty: categories.length === 0,
        summary: {
            totalCategories: categories.length,
            linkedProducts: categories.reduce((sum, category) => sum + category.linkedProductCount, 0),
            lockedCategories: categories.filter((category) => !category.canDelete).length
        },
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
async function queryProducts(categoryId = '', request = api_client_1.merchantApiRequest) {
    var _a;
    const response = await request('/api/v1/merchant/products', {
        method: 'GET',
        query: categoryId ? { categoryId } : undefined,
        auth: 'merchant'
    });
    return (_a = response.products) !== null && _a !== void 0 ? _a : [];
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
        summary: {
            totalProducts: filteredProducts.length,
            publishedProducts: filteredProducts.filter((product) => product.status === 'published').length,
            stockWarnings: filteredProducts.filter((product) => product.trackInventory && product.stock <= 0).length
        },
        categoryFilters: categories.map((category) => ({
            id: category.id,
            label: category.name,
            isActive: category.id === activeCategoryId
        })),
        cards: filteredProducts.map((product) => {
            var _a, _b, _c;
            return ({
                id: product.id,
                name: product.name,
                statusLabel: getStatusLabel(product.status),
                stockLabel: product.trackInventory ? `库存 ${product.stock}` : '库存不跟踪',
                priceRangeLabel: getPriceRangeLabel(product),
                fulfillmentModesLabel: product.fulfillmentModes.map(getFulfillmentModeLabel).join(' / '),
                imagePreviewUrl: (_c = (_b = (_a = product.imageAsset) === null || _a === void 0 ? void 0 : _a.url) !== null && _b !== void 0 ? _b : product.imagePreviewUrl) !== null && _c !== void 0 ? _c : product.imageFileId
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
            introductionImageAssets: [],
            detailImageAssets: [],
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
    var _a, _b, _c;
    return {
        basicInfo: {
            productId: product.id,
            name: product.name,
            description: product.description,
            categoryId: product.categoryId,
            imageFileId: product.imageFileId,
            imageAsset: product.imageAsset,
            introductionImageAssets: (_a = product.introductionImageAssets) !== null && _a !== void 0 ? _a : [],
            detailImageAssets: (_b = product.detailImageAssets) !== null && _b !== void 0 ? _b : [],
            imagePreviewUrl: (_c = product.imagePreviewUrl) !== null && _c !== void 0 ? _c : product.imageFileId,
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
        activeStepLabel: getStepLabel(activeStep),
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
async function uploadProductImage(filePath, productId, request) {
    void productId;
    const uploaded = await (0, assets_1.uploadMerchantAsset)('product-cover', {
        filePath,
        processingMode: 'miniapp',
        request
    });
    return uploaded.storageId;
}
async function uploadProductCoverAsset(filePath, request) {
    return (0, assets_1.uploadMerchantAsset)('product-cover', {
        filePath,
        processingMode: 'miniapp',
        request
    });
}
async function saveProduct(payload, request = api_client_1.merchantApiRequest) {
    const response = await request(`/api/v1/merchant/products/${payload.basicInfo.productId}`, {
        method: 'PUT',
        body: payload,
        auth: 'merchant'
    });
    return response.product;
}
