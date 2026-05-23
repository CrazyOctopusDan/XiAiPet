"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCachedCustomerRuntimeConfig = getCachedCustomerRuntimeConfig;
exports.resolveRuntimeBannerImageSrc = resolveRuntimeBannerImageSrc;
exports.resetCustomerRuntimeConfigCache = resetCustomerRuntimeConfigCache;
exports.buildMembershipTierCards = buildMembershipTierCards;
exports.findMembershipTierCard = findMembershipTierCard;
exports.findMembershipTierCardBySpent = findMembershipTierCardBySpent;
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
    },
    membershipTiers: {
        tiers: [
            {
                tierId: 'regular',
                threshold: 0,
                name: '普通会员',
                description: '完成注册即可享受基础购买权益。'
            }
        ]
    }
};
const BASE_MEMBERSHIP_THEME = {
    start: '#F9F0DB',
    middle: '#E5C987',
    end: '#9B6E2E',
    accent: '#8A682C'
};
const TOP_MEMBERSHIP_THEME = {
    start: '#1C1917',
    middle: '#34302A',
    end: '#6B4E1E',
    accent: '#CA8A04'
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
        },
        membershipTiers: {
            tiers: config.membershipTiers.tiers.map((row) => ({ ...row }))
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
function clamp(value) {
    return Math.min(1, Math.max(0, value));
}
function hexToRgb(hex) {
    const normalized = hex.replace('#', '');
    return {
        red: parseInt(normalized.slice(0, 2), 16),
        green: parseInt(normalized.slice(2, 4), 16),
        blue: parseInt(normalized.slice(4, 6), 16)
    };
}
function toHex(value) {
    return Math.round(value).toString(16).padStart(2, '0');
}
function mixColor(from, to, ratio) {
    const safeRatio = clamp(ratio);
    const start = hexToRgb(from);
    const end = hexToRgb(to);
    return `#${toHex(start.red + (end.red - start.red) * safeRatio)}${toHex(start.green + (end.green - start.green) * safeRatio)}${toHex(start.blue + (end.blue - start.blue) * safeRatio)}`.toUpperCase();
}
function formatMembershipThreshold(value) {
    return value <= 0 ? '默认会员等级' : `累计消费满 ${value} 元`;
}
function buildMembershipCardStyle(progress) {
    const safeProgress = clamp(progress);
    const start = mixColor(BASE_MEMBERSHIP_THEME.start, TOP_MEMBERSHIP_THEME.start, safeProgress);
    const middle = mixColor(BASE_MEMBERSHIP_THEME.middle, TOP_MEMBERSHIP_THEME.middle, safeProgress);
    const end = mixColor(BASE_MEMBERSHIP_THEME.end, TOP_MEMBERSHIP_THEME.end, safeProgress);
    const accent = mixColor(BASE_MEMBERSHIP_THEME.accent, TOP_MEMBERSHIP_THEME.accent, safeProgress);
    const isDark = safeProgress >= 0.45;
    const text = isDark ? '#FFFFFF' : '#2B2115';
    const muted = isDark ? 'rgba(255, 255, 255, 0.72)' : '#675232';
    const border = isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(139, 104, 44, 0.2)';
    const pillBg = isDark ? 'rgba(255, 255, 255, 0.13)' : 'rgba(255, 255, 255, 0.45)';
    const glow = isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.42)';
    const shadow = isDark
        ? '0 30rpx 70rpx rgba(28, 25, 23, 0.22)'
        : '0 26rpx 60rpx rgba(138, 104, 44, 0.16)';
    return [
        `--member-card-progress: ${Number(safeProgress.toFixed(3))}`,
        `--member-card-bg: linear-gradient(135deg, ${start} 0%, ${middle} 55%, ${end} 100%)`,
        `--member-card-text: ${text}`,
        `--member-card-muted: ${muted}`,
        `--member-card-border: ${border}`,
        `--member-card-pill-bg: ${pillBg}`,
        `--member-card-glow: ${glow}`,
        `--member-card-shadow: ${shadow}`,
        `--member-card-accent: ${accent}`
    ].join('; ');
}
function mergeRuntimeConfig(result) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    const bannerSection = getSection(result.sections, 'banner');
    const storeSection = getSection(result.sections, 'store-profile');
    const noticeSection = getSection(result.sections, 'custom-notice');
    const deliverySection = getSection(result.sections, 'delivery-rules');
    const membershipSection = getSection(result.sections, 'membership-tiers');
    const banner = (_b = (_a = result.banner) !== null && _a !== void 0 ? _a : bannerSection === null || bannerSection === void 0 ? void 0 : bannerSection.value) !== null && _b !== void 0 ? _b : DEFAULT_RUNTIME_CONFIG.banner;
    const customNotice = (_d = (_c = result.customNotice) !== null && _c !== void 0 ? _c : noticeSection === null || noticeSection === void 0 ? void 0 : noticeSection.value) !== null && _d !== void 0 ? _d : DEFAULT_RUNTIME_CONFIG.customNotice;
    return {
        banner: { ...banner },
        store: normalizeStoreProfile((_e = result.store) !== null && _e !== void 0 ? _e : storeSection === null || storeSection === void 0 ? void 0 : storeSection.value),
        customNotice: { ...customNotice },
        deliveryRules: {
            tiers: ((_h = (_g = ((_f = result.deliveryRules) !== null && _f !== void 0 ? _f : deliverySection === null || deliverySection === void 0 ? void 0 : deliverySection.value)) === null || _g === void 0 ? void 0 : _g.tiers) !== null && _h !== void 0 ? _h : DEFAULT_RUNTIME_CONFIG.deliveryRules.tiers).map((row) => ({ ...row }))
        },
        membershipTiers: {
            tiers: ((_l = (_k = ((_j = result.membershipTiers) !== null && _j !== void 0 ? _j : membershipSection === null || membershipSection === void 0 ? void 0 : membershipSection.value)) === null || _k === void 0 ? void 0 : _k.tiers) !== null && _l !== void 0 ? _l : DEFAULT_RUNTIME_CONFIG.membershipTiers.tiers).map((row) => ({ ...row }))
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
function buildMembershipTierCards(tiers) {
    const sorted = [...tiers].sort((left, right) => left.threshold - right.threshold);
    const denominator = Math.max(sorted.length - 1, 1);
    return sorted.map((tier, index) => {
        const progress = sorted.length === 1 ? 0 : index / denominator;
        return {
            tierId: tier.tierId,
            name: tier.name,
            threshold: tier.threshold,
            thresholdLabel: formatMembershipThreshold(tier.threshold),
            description: tier.description,
            badgeLabel: `Level ${String(index + 1).padStart(2, '0')}`,
            cardStyle: buildMembershipCardStyle(progress)
        };
    });
}
function findMembershipTierCard(cards, memberLevel) {
    var _a, _b;
    return (_b = (_a = cards.find((card) => card.name === memberLevel)) !== null && _a !== void 0 ? _a : cards[0]) !== null && _b !== void 0 ? _b : null;
}
function findMembershipTierCardBySpent(cards, totalSpent) {
    var _a, _b;
    return (_b = (_a = cards
        .filter((card) => card.threshold <= totalSpent)
        .sort((left, right) => right.threshold - left.threshold)[0]) !== null && _a !== void 0 ? _a : cards[0]) !== null && _b !== void 0 ? _b : null;
}
async function hydrateCustomerRuntimeConfig(requestRuntimeConfig = getRuntimeConfigRequester()) {
    const result = await requestRuntimeConfig();
    cachedRuntimeConfig = mergeRuntimeConfig(result !== null && result !== void 0 ? result : {});
    return getCachedCustomerRuntimeConfig();
}
