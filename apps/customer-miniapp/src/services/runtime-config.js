"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCachedCustomerRuntimeConfig = getCachedCustomerRuntimeConfig;
exports.resetCustomerRuntimeConfigCache = resetCustomerRuntimeConfigCache;
exports.hydrateCustomerRuntimeConfig = hydrateCustomerRuntimeConfig;
const runtime_config_1 = require("../../../../packages/shared/src/schema/runtime-config");
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
        tiers: runtime_config_1.LOCKED_DELIVERY_RULE_ROWS.map((row) => ({ ...row }))
    }
};
let cachedRuntimeConfig = cloneRuntimeConfig(DEFAULT_RUNTIME_CONFIG);
function getCloudCaller() {
    return (payload) => wx.cloud.callFunction(payload);
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
function resetCustomerRuntimeConfigCache() {
    cachedRuntimeConfig = cloneRuntimeConfig(DEFAULT_RUNTIME_CONFIG);
}
async function hydrateCustomerRuntimeConfig(callFunction = getCloudCaller()) {
    var _a;
    const response = (await callFunction({
        name: 'readRuntimeConfig',
        data: {}
    }));
    cachedRuntimeConfig = mergeRuntimeConfig((_a = response.result) !== null && _a !== void 0 ? _a : {});
    return getCachedCustomerRuntimeConfig();
}
