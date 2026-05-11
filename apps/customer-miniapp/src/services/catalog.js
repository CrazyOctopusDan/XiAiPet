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
function getAssetUrl(asset, variantName) {
    var _a, _b;
    if (!asset) {
        return undefined;
    }
    return (_b = (_a = asset.variants.find((variant) => variant.name === variantName)) === null || _a === void 0 ? void 0 : _a.url) !== null && _b !== void 0 ? _b : asset.url;
}
function resolveCatalogProductAssetUrls(product) {
    var _a, _b, _c, _d, _e;
    const thumbnail = (_c = (_a = getAssetUrl(product.imageAsset, 'thumbnail')) !== null && _a !== void 0 ? _a : (_b = product.imageAsset) === null || _b === void 0 ? void 0 : _b.url) !== null && _c !== void 0 ? _c : product.thumbnail;
    const gallery = ((_d = product.introductionImageAssets) === null || _d === void 0 ? void 0 : _d.length)
        ? product.introductionImageAssets.map((asset) => { var _a; return (_a = getAssetUrl(asset, 'display')) !== null && _a !== void 0 ? _a : asset.url; })
        : product.gallery;
    const detailImages = ((_e = product.detailImageAssets) === null || _e === void 0 ? void 0 : _e.length)
        ? product.detailImageAssets.map((asset) => { var _a; return (_a = getAssetUrl(asset, 'detail')) !== null && _a !== void 0 ? _a : asset.url; })
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
        cachedCatalogCategories = cloneCategories(categoriesResponse.categories);
    }
    if (Array.isArray(productsResponse.products)) {
        cachedCatalogProducts = cloneProducts(productsResponse.products);
    }
    return {
        categories: getCatalogCategories(),
        products: cloneProducts(cachedCatalogProducts)
    };
}
