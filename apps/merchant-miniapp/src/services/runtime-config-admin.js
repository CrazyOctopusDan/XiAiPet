"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOCKED_DELIVERY_RULE_ROWS = void 0;
exports.buildDeliveryRuleExplainer = buildDeliveryRuleExplainer;
exports.queryRuntimeConfigSections = queryRuntimeConfigSections;
exports.saveRuntimeConfigSection = saveRuntimeConfigSection;
exports.uploadRuntimeBannerAsset = uploadRuntimeBannerAsset;
exports.getRuntimeConfigAdminViewModel = getRuntimeConfigAdminViewModel;
exports.buildRuntimeConfigSectionDocument = buildRuntimeConfigSectionDocument;
const api_client_1 = require("./api-client");
const assets_1 = require("./assets");
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
exports.LOCKED_DELIVERY_RULE_ROWS = LOCKED_DELIVERY_RULE_ROWS;
function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
}
function createUpdatedBy() {
    return {
        openid: 'merchant-openid',
        name: '喜爱宠物烘焙工作室'
    };
}
function getNow() {
    return new Date().toISOString();
}
function getDefaultSections() {
    const now = getNow();
    const updatedBy = createUpdatedBy();
    return [
        {
            sectionId: 'store-profile',
            updatedAt: now,
            updatedBy,
            value: {
                storeName: '虾衣宠物烘焙工作室',
                address: '',
                latitude: 0,
                longitude: 0,
                wechatId: '',
                ownerPhone: ''
            }
        },
        {
            sectionId: 'delivery-rules',
            updatedAt: now,
            updatedBy,
            value: {
                tiers: LOCKED_DELIVERY_RULE_ROWS.map((row) => ({ ...row }))
            }
        },
        {
            sectionId: 'membership-tiers',
            updatedAt: now,
            updatedBy,
            value: {
                tiers: [
                    {
                        tierId: 'tier-basic',
                        threshold: 0,
                        name: '普通会员',
                        description: '默认会员等级'
                    }
                ]
            }
        },
        {
            sectionId: 'banner',
            updatedAt: now,
            updatedBy,
            value: {
                fileId: '/assets/catalog/banner.jpg',
                altText: '首页 Banner'
            }
        },
        {
            sectionId: 'custom-notice',
            updatedAt: now,
            updatedBy,
            value: {
                enabled: true,
                content: '请提前联系确认。'
            }
        }
    ];
}
function isRecord(value) {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
function asString(value, fallback = '') {
    return typeof value === 'string' ? value : fallback;
}
function asNumber(value, fallback = 0) {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
function normalizeUpdatedBy(value, fallback) {
    if (isRecord(value)) {
        return {
            openid: asString(value.openid, fallback.openid),
            name: asString(value.name, fallback.name)
        };
    }
    if (typeof value === 'string' && value) {
        return {
            openid: value,
            name: value
        };
    }
    return fallback;
}
function normalizeMembershipTier(value, index) {
    if (!isRecord(value)) {
        return null;
    }
    return {
        tierId: asString(value.tierId, asString(value.id, `tier-${index + 1}`)),
        threshold: asNumber(value.threshold, asNumber(value.minimumBalance)),
        name: asString(value.name, '会员等级'),
        description: asString(value.description)
    };
}
function buildDeliveryRuleExplainer(row) {
    const distanceLabel = `${row.distanceKm.toFixed(1)} 公里内`;
    const minimumLabel = row.minimumOrderAmount === null ? '' : ` ${row.minimumOrderAmount} 元起送，`;
    return `${distanceLabel}${minimumLabel}配送费 ${row.deliveryFee} 元`;
}
function normalizeDeliveryRuleTier(value, index) {
    if (!isRecord(value)) {
        return null;
    }
    const row = {
        distanceKm: asNumber(value.distanceKm, index + 1),
        minimumOrderAmount: value.minimumOrderAmount === null ? null : asNumber(value.minimumOrderAmount, 0),
        deliveryFee: asNumber(value.deliveryFee),
        explainer: asString(value.explainer)
    };
    return {
        ...row,
        explainer: row.explainer || buildDeliveryRuleExplainer(row)
    };
}
function normalizeSection(section, fallback) {
    const rawValue = isRecord(section.value) ? section.value : {};
    const base = {
        updatedAt: asString(section.updatedAt, fallback.updatedAt),
        updatedBy: normalizeUpdatedBy(section.updatedBy, fallback.updatedBy)
    };
    if (fallback.sectionId === 'store-profile') {
        return {
            sectionId: fallback.sectionId,
            ...base,
            value: {
                storeName: asString(rawValue.storeName, asString(rawValue.name, fallback.value.storeName)),
                address: asString(rawValue.address, asString(rawValue.storeAddress, fallback.value.address)),
                latitude: asNumber(rawValue.latitude, fallback.value.latitude),
                longitude: asNumber(rawValue.longitude, fallback.value.longitude),
                wechatId: asString(rawValue.wechatId, fallback.value.wechatId),
                ownerPhone: asString(rawValue.ownerPhone, asString(rawValue.contactPhone, asString(rawValue.servicePhone, fallback.value.ownerPhone)))
            }
        };
    }
    if (fallback.sectionId === 'delivery-rules') {
        const tiers = Array.isArray(rawValue.tiers)
            ? rawValue.tiers.map((tier, index) => normalizeDeliveryRuleTier(tier, index)).filter((tier) => Boolean(tier))
            : fallback.value.tiers;
        return {
            sectionId: fallback.sectionId,
            ...base,
            value: {
                tiers: tiers.length ? tiers : fallback.value.tiers
            }
        };
    }
    if (fallback.sectionId === 'membership-tiers') {
        const tiers = Array.isArray(rawValue.tiers)
            ? rawValue.tiers.map((tier, index) => normalizeMembershipTier(tier, index)).filter((tier) => Boolean(tier))
            : fallback.value.tiers;
        return {
            sectionId: fallback.sectionId,
            ...base,
            value: {
                tiers: tiers.length ? tiers : fallback.value.tiers
            }
        };
    }
    if (fallback.sectionId === 'banner') {
        return {
            sectionId: fallback.sectionId,
            ...base,
            value: {
                fileId: asString(rawValue.fileId, asString(rawValue.imageFileId, fallback.value.fileId)),
                altText: asString(rawValue.altText, asString(rawValue.title, fallback.value.altText)),
                asset: isRecord(rawValue.asset) ? rawValue.asset : fallback.value.asset
            }
        };
    }
    return {
        sectionId: fallback.sectionId,
        ...base,
        value: {
            enabled: typeof rawValue.enabled === 'boolean' ? rawValue.enabled : fallback.value.enabled,
            content: asString(rawValue.content, fallback.value.content)
        }
    };
}
function mergeSections(sections) {
    const defaults = getDefaultSections();
    const sectionMap = new Map(sections.map((section) => [section.sectionId, section]));
    return defaults.map((fallback) => {
        const section = sectionMap.get(fallback.sectionId);
        return section ? normalizeSection(section, fallback) : fallback;
    });
}
function getSectionTitle(sectionId) {
    if (sectionId === 'store-profile') {
        return '店铺信息';
    }
    if (sectionId === 'delivery-rules') {
        return '配送费规则';
    }
    if (sectionId === 'membership-tiers') {
        return '会员等级';
    }
    if (sectionId === 'banner') {
        return '首页 Banner';
    }
    return '购前须知';
}
function getSectionIconToken(sectionId) {
    if (sectionId === 'store-profile') {
        return '店';
    }
    if (sectionId === 'delivery-rules') {
        return '费';
    }
    if (sectionId === 'membership-tiers') {
        return '级';
    }
    if (sectionId === 'banner') {
        return '图';
    }
    return '须';
}
function getSectionSummaryLabel(section) {
    if (section.sectionId === 'store-profile') {
        return section.value.address && section.value.ownerPhone ? '门店位置与联系方式已配置' : '补全门店位置与联系方式';
    }
    if (section.sectionId === 'delivery-rules') {
        return `${section.value.tiers.length} 个配送档`;
    }
    if (section.sectionId === 'membership-tiers') {
        return `${section.value.tiers.length} 个等级`;
    }
    if (section.sectionId === 'banner') {
        return section.value.fileId ? '首页展示图已配置' : '上传首页展示图';
    }
    return section.value.enabled ? '购前须知已开启' : '购前须知已关闭';
}
async function queryRuntimeConfigSections(request = api_client_1.merchantApiRequest) {
    var _a;
    const response = await request('/api/v1/merchant/runtime-config/sections', {
        method: 'GET',
        auth: 'merchant'
    });
    return mergeSections((_a = response.sections) !== null && _a !== void 0 ? _a : []);
}
async function saveRuntimeConfigSection(section, request = api_client_1.merchantApiRequest) {
    const response = await request(`/api/v1/merchant/runtime-config/sections/${section.sectionId}`, {
        method: 'PUT',
        body: section,
        auth: 'merchant'
    });
    return response.section;
}
async function uploadRuntimeBannerAsset(filePath, request) {
    const file = typeof filePath === 'string' ? { filePath } : { filePath: filePath.filePath, fileSizeBytes: filePath.sizeBytes };
    return (0, assets_1.uploadMerchantAsset)('runtime-banner', {
        ...file,
        processingMode: 'miniapp',
        request
    });
}
function getRuntimeConfigAdminViewModel(sections, dirty) {
    const mergedSections = mergeSections(sections);
    const deliverySection = mergedSections.find((section) => section.sectionId === 'delivery-rules');
    return {
        summary: {
            totalSections: mergedSections.length,
            dirtySections: mergedSections.filter((section) => dirty[section.sectionId]).length,
            deliveryRuleCount: (deliverySection === null || deliverySection === void 0 ? void 0 : deliverySection.sectionId) === 'delivery-rules' ? deliverySection.value.tiers.length : 0
        },
        sections: mergedSections.map((section) => ({
            sectionId: section.sectionId,
            title: getSectionTitle(section.sectionId),
            iconToken: getSectionIconToken(section.sectionId),
            summaryLabel: getSectionSummaryLabel(section),
            dirtyLabel: dirty[section.sectionId] ? '未保存' : null,
            updatedLabel: `已保存 ${formatDateTime(section.updatedAt)}`,
            storeFields: section.sectionId === 'store-profile' ? section.value : undefined,
            deliveryRows: section.sectionId === 'delivery-rules' ? section.value.tiers : undefined,
            membershipRows: section.sectionId === 'membership-tiers'
                ? section.value.tiers.map((tier) => ({
                    ...tier,
                    thresholdLabel: `累计消费门槛 ${tier.threshold}`
                }))
                : undefined,
            bannerFields: section.sectionId === 'banner' ? section.value : undefined,
            customNoticeFields: section.sectionId === 'custom-notice' ? section.value : undefined
        }))
    };
}
function buildRuntimeConfigSectionDocument(sectionId, value, existing) {
    var _a;
    return {
        sectionId,
        updatedAt: getNow(),
        updatedBy: (_a = existing === null || existing === void 0 ? void 0 : existing.updatedBy) !== null && _a !== void 0 ? _a : createUpdatedBy(),
        value
    };
}
