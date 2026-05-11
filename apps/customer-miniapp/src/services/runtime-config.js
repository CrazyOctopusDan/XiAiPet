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
        fileId: '/assets/catalog/home-hero.png',
        altText: '首页 Banner'
    },
    store: {
        name: '虾衣宠物烘焙工作室',
        address: '上海市静安区南京西路 1266 号 8 楼',
        latitude: 31.22911,
        longitude: 121.44853,
        contactPhone: ''
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
function mergeRuntimeConfig(result) {
    var _a, _b, _c;
    return {
        banner: result.banner
            ? {
                ...result.banner
            }
            : { ...DEFAULT_RUNTIME_CONFIG.banner },
        store: {
            ...DEFAULT_RUNTIME_CONFIG.store,
            ...((_a = result.store) !== null && _a !== void 0 ? _a : {})
        },
        customNotice: result.customNotice
            ? {
                ...result.customNotice
            }
            : { ...DEFAULT_RUNTIME_CONFIG.customNotice },
        deliveryRules: {
            tiers: ((_c = (_b = result.deliveryRules) === null || _b === void 0 ? void 0 : _b.tiers) !== null && _c !== void 0 ? _c : DEFAULT_RUNTIME_CONFIG.deliveryRules.tiers).map((row) => ({ ...row }))
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
