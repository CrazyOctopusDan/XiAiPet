"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHomeModules = getHomeModules;
exports.resolveHomeModuleImageSources = resolveHomeModuleImageSources;
exports.getCatalogCategories = getCatalogCategories;
exports.getCategoryById = getCategoryById;
exports.getDeliveryModes = getDeliveryModes;
exports.buildCatalogSections = buildCatalogSections;
exports.searchProducts = searchProducts;
exports.getProductById = getProductById;
exports.resolveProductSpec = resolveProductSpec;
exports.getProductDisplayPrice = getProductDisplayPrice;
exports.getProductSelectedSpecLabel = getProductSelectedSpecLabel;
exports.resolveCatalogProductAssetUrls = resolveCatalogProductAssetUrls;
exports.resetCatalogCache = resetCatalogCache;
exports.hydrateCatalog = hydrateCatalog;
const catalog_1 = require("../data/catalog");
const api_client_1 = require("./api-client");
let cachedCatalogCategories = cloneCategories(catalog_1.catalogCategories);
let cachedCatalogProducts = cloneProducts(catalog_1.catalogProducts);
function getHomeModules() {
    return catalog_1.homeModules;
}
async function defaultResolveHomeModuleImages() {
    return {};
}
async function resolveHomeModuleImageSources(resolveImages = defaultResolveHomeModuleImages) {
    const modules = getHomeModules();
    const resolvedImages = await resolveImages(modules.map((module) => module.imageFileId));
    return modules.map((module) => {
        var _a;
        return ({
            ...module,
            imageSrc: (_a = resolvedImages[module.imageFileId]) !== null && _a !== void 0 ? _a : module.imageFileId
        });
    });
}
function getCatalogCategories() {
    return cloneCategories(cachedCatalogCategories);
}
function getCategoryById(categoryId) {
    var _a;
    return (_a = cachedCatalogCategories.find((category) => category.id === categoryId)) !== null && _a !== void 0 ? _a : null;
}
function getDeliveryModes() {
    return [
        { id: 'pickup', label: '自取' },
        { id: 'delivery', label: '配送' },
        { id: 'express', label: '快递' }
    ];
}
function buildCatalogSections(mode) {
    return cachedCatalogCategories
        .map((category) => {
        const products = cachedCatalogProducts.filter((product) => product.categoryId === category.id && product.deliveryModes.includes(mode));
        return {
            category,
            availableProducts: products.filter((product) => !product.soldOut),
            soldOutProducts: products.filter((product) => product.soldOut)
        };
    })
        .filter((section) => section.availableProducts.length > 0 || section.soldOutProducts.length > 0);
}
function searchProducts(keyword) {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) {
        return [];
    }
    return cachedCatalogProducts.filter((product) => {
        const haystack = `${product.name} ${product.summary} ${product.description}`.toLowerCase();
        return haystack.includes(normalizedKeyword);
    });
}
function getProductById(productId) {
    var _a;
    return (_a = cachedCatalogProducts.find((product) => product.id === productId)) !== null && _a !== void 0 ? _a : null;
}
function resolveProductSpec(product, specId) {
    var _a, _b;
    if (!product.specs.length) {
        return null;
    }
    return (_b = (_a = product.specs.find((item) => item.id === specId)) !== null && _a !== void 0 ? _a : product.specs[0]) !== null && _b !== void 0 ? _b : null;
}
function getProductDisplayPrice(product, specId = '') {
    var _a, _b;
    return (_b = (_a = resolveProductSpec(product, specId)) === null || _a === void 0 ? void 0 : _a.price) !== null && _b !== void 0 ? _b : product.price;
}
function getProductSelectedSpecLabel(product, specId) {
    var _a, _b;
    return (_b = (_a = resolveProductSpec(product, specId)) === null || _a === void 0 ? void 0 : _a.label) !== null && _b !== void 0 ? _b : '';
}
function isObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function asString(value, fallback = '') {
    return typeof value === 'string' ? value : fallback;
}
function asNumber(value, fallback = 0) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
}
function isDeliveryMode(value) {
    return value === 'pickup' || value === 'delivery' || value === 'express';
}
function getArray(value) {
    return Array.isArray(value) ? value : [];
}
function normalizeCategory(category) {
    if (!isObject(category)) {
        return null;
    }
    const id = asString(category.id, asString(category._id));
    const name = asString(category.name);
    if (!id || !name) {
        return null;
    }
    return {
        id,
        name,
        shortName: asString(category.shortName, name),
        iconText: asString(category.iconText, asString(category.iconToken, name.slice(0, 1))),
        sectionTitle: asString(category.sectionTitle, name)
    };
}
function isAssetReference(value) {
    return (isObject(value) &&
        value.provider === 'oss' &&
        typeof value.url === 'string' &&
        Array.isArray(value.variants));
}
function getVariantUrl(asset, variantName) {
    var _a, _b;
    if (!asset) {
        return undefined;
    }
    return (_b = (_a = asset.variants.find((variant) => variant.name === variantName)) === null || _a === void 0 ? void 0 : _a.url) !== null && _b !== void 0 ? _b : asset.url;
}
function normalizeAssetArray(value) {
    const assets = getArray(value).filter(isAssetReference);
    return assets.length ? assets : undefined;
}
function normalizeDeliveryModes(product) {
    const source = getArray(product.deliveryModes).length ? product.deliveryModes : product.fulfillmentModes;
    const modes = getArray(source).filter(isDeliveryMode);
    return modes.length ? modes : ['pickup', 'delivery', 'express'];
}
function normalizeProductSpecs(product, basePrice) {
    return getArray(product.specs)
        .filter(isObject)
        .map((spec) => {
        const price = asNumber(spec.price, basePrice + asNumber(spec.surcharge));
        return {
            id: asString(spec.id),
            label: asString(spec.label),
            price
        };
    })
        .filter((spec) => spec.id && spec.label);
}
function normalizeProduct(product) {
    var _a;
    if (!isObject(product)) {
        return null;
    }
    const id = asString(product.id, asString(product._id));
    const name = asString(product.name);
    const categoryId = asString(product.categoryId);
    if (!id || !name || !categoryId) {
        return null;
    }
    const imageAsset = isAssetReference(product.imageAsset) ? product.imageAsset : undefined;
    const introductionImageAssets = normalizeAssetArray(product.introductionImageAssets);
    const detailImageAssets = normalizeAssetArray(product.detailImageAssets);
    const price = asNumber(product.price, asNumber(product.basePrice));
    const specs = normalizeProductSpecs(product, price);
    const thumbnail = (_a = getVariantUrl(imageAsset, 'thumbnail')) !== null && _a !== void 0 ? _a : asString(product.thumbnail, asString(product.imagePreviewUrl, asString(product.imageFileId)));
    return {
        id,
        name,
        summary: asString(product.summary, asString(product.description)),
        description: asString(product.detailContent, asString(product.description, asString(product.summary))),
        price,
        stock: asNumber(product.stock),
        soldOut: typeof product.soldOut === 'boolean'
            ? product.soldOut
            : Boolean(product.trackInventory) && asNumber(product.stock) <= 0,
        cartActionLabel: product.cartActionLabel === '直接加购' || product.cartActionLabel === '选规格'
            ? product.cartActionLabel
            : specs.length
                ? '选规格'
                : '直接加购',
        memberLevelLabel: asString(product.memberLevelLabel, product.memberLevelId ? '会员可购' : '普通会员可购'),
        categoryId,
        deliveryModes: normalizeDeliveryModes(product),
        thumbnail,
        imageAsset,
        gallery: (introductionImageAssets === null || introductionImageAssets === void 0 ? void 0 : introductionImageAssets.length)
            ? introductionImageAssets.map((asset) => { var _a; return (_a = getVariantUrl(asset, 'display')) !== null && _a !== void 0 ? _a : asset.url; })
            : getArray(product.gallery).filter((item) => typeof item === 'string'),
        introductionImageAssets,
        detailImages: (detailImageAssets === null || detailImageAssets === void 0 ? void 0 : detailImageAssets.length)
            ? detailImageAssets.map((asset) => { var _a; return (_a = getVariantUrl(asset, 'detail')) !== null && _a !== void 0 ? _a : asset.url; })
            : getArray(product.detailImages).filter((item) => typeof item === 'string'),
        detailImageAssets,
        specs
    };
}
function cloneCategories(categories) {
    return categories.map((category) => ({ ...category }));
}
function cloneProducts(products) {
    return products.map((product) => {
        const resolved = resolveCatalogProductAssetUrls(product);
        return {
            ...resolved,
            deliveryModes: [...resolved.deliveryModes],
            gallery: [...resolved.gallery],
            detailImages: [...resolved.detailImages],
            specs: resolved.specs.map((spec) => ({ ...spec }))
        };
    });
}
function resolveCatalogProductAssetUrls(product) {
    var _a, _b, _c, _d, _e;
    const thumbnail = (_c = (_a = getVariantUrl(product.imageAsset, 'thumbnail')) !== null && _a !== void 0 ? _a : (_b = product.imageAsset) === null || _b === void 0 ? void 0 : _b.url) !== null && _c !== void 0 ? _c : product.thumbnail;
    const gallery = ((_d = product.introductionImageAssets) === null || _d === void 0 ? void 0 : _d.length)
        ? product.introductionImageAssets.map((asset) => { var _a; return (_a = getVariantUrl(asset, 'display')) !== null && _a !== void 0 ? _a : asset.url; })
        : product.gallery;
    const detailImages = ((_e = product.detailImageAssets) === null || _e === void 0 ? void 0 : _e.length)
        ? product.detailImageAssets.map((asset) => { var _a; return (_a = getVariantUrl(asset, 'detail')) !== null && _a !== void 0 ? _a : asset.url; })
        : product.detailImages;
    return {
        ...product,
        thumbnail,
        gallery,
        detailImages
    };
}
function resetCatalogCache() {
    cachedCatalogCategories = cloneCategories(catalog_1.catalogCategories);
    cachedCatalogProducts = cloneProducts(catalog_1.catalogProducts);
}
async function hydrateCatalog(request = api_client_1.customerApiRequest) {
    const [categoriesResponse, productsResponse] = await Promise.all([
        request('/api/v1/customer/catalog/categories', {
            method: 'GET',
            auth: 'none'
        }),
        request('/api/v1/customer/catalog/products', {
            method: 'GET',
            auth: 'none'
        })
    ]);
    if (Array.isArray(categoriesResponse.categories)) {
        cachedCatalogCategories = cloneCategories(categoriesResponse.categories.map(normalizeCategory).filter(Boolean));
    }
    if (Array.isArray(productsResponse.products)) {
        cachedCatalogProducts = cloneProducts(productsResponse.products.map(normalizeProduct).filter(Boolean));
    }
    return {
        categories: getCatalogCategories(),
        products: cloneProducts(cachedCatalogProducts)
    };
}
