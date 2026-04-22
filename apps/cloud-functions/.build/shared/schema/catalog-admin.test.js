"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const catalog_admin_1 = require("./catalog-admin");
(0, vitest_1.describe)('catalog admin schema', () => {
    (0, vitest_1.it)('requires category records to include both name and iconToken', () => {
        const category = {
            id: 'cakes',
            name: '生日蛋糕',
            iconToken: '🎂',
            createdAt: '2026-04-17T00:00:00.000Z',
            updatedAt: '2026-04-17T00:00:00.000Z'
        };
        (0, vitest_1.expect)((0, catalog_admin_1.isCatalogCategoryRecord)(category)).toBe(true);
        (0, vitest_1.expect)((0, catalog_admin_1.isCatalogCategoryRecord)({
            id: 'cakes',
            name: '生日蛋糕',
            createdAt: '2026-04-17T00:00:00.000Z',
            updatedAt: '2026-04-17T00:00:00.000Z'
        })).toBe(false);
        (0, vitest_1.expect)((0, catalog_admin_1.isCatalogCategoryRecord)({
            ...category,
            iconToken: '生日蛋糕图标'
        })).toBe(false);
    });
    (0, vitest_1.it)('accepts the three-step product editor payload with a single categoryId', () => {
        const payload = {
            basicInfo: {
                productId: 'birthday-cake',
                name: '生日蛋糕',
                description: '适合生日聚会',
                categoryId: 'cakes',
                imageFileId: 'cloud://xiaipet-prod.123/products/birthday-cake/cover.png',
                imagePreviewUrl: 'https://example.com/temp-preview.png',
                memberLevelId: 'vip',
                stock: 12
            },
            pricing: {
                basePrice: 198,
                specs: [
                    {
                        id: 'six-inch',
                        label: '6 寸',
                        surcharge: 0
                    }
                ],
                formulas: [
                    {
                        id: 'beef',
                        label: '牛肉',
                        surcharge: 10
                    }
                ],
                overrides: [],
                purchaseLimit: {
                    enabled: true,
                    maxQuantity: 2
                },
                detailContent: '适合生日庆祝，可写祝福语。'
            },
            publishSettings: {
                status: 'draft',
                fulfillmentModes: ['delivery', 'pickup'],
                trackInventory: true
            }
        };
        (0, vitest_1.expect)((0, catalog_admin_1.isCatalogProductEditorPayload)(payload)).toBe(true);
        (0, vitest_1.expect)((0, catalog_admin_1.isCatalogProductEditorPayload)({
            ...payload,
            basicInfo: {
                ...payload.basicInfo,
                categoryId: ['cakes']
            }
        })).toBe(false);
    });
    (0, vitest_1.it)('requires a CloudBase imageFileId and rejects temp urls or local paths as the persisted source of truth', () => {
        const product = {
            id: 'birthday-cake',
            name: '生日蛋糕',
            description: '适合生日聚会',
            categoryId: 'cakes',
            imageFileId: 'cloud://xiaipet-prod.123/products/birthday-cake/cover.png',
            imagePreviewUrl: 'https://example.com/temp-preview.png',
            memberLevelId: 'vip',
            status: 'draft',
            stock: 12,
            trackInventory: true,
            fulfillmentModes: ['delivery', 'pickup'],
            basePrice: 198,
            specs: [],
            formulas: [],
            priceOverrides: [],
            purchaseLimit: {
                enabled: true,
                maxQuantity: 2
            },
            detailContent: '适合生日庆祝，可写祝福语。',
            createdAt: '2026-04-17T00:00:00.000Z',
            updatedAt: '2026-04-17T00:00:00.000Z'
        };
        (0, vitest_1.expect)((0, catalog_admin_1.isCatalogProductAdminRecord)(product)).toBe(true);
        (0, vitest_1.expect)((0, catalog_admin_1.isCatalogProductAdminRecord)({
            ...product,
            imageFileId: 'https://example.com/temp-preview.png'
        })).toBe(false);
        (0, vitest_1.expect)((0, catalog_admin_1.isCatalogProductAdminRecord)({
            ...product,
            imageFileId: 'wxfile://tmp_12345'
        })).toBe(false);
    });
    (0, vitest_1.it)('requires explicit purchaseLimit and detailContent fields', () => {
        const product = {
            id: 'birthday-cake',
            name: '生日蛋糕',
            description: '适合生日聚会',
            categoryId: 'cakes',
            imageFileId: 'cloud://xiaipet-prod.123/products/birthday-cake/cover.png',
            memberLevelId: 'vip',
            status: 'published',
            stock: 12,
            trackInventory: true,
            fulfillmentModes: ['delivery'],
            basePrice: 198,
            specs: [],
            formulas: [],
            priceOverrides: [],
            purchaseLimit: {
                enabled: false,
                maxQuantity: null
            },
            detailContent: '适合生日庆祝，可写祝福语。',
            createdAt: '2026-04-17T00:00:00.000Z',
            updatedAt: '2026-04-17T00:00:00.000Z'
        };
        (0, vitest_1.expect)((0, catalog_admin_1.isCatalogProductAdminRecord)(product)).toBe(true);
        (0, vitest_1.expect)((0, catalog_admin_1.isCatalogProductAdminRecord)({
            ...product,
            purchaseLimit: undefined
        })).toBe(false);
        (0, vitest_1.expect)((0, catalog_admin_1.isCatalogProductAdminRecord)({
            ...product,
            detailContent: ''
        })).toBe(false);
    });
    (0, vitest_1.it)('exposes linked product counts in the category delete preflight shape', () => {
        const preflight = {
            categoryId: 'cakes',
            linkedProductCount: 3,
            canDelete: false
        };
        (0, vitest_1.expect)((0, catalog_admin_1.isCatalogCategoryDeletePreflight)(preflight)).toBe(true);
        (0, vitest_1.expect)((0, catalog_admin_1.isCatalogCategoryDeletePreflight)({
            categoryId: 'cakes',
            canDelete: false
        })).toBe(false);
    });
});
