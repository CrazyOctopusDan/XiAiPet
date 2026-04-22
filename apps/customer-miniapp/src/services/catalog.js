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
const catalog_1 = require("../data/catalog");
function getHomeModules() {
    return catalog_1.homeModules;
}
async function defaultResolveHomeModuleImages(fileIds) {
    var _a, _b;
    if (!fileIds.length || !((_a = wx === null || wx === void 0 ? void 0 : wx.cloud) === null || _a === void 0 ? void 0 : _a.getTempFileURL)) {
        return {};
    }
    try {
        const response = (await wx.cloud.getTempFileURL({
            fileList: fileIds
        }));
        return Object.fromEntries(((_b = response.fileList) !== null && _b !== void 0 ? _b : [])
            .filter((item) => item.fileID && item.tempFileURL)
            .map((item) => [item.fileID, item.tempFileURL]));
    }
    catch (_c) {
        return {};
    }
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
    return catalog_1.catalogCategories;
}
function getCategoryById(categoryId) {
    var _a;
    return (_a = catalog_1.catalogCategories.find((category) => category.id === categoryId)) !== null && _a !== void 0 ? _a : null;
}
function getDeliveryModes() {
    return [
        { id: 'pickup', label: '自取' },
        { id: 'delivery', label: '配送' },
        { id: 'express', label: '快递' }
    ];
}
function buildCatalogSections(mode) {
    return catalog_1.catalogCategories
        .map((category) => {
        const products = catalog_1.catalogProducts.filter((product) => product.categoryId === category.id && product.deliveryModes.includes(mode));
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
    return catalog_1.catalogProducts.filter((product) => {
        const haystack = `${product.name} ${product.summary} ${product.description}`.toLowerCase();
        return haystack.includes(normalizedKeyword);
    });
}
function getProductById(productId) {
    var _a;
    return (_a = catalog_1.catalogProducts.find((product) => product.id === productId)) !== null && _a !== void 0 ? _a : null;
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
