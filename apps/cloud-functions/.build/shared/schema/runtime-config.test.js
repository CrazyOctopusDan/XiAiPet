"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const runtime_config_1 = require("./runtime-config");
function createUpdatedBy() {
    return {
        openid: 'merchant-openid',
        name: '店主小虾'
    };
}
(0, vitest_1.describe)('runtime config schema', () => {
    (0, vitest_1.it)('uses fixed section ids for independently saved runtime-config documents', () => {
        const sections = [
            {
                sectionId: 'store-profile',
                updatedAt: '2026-04-17T12:00:00.000Z',
                updatedBy: createUpdatedBy(),
                value: {
                    address: '上海市静安区南京西路 1266 号 8 楼',
                    latitude: 31.2304,
                    longitude: 121.4737,
                    contactPhone: '13800001234'
                }
            },
            {
                sectionId: 'delivery-rules',
                updatedAt: '2026-04-17T12:00:00.000Z',
                updatedBy: createUpdatedBy(),
                value: {
                    tiers: runtime_config_1.LOCKED_DELIVERY_RULE_ROWS
                }
            },
            {
                sectionId: 'membership-tiers',
                updatedAt: '2026-04-17T12:00:00.000Z',
                updatedBy: createUpdatedBy(),
                value: {
                    tiers: [
                        {
                            tierId: 'gold',
                            threshold: 998,
                            name: '金卡会员',
                            description: '累计消费满 998 元可升级。'
                        }
                    ]
                }
            },
            {
                sectionId: 'banner',
                updatedAt: '2026-04-17T12:00:00.000Z',
                updatedBy: createUpdatedBy(),
                value: {
                    fileId: 'cloud://xiaipet-prod.123/banner/home-hero.png',
                    altText: '首页主 Banner'
                }
            },
            {
                sectionId: 'custom-notice',
                updatedAt: '2026-04-17T12:00:00.000Z',
                updatedBy: createUpdatedBy(),
                value: {
                    enabled: true,
                    content: '蛋糕均为新鲜现做，请至少提前一天预约。'
                }
            }
        ];
        (0, vitest_1.expect)(sections.every((section) => (0, runtime_config_1.isRuntimeConfigSectionDocument)(section))).toBe(true);
        (0, vitest_1.expect)((0, runtime_config_1.isRuntimeConfigSectionDocument)({
            sectionId: 'store',
            updatedAt: '2026-04-17T12:00:00.000Z',
            updatedBy: createUpdatedBy(),
            value: {}
        })).toBe(false);
    });
    (0, vitest_1.it)('preserves the locked delivery-tier explainer rows instead of accepting arbitrary freeform payloads', () => {
        const deliveryRulesSection = {
            sectionId: 'delivery-rules',
            updatedAt: '2026-04-17T12:00:00.000Z',
            updatedBy: createUpdatedBy(),
            value: {
                tiers: runtime_config_1.LOCKED_DELIVERY_RULE_ROWS
            }
        };
        (0, vitest_1.expect)((0, runtime_config_1.isRuntimeConfigSectionDocument)(deliveryRulesSection)).toBe(true);
        (0, vitest_1.expect)((0, runtime_config_1.isRuntimeConfigSectionDocument)({
            ...deliveryRulesSection,
            value: {
                tiers: [
                    ...runtime_config_1.LOCKED_DELIVERY_RULE_ROWS.slice(0, 1),
                    {
                        distanceKm: 10,
                        minimumOrderAmount: 66,
                        deliveryFee: 9,
                        explainer: '自定义算法'
                    }
                ]
            }
        })).toBe(false);
    });
    (0, vitest_1.it)('requires membership tiers to keep threshold, name, and description together', () => {
        (0, vitest_1.expect)((0, runtime_config_1.isMembershipTiersRuntimeConfigSection)({
            sectionId: 'membership-tiers',
            updatedAt: '2026-04-17T12:00:00.000Z',
            updatedBy: createUpdatedBy(),
            value: {
                tiers: [
                    {
                        tierId: 'gold',
                        threshold: 998,
                        name: '金卡会员',
                        description: '累计消费满 998 元可升级。'
                    }
                ]
            }
        })).toBe(true);
        (0, vitest_1.expect)((0, runtime_config_1.isMembershipTiersRuntimeConfigSection)({
            sectionId: 'membership-tiers',
            updatedAt: '2026-04-17T12:00:00.000Z',
            updatedBy: createUpdatedBy(),
            value: {
                tiers: [
                    {
                        tierId: 'gold',
                        threshold: 998,
                        name: '金卡会员'
                    }
                ]
            }
        })).toBe(false);
    });
    (0, vitest_1.it)('keeps banner fileId metadata and retains custom notice text even when disabled', () => {
        (0, vitest_1.expect)((0, runtime_config_1.isBannerRuntimeConfigSection)({
            sectionId: 'banner',
            updatedAt: '2026-04-17T12:00:00.000Z',
            updatedBy: createUpdatedBy(),
            value: {
                fileId: 'cloud://xiaipet-prod.123/banner/home-hero.png',
                altText: '首页主 Banner'
            }
        })).toBe(true);
        (0, vitest_1.expect)((0, runtime_config_1.isBannerRuntimeConfigSection)({
            sectionId: 'banner',
            updatedAt: '2026-04-17T12:00:00.000Z',
            updatedBy: createUpdatedBy(),
            value: {
                fileId: 'https://example.com/banner.png',
                altText: '首页主 Banner'
            }
        })).toBe(false);
        (0, vitest_1.expect)((0, runtime_config_1.isCustomNoticeRuntimeConfigSection)({
            sectionId: 'custom-notice',
            updatedAt: '2026-04-17T12:00:00.000Z',
            updatedBy: createUpdatedBy(),
            value: {
                enabled: false,
                content: '本周配送高峰，请尽量提前下单。'
            }
        })).toBe(true);
    });
});
