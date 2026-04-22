"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const catalog_admin_1 = require("../../../../packages/shared/src/schema/catalog-admin");
const index_1 = require("../assertMerchantAccess/index");
const env_1 = require("../shared/env");
function createCategoryMutationRepository() {
    try {
        const cloud = require('wx-server-sdk');
        cloud.init?.();
        const db = cloud.database?.();
        return {
            async saveCategory(category) {
                if (!db) {
                    return category;
                }
                await db.collection('categories').doc(category.id).set({
                    data: category
                });
                return category;
            },
            async deleteCategory(categoryId) {
                if (!db) {
                    return;
                }
                await db.collection('categories').doc(categoryId).remove();
            },
            async countProductsByCategory(categoryId) {
                if (!db) {
                    return 0;
                }
                const result = await db.collection('products').where({ categoryId }).get();
                return result.data.length;
            }
        };
    }
    catch (error) {
        return {
            async saveCategory(category) {
                return category;
            },
            async deleteCategory() {
                return;
            },
            async countProductsByCategory() {
                return 0;
            }
        };
    }
}
async function main(event = {}, context, repository = createCategoryMutationRepository()) {
    (0, env_1.resolveRuntimeEnv)(process.env.CLOUDBASE_ENV_NAME ?? 'dev');
    const access = await (0, index_1.main)(event, context);
    if (!access.allowed) {
        throw new Error('MERCHANT_FORBIDDEN');
    }
    if (event.action === 'delete') {
        if (!event.categoryId) {
            throw new Error('INVALID_CATEGORY_ID');
        }
        const linkedProductCount = await repository.countProductsByCategory(event.categoryId);
        if (linkedProductCount > 0) {
            throw new Error(`CATEGORY_HAS_LINKED_PRODUCTS:${linkedProductCount}`);
        }
        await repository.deleteCategory(event.categoryId);
        return {
            ok: true,
            deletedCategoryId: event.categoryId
        };
    }
    if (!(0, catalog_admin_1.isCatalogCategoryRecord)(event.category)) {
        throw new Error('INVALID_CATEGORY_PAYLOAD');
    }
    return {
        ok: true,
        category: await repository.saveCategory(event.category)
    };
}
