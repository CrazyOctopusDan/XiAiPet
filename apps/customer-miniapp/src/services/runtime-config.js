"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCachedCustomerRuntimeConfig = getCachedCustomerRuntimeConfig;
exports.resolveRuntimeBannerImageSrc = resolveRuntimeBannerImageSrc;
exports.resetCustomerRuntimeConfigCache = resetCustomerRuntimeConfigCache;
exports.hydrateCustomerRuntimeConfig = hydrateCustomerRuntimeConfig;
const api_client_1 = require("./api-client");
const LOCKED_DELIVERY_RULE_ROWS = [
    { distanceKm: 5, minimumOrderAmount: 98, deliveryFee: 0, explainer: '5.0 公里内 98 元起送，配送费 0 元' },
    { distanceKm: 10, minimumOrderAmount: 98, deliveryFee: 15, explainer: '10.0 公里内 98 元起送，配送费 15 元' },
    { distanceKm: 15, minimumOrderAmount: null, deliveryFee: 25, explainer: '15.0 公里内，配送费 25 元' },
    { distanceKm: 20, minimumOrderAmount: null, deliveryFee: 40, explainer: '20.0 公里内，配送费 40 元' },
    { distanceKm: 25, minimumOrderAmount: null, deliveryFee: 50, explainer: '25.0 公里内，配送费 50 元' },
    { distanceKm: 30, minimumOrderAmount: null, deliveryFee: 60, explainer: '30.0 公里内，配送费 60 元' },
    { distanceKm: 35, minimumOrderAmount: null, deliveryFee: 65, explainer: '35.0 公里内，配送费 65 元' },
    { distanceKm: 40, minimumOrderAmount: null, deliveryFee: 70, explainer: '40.0 公里内，配送费 70 元' },
    { distanceKm: 45, minimumOrderAmount: null, deliveryFee: 75, explainer: '45.0 公里内，配送费 75 元' },
    { distanceKm: 50, minimumOrderAmount: null, deliveryFee: 80, explainer: '50.0 公里内，配送费 80 元' }
];
const DEFAULT_RUNTIME_CONFIG = {
    banner: {
        fileId: '/assets/catalog/banner.jpg',
        altText: '首页 Banner'
    },
    store: {
        name: '虾衣宠物烘焙工作室',
        storeName: '虾衣宠物烘焙工作室',
        address: '上海市静安区南京西路 1266 号 8 楼',
        latitude: 31.22911,
        longitude: 121.44853,
        wechatId: '',
        ownerPhone: ''
    },
    customNotice: {
        enabled: true,
        content: '定制蛋糕请先联系店主沟通细节（微信号：xiaipet-bakery），已阅读后才可继续下单。'
    },
    deliveryRules: {
        tiers: LOCKED_DELIVERY_RULE_ROWS.map((row) => ({ ...row }))
    }
};
let cachedRuntimeConfig = cloneRuntimeConfig(DEFAULT_RUNTIME_CONFIG);
function getRuntimeConfigRequester() {
    return () => (0, api_client_1.customerApiRequest)('/api/v1/customer/runtime-config', {
        method: 'GET',
        auth: 'none'
    });
}
function cloneRuntimeConfig(config) {
    return {
        banner: { ...config.banner },
        store: { ...config.store },
        customNotice: { ...config.customNotice },
        deliveryRules: {
            tiers: config.deliveryRules.tiers.map((row) => ({ ...row }))
        }
    };
}
function getSection(sections, sectionId) {
    var _a;
    return (_a = sections === null || sections === void 0 ? void 0 : sections.find((section) => section.sectionId === sectionId)) !== null && _a !== void 0 ? _a : null;
}
function normalizeStoreProfile(store) {
    var _a, _b;
    const value = store;
    const storeName = (value === null || value === void 0 ? void 0 : value.storeName) || DEFAULT_RUNTIME_CONFIG.store.storeName;
    return {
        ...DEFAULT_RUNTIME_CONFIG.store,
        ...(value !== null && value !== void 0 ? value : {}),
        storeName,
        name: storeName,
        wechatId: (_a = value === null || value === void 0 ? void 0 : value.wechatId) !== null && _a !== void 0 ? _a : DEFAULT_RUNTIME_CONFIG.store.wechatId,
        ownerPhone: (_b = value === null || value === void 0 ? void 0 : value.ownerPhone) !== null && _b !== void 0 ? _b : DEFAULT_RUNTIME_CONFIG.store.ownerPhone
    };
}
function mergeRuntimeConfig(result) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const bannerSection = getSection(result.sections, 'banner');
    const storeSection = getSection(result.sections, 'store-profile');
    const noticeSection = getSection(result.sections, 'custom-notice');
    const deliverySection = getSection(result.sections, 'delivery-rules');
    const banner = (_b = (_a = result.banner) !== null && _a !== void 0 ? _a : bannerSection === null || bannerSection === void 0 ? void 0 : bannerSection.value) !== null && _b !== void 0 ? _b : DEFAULT_RUNTIME_CONFIG.banner;
    const customNotice = (_d = (_c = result.customNotice) !== null && _c !== void 0 ? _c : noticeSection === null || noticeSection === void 0 ? void 0 : noticeSection.value) !== null && _d !== void 0 ? _d : DEFAULT_RUNTIME_CONFIG.customNotice;
    return {
        banner: { ...banner },
        store: normalizeStoreProfile((_e = result.store) !== null && _e !== void 0 ? _e : storeSection === null || storeSection === void 0 ? void 0 : storeSection.value),
        customNotice: { ...customNotice },
        deliveryRules: {
            tiers: ((_h = (_g = ((_f = result.deliveryRules) !== null && _f !== void 0 ? _f : deliverySection === null || deliverySection === void 0 ? void 0 : deliverySection.value)) === null || _g === void 0 ? void 0 : _g.tiers) !== null && _h !== void 0 ? _h : DEFAULT_RUNTIME_CONFIG.deliveryRules.tiers).map((row) => ({ ...row }))
        }
    };
}
function getCachedCustomerRuntimeConfig() {
    return cloneRuntimeConfig(cachedRuntimeConfig);
}
function resolveRuntimeBannerImageSrc(banner) {
    var _a, _b, _c, _d, _e;
    return (_e = (_c = (_b = (_a = banner.asset) === null || _a === void 0 ? void 0 : _a.variants.find((variant) => variant.name === 'banner')) === null || _b === void 0 ? void 0 : _b.url) !== null && _c !== void 0 ? _c : (_d = banner.asset) === null || _d === void 0 ? void 0 : _d.url) !== null && _e !== void 0 ? _e : banner.fileId;
}
function resetCustomerRuntimeConfigCache() {
    cachedRuntimeConfig = cloneRuntimeConfig(DEFAULT_RUNTIME_CONFIG);
}
async function hydrateCustomerRuntimeConfig(requestRuntimeConfig = getRuntimeConfigRequester()) {
    const result = await requestRuntimeConfig();
    cachedRuntimeConfig = mergeRuntimeConfig(result !== null && result !== void 0 ? result : {});
    return getCachedCustomerRuntimeConfig();
}
