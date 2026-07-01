"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryCategories = queryCategories;
exports.saveCategory = saveCategory;
exports.reorderCategories = reorderCategories;
exports.deleteCategory = deleteCategory;
exports.getCategoryPageViewModel = getCategoryPageViewModel;
exports.queryProducts = queryProducts;
exports.getProductDetail = getProductDetail;
exports.applyProductCountsToCategories = applyProductCountsToCategories;
exports.getProductPageViewModel = getProductPageViewModel;
exports.createEmptyProductEditorPayload = createEmptyProductEditorPayload;
exports.splitProductEditorPayload = splitProductEditorPayload;
exports.getProductEditorViewModel = getProductEditorViewModel;
exports.uploadProductImage = uploadProductImage;
exports.uploadProductCoverAsset = uploadProductCoverAsset;
exports.uploadProductDetailAsset = uploadProductDetailAsset;
exports.saveProduct = saveProduct;
exports.deleteProduct = deleteProduct;
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
function getFulfillmentModeOptions(activeModes) {
    const modes = ['delivery', 'pickup', 'express'];
    return modes.map((mode) => ({
        value: mode,
        label: getFulfillmentModeLabel(mode),
        isActive: activeModes.includes(mode)
    }));
}
function hasListPriceRange(product) {
    return 'minPrice' in product && 'maxPrice' in product;
}
function getPriceRangeLabel(product) {
    if (hasListPriceRange(product)) {
        if (product.minPrice === product.maxPrice) {
            return formatMoney(product.minPrice);
        }
        return `${formatMoney(product.minPrice)} 起`;
    }
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
function getProductImagePreviewUrl(product) {
    var _a, _b, _c;
    if ('thumbnail' in product && product.thumbnail) {
        return normalizeImageUrlForDisplay(product.thumbnail);
    }
    const fullProduct = product;
    return normalizeImageUrlForDisplay((_c = (_b = (_a = fullProduct.imageAsset) === null || _a === void 0 ? void 0 : _a.url) !== null && _b !== void 0 ? _b : fullProduct.imagePreviewUrl) !== null && _c !== void 0 ? _c : fullProduct.imageFileId);
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
function getPreviousStepLabel(step) {
    if (step === 'pricing') {
        return '返回基础信息';
    }
    if (step === 'publishSettings') {
        return '返回规格配方与价格';
    }
    return null;
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
function normalizeImageUrlForDisplay(value) {
    if (typeof value !== 'string') {
        return '';
    }
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
function getAssetDisplayUrl(asset) {
    var _a;
    const variants = Array.isArray(asset.variants) ? asset.variants : [];
    const displayVariant = variants.find((variant) => Boolean(variant) &&
        typeof variant === 'object' &&
        'name' in variant &&
        'url' in variant &&
        variant.name === 'display' &&
        typeof variant.url === 'string');
    return normalizeImageUrlForDisplay((_a = displayVariant === null || displayVariant === void 0 ? void 0 : displayVariant.url) !== null && _a !== void 0 ? _a : asset.url);
}
function getBasicImageTiles(payload) {
    var _a;
    const assets = (_a = payload.basicInfo.introductionImageAssets) !== null && _a !== void 0 ? _a : [];
    if (assets.length) {
        return assets.slice(0, 3).map((asset, index) => ({
            index,
            imageSrc: getAssetDisplayUrl(asset),
            isCover: index === 0
        }));
    }
    const fallback = payload.basicInfo.imageAsset
        ? getAssetDisplayUrl(payload.basicInfo.imageAsset)
        : normalizeImageUrlForDisplay(payload.basicInfo.imagePreviewUrl || payload.basicInfo.imageFileId);
    return fallback
        ? [
            {
                index: 0,
                imageSrc: fallback,
                isCover: true
            }
        ]
        : [];
}
function getDetailImageTiles(payload) {
    var _a;
    return ((_a = payload.basicInfo.detailImageAssets) !== null && _a !== void 0 ? _a : []).slice(0, 9).map((asset, index) => ({
        index,
        imageSrc: getAssetDisplayUrl(asset)
    }));
}
async function queryCategories(request = api_client_1.merchantApiRequest) {
    var _a;
    const response = await request('/api/v1/merchant/categories', {
        method: 'GET',
        auth: 'merchant'
    });
    return ((_a = response.categories) !== null && _a !== void 0 ? _a : []).map((category, index) => {
        var _a, _b, _c;
        const linkedProductCount = (_a = category.linkedProductCount) !== null && _a !== void 0 ? _a : 0;
        return {
            ...category,
            sortOrder: (_b = category.sortOrder) !== null && _b !== void 0 ? _b : index + 1,
            linkedProductCount,
            canDelete: (_c = category.canDelete) !== null && _c !== void 0 ? _c : linkedProductCount === 0
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
async function reorderCategories(categories, request = api_client_1.merchantApiRequest) {
    var _a;
    const response = await request('/api/v1/merchant/categories/reorder', {
        method: 'POST',
        body: {
            items: categories.map((category, index) => ({
                id: category.id,
                sortOrder: index + 1
            }))
        },
        auth: 'merchant'
    });
    return ((_a = response.categories) !== null && _a !== void 0 ? _a : categories).map((category, index) => {
        var _a, _b, _c;
        const linkedProductCount = (_a = category.linkedProductCount) !== null && _a !== void 0 ? _a : 0;
        return {
            ...category,
            sortOrder: (_b = category.sortOrder) !== null && _b !== void 0 ? _b : index + 1,
            linkedProductCount,
            canDelete: (_c = category.canDelete) !== null && _c !== void 0 ? _c : linkedProductCount === 0
        };
    });
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
        cards: categories.map((category, index) => ({
            id: category.id,
            name: category.name,
            iconToken: category.iconToken,
            sortOrder: category.sortOrder,
            canMoveUp: index > 0,
            canMoveDown: index < categories.length - 1,
            linkedProductCountLabel: `${category.linkedProductCount} 个商品`,
            deleteActionLabel: category.canDelete ? '删除品类' : '先迁移商品',
            helperText: category.canDelete ? '当前可以直接删除' : '删除前请先迁移该品类下商品'
        }))
    };
}
function defaultProductListSummary() {
    return {
        totalProducts: 0,
        publishedProducts: 0,
        draftProducts: 0,
        archivedProducts: 0,
        stockWarnings: 0
    };
}
function defaultPageInfo() {
    return { hasMore: false, nextCursor: null };
}
function cleanProductQuery(filters) {
    return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined && value !== ''));
}
async function queryProducts(filters = {}, request = api_client_1.merchantApiRequest) {
    var _a, _b, _c, _d, _e;
    const query = cleanProductQuery(filters);
    const response = await request('/api/v1/merchant/products', {
        method: 'GET',
        query,
        auth: 'merchant'
    });
    const items = (_b = (_a = response.items) !== null && _a !== void 0 ? _a : response.products) !== null && _b !== void 0 ? _b : [];
    return {
        items,
        summary: (_c = response.summary) !== null && _c !== void 0 ? _c : defaultProductListSummary(),
        pageInfo: (_d = response.pageInfo) !== null && _d !== void 0 ? _d : defaultPageInfo(),
        snapshotKey: (_e = response.snapshotKey) !== null && _e !== void 0 ? _e : ''
    };
}
async function getProductDetail(productId, request = api_client_1.merchantApiRequest) {
    const response = await request(`/api/v1/merchant/products/${productId}`, {
        method: 'GET',
        auth: 'merchant'
    });
    return response.product;
}
function applyProductCountsToCategories(categories, products) {
    const productCounts = products.reduce((counts, product) => {
        var _a;
        counts[product.categoryId] = ((_a = counts[product.categoryId]) !== null && _a !== void 0 ? _a : 0) + 1;
        return counts;
    }, {});
    return categories.map((category) => {
        var _a;
        const linkedProductCount = (_a = productCounts[category.id]) !== null && _a !== void 0 ? _a : 0;
        return {
            ...category,
            linkedProductCount,
            canDelete: linkedProductCount === 0
        };
    });
}
function getProductPageViewModel(products, categories, activeCategoryId, keyword, backendSummary) {
    const normalizedKeyword = keyword.trim();
    const filteredProducts = products.filter((product) => {
        if (activeCategoryId && product.categoryId !== activeCategoryId) {
            return false;
        }
        if (!normalizedKeyword) {
            return true;
        }
        const detailContent = 'detailContent' in product ? product.detailContent : '';
        return `${product.name} ${product.description} ${detailContent}`.includes(normalizedKeyword);
    });
    return {
        isEmpty: filteredProducts.length === 0,
        summary: backendSummary
            ? {
                totalProducts: backendSummary.totalProducts,
                publishedProducts: backendSummary.publishedProducts,
                stockWarnings: backendSummary.stockWarnings
            }
            : {
                totalProducts: filteredProducts.length,
                publishedProducts: filteredProducts.filter((product) => product.status === 'published').length,
                stockWarnings: filteredProducts.filter((product) => product.trackInventory && product.stock <= 0).length
            },
        categoryFilters: categories.map((category) => ({
            id: category.id,
            label: category.name,
            isActive: category.id === activeCategoryId
        })),
        cards: filteredProducts.map((product) => ({
            id: product.id,
            name: product.name,
            statusLabel: getStatusLabel(product.status),
            stockLabel: product.trackInventory ? `库存 ${product.stock}` : '库存不跟踪',
            priceRangeLabel: getPriceRangeLabel(product),
            fulfillmentModesLabel: product.fulfillmentModes.map(getFulfillmentModeLabel).join(' / '),
            imagePreviewUrl: getProductImagePreviewUrl(product)
        }))
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
            imagePreviewUrl: normalizeImageUrlForDisplay((_c = product.imagePreviewUrl) !== null && _c !== void 0 ? _c : product.imageFileId),
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
    const basicImageTiles = getBasicImageTiles(payload);
    const detailImageTiles = getDetailImageTiles(payload);
    return {
        activeStepLabel: getStepLabel(activeStep),
        steps: steps.map((step, index) => ({
            value: step,
            label: getStepLabel(step),
            isActive: step === activeStep,
            isDone: steps.indexOf(activeStep) > index
        })),
        ctaLabel: getStepCtaLabel(activeStep),
        previousStepLabel: getPreviousStepLabel(activeStep),
        basicImageCountLabel: `${basicImageTiles.length} / 3`,
        basicImageTiles,
        canAddBasicImage: basicImageTiles.length < 3,
        detailImageCountLabel: `${detailImageTiles.length} / 9`,
        detailImageTiles,
        canAddDetailImage: detailImageTiles.length < 9,
        purchaseLimitLabel: payload.pricing.purchaseLimit.enabled
            ? `限购 ${(_a = payload.pricing.purchaseLimit.maxQuantity) !== null && _a !== void 0 ? _a : 0} 件`
            : '不限购',
        detailContentLabel: payload.pricing.detailContent ? '详情内容已填写' : '详情内容待填写',
        fulfillmentModeOptions: getFulfillmentModeOptions(payload.publishSettings.fulfillmentModes),
        fulfillmentModeLabels: payload.publishSettings.fulfillmentModes.map(getFulfillmentModeLabel),
        pricePreviewRows: createPricePreviewRows(payload.pricing.basePrice, payload.pricing.specs, payload.pricing.formulas, payload.pricing.overrides)
    };
}
async function uploadProductImage(filePath, productId, request) {
    void productId;
    const file = typeof filePath === 'string' ? { filePath } : { filePath: filePath.filePath, fileSizeBytes: filePath.sizeBytes };
    const uploaded = await (0, assets_1.uploadMerchantAsset)('product-cover', {
        ...file,
        processingMode: 'miniapp',
        request
    });
    return uploaded.storageId;
}
async function uploadProductCoverAsset(filePath, request) {
    const file = typeof filePath === 'string' ? { filePath } : { filePath: filePath.filePath, fileSizeBytes: filePath.sizeBytes };
    return (0, assets_1.uploadMerchantAsset)('product-cover', {
        ...file,
        processingMode: 'miniapp',
        request
    });
}
async function uploadProductDetailAsset(filePath, request) {
    const file = typeof filePath === 'string' ? { filePath } : { filePath: filePath.filePath, fileSizeBytes: filePath.sizeBytes };
    return (0, assets_1.uploadMerchantAsset)('product-detail', {
        ...file,
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
async function deleteProduct(productId, request = api_client_1.merchantApiRequest) {
    await request(`/api/v1/merchant/products/${productId}`, {
        method: 'DELETE',
        auth: 'merchant'
    });
    return productId;
}
