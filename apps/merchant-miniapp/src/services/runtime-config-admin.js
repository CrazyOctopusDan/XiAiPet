"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOCKED_DELIVERY_RULE_ROWS = void 0;
exports.queryRuntimeConfigSections = queryRuntimeConfigSections;
exports.saveRuntimeConfigSection = saveRuntimeConfigSection;
exports.getRuntimeConfigAdminViewModel = getRuntimeConfigAdminViewModel;
exports.buildRuntimeConfigSectionDocument = buildRuntimeConfigSectionDocument;
const runtime_config_1 = require("../../../../packages/shared/src/schema/runtime-config");
Object.defineProperty(exports, "LOCKED_DELIVERY_RULE_ROWS", { enumerable: true, get: function () { return runtime_config_1.LOCKED_DELIVERY_RULE_ROWS; } });
function getCloudCaller() {
    return (payload) => wx.cloud.callFunction(payload);
}
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
        name: '虾衣宠物烘焙工作室'
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
                address: '',
                latitude: 0,
                longitude: 0,
                contactPhone: ''
            }
        },
        {
            sectionId: 'delivery-rules',
            updatedAt: now,
            updatedBy,
            value: {
                tiers: runtime_config_1.LOCKED_DELIVERY_RULE_ROWS.map((row) => ({ ...row }))
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
                fileId: 'cloud://xiaipet-dev.123/banners/default.png',
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
function mergeSections(sections) {
    const defaults = getDefaultSections();
    const sectionMap = new Map(sections.map((section) => [section.sectionId, section]));
    return defaults.map((fallback) => { var _a; return (_a = sectionMap.get(fallback.sectionId)) !== null && _a !== void 0 ? _a : fallback; });
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
    return '定制提示';
}
async function queryRuntimeConfigSections(callFunction = getCloudCaller()) {
    var _a;
    const response = (await callFunction({
        name: 'getRuntimeConfigSections',
        data: {}
    }));
    return mergeSections((_a = response.result.sections) !== null && _a !== void 0 ? _a : []);
}
async function saveRuntimeConfigSection(section, callFunction = getCloudCaller()) {
    const response = (await callFunction({
        name: 'upsertRuntimeConfigSection',
        data: {
            section
        }
    }));
    return response.result.section;
}
function getRuntimeConfigAdminViewModel(sections, dirty) {
    return {
        sections: mergeSections(sections).map((section) => ({
            sectionId: section.sectionId,
            title: getSectionTitle(section.sectionId),
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
