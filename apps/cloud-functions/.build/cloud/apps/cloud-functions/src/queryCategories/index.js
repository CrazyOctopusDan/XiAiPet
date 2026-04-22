"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const index_1 = require("../assertMerchantAccess/index");
const env_1 = require("../shared/env");
function createCategoryRepository() {
    try {
        const cloud = require('wx-server-sdk');
        cloud.init?.();
        const db = cloud.database?.();
        return {
            async listCategories() {
                if (!db) {
                    return [];
                }
                const result = await db.collection('categories').get();
                return result.data ?? [];
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
            async listCategories() {
                return [];
            },
            async countProductsByCategory() {
                return 0;
            }
        };
    }
}
function sortCategories(list) {
    return [...list].sort((left, right) => {
        const updatedAtDiff = right.updatedAt.localeCompare(left.updatedAt);
        if (updatedAtDiff !== 0) {
            return updatedAtDiff;
        }
        return left.name.localeCompare(right.name);
    });
}
async function main(event = {}, context, repository = createCategoryRepository()) {
    (0, env_1.resolveRuntimeEnv)(process.env.CLOUDBASE_ENV_NAME ?? 'dev');
    const access = await (0, index_1.main)(event, context);
    if (!access.allowed) {
        throw new Error('MERCHANT_FORBIDDEN');
    }
    const categories = await repository.listCategories();
    const items = await Promise.all(categories.map(async (category) => {
        const linkedProductCount = await repository.countProductsByCategory(category.id);
        return {
            ...category,
            linkedProductCount,
            canDelete: linkedProductCount === 0
        };
    }));
    return {
        ok: true,
        categories: sortCategories(items)
    };
}
