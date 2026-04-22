"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const catalog_admin_1 = require("../../../../packages/shared/src/schema/catalog-admin");
const product_pricing_1 = require("../../../../packages/shared/src/rules/product-pricing");
const index_1 = require("../assertMerchantAccess/index");
const env_1 = require("../shared/env");
function createProductMutationRepository() {
    try {
        const cloud = require('wx-server-sdk');
        cloud.init?.();
        const db = cloud.database?.();
        return {
            async saveProduct(product) {
                if (!db) {
                    return product;
                }
                await db.collection('products').doc(product.id).set({
                    data: product
                });
                return product;
            },
            async getProductById(productId) {
                if (!db) {
                    return null;
                }
                const result = await db.collection('products').doc(productId).get();
                return result.data ?? null;
            },
            async categoryExists(categoryId) {
                if (!db) {
                    return true;
                }
                const result = await db.collection('categories').where({ id: categoryId }).get();
                return result.data.length > 0;
            }
        };
    }
    catch (error) {
        return {
            async saveProduct(product) {
                return product;
            },
            async getProductById() {
                return null;
            },
            async categoryExists() {
                return true;
            }
        };
    }
}
function normalizePayload(payload, now, existing) {
    if ((0, catalog_admin_1.isCatalogProductAdminRecord)(payload)) {
        return {
            ...payload,
            createdAt: existing?.createdAt ?? payload.createdAt,
            updatedAt: now
        };
    }
    if (!(0, catalog_admin_1.isCatalogProductEditorPayload)(payload)) {
        throw new Error('INVALID_PRODUCT_PAYLOAD');
    }
    return {
        id: payload.basicInfo.productId,
        name: payload.basicInfo.name,
        description: payload.basicInfo.description,
        categoryId: payload.basicInfo.categoryId,
        imageFileId: payload.basicInfo.imageFileId,
        imagePreviewUrl: payload.basicInfo.imagePreviewUrl,
        memberLevelId: payload.basicInfo.memberLevelId,
        status: payload.publishSettings.status,
        stock: payload.basicInfo.stock,
        trackInventory: payload.publishSettings.trackInventory,
        fulfillmentModes: payload.publishSettings.fulfillmentModes,
        basePrice: payload.pricing.basePrice,
        specs: payload.pricing.specs,
        formulas: payload.pricing.formulas,
        priceOverrides: payload.pricing.overrides,
        purchaseLimit: payload.pricing.purchaseLimit,
        detailContent: payload.pricing.detailContent,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now
    };
}
function validateResolvedProduct(product) {
    const saveContract = (0, product_pricing_1.validateProductSavePricingContract)(product);
    if (!saveContract.valid) {
        throw new Error(`INVALID_PRODUCT_SAVE_CONTRACT:${saveContract.issues.join(',')}`);
    }
    product.priceOverrides.forEach((override) => {
        (0, product_pricing_1.resolveProductCombinationPrice)(product, {
            specId: override.specId,
            formulaId: override.formulaId
        });
    });
}
async function main(event = {}, context, repository = createProductMutationRepository()) {
    (0, env_1.resolveRuntimeEnv)(process.env.CLOUDBASE_ENV_NAME ?? 'dev');
    const access = await (0, index_1.main)(event, context);
    if (!access.allowed) {
        throw new Error('MERCHANT_FORBIDDEN');
    }
    if (!event.payload) {
        throw new Error('INVALID_PRODUCT_PAYLOAD');
    }
    const payload = event.payload;
    const productId = (0, catalog_admin_1.isCatalogProductAdminRecord)(payload) ? payload.id : (0, catalog_admin_1.isCatalogProductEditorPayload)(payload) ? payload.basicInfo.productId : null;
    const existing = productId ? await repository.getProductById(productId) : null;
    const product = normalizePayload(payload, event.now ?? new Date().toISOString(), existing);
    if (!(await repository.categoryExists(product.categoryId))) {
        throw new Error('CATEGORY_NOT_FOUND');
    }
    validateResolvedProduct(product);
    return {
        ok: true,
        product: await repository.saveProduct(product)
    };
}
