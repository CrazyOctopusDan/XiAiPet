"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const index_1 = require("../assertMerchantAccess/index");
const env_1 = require("../shared/env");
function createProductRepository() {
    try {
        const cloud = require('wx-server-sdk');
        cloud.init?.();
        const db = cloud.database?.();
        return {
            async listProducts() {
                if (!db) {
                    return [];
                }
                const result = await db.collection('products').get();
                return result.data ?? [];
            }
        };
    }
    catch (error) {
        return {
            async listProducts() {
                return [];
            }
        };
    }
}
async function main(event = {}, context, repository = createProductRepository()) {
    (0, env_1.resolveRuntimeEnv)(process.env.CLOUDBASE_ENV_NAME ?? 'dev');
    const access = await (0, index_1.main)(event, context);
    if (!access.allowed) {
        throw new Error('MERCHANT_FORBIDDEN');
    }
    const products = await repository.listProducts();
    const filtered = event.categoryId
        ? products.filter((product) => product.categoryId === event.categoryId)
        : products;
    return {
        ok: true,
        products: [...filtered].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    };
}
