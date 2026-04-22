"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const runtime_config_1 = require("../../../../packages/shared/src/schema/runtime-config");
const index_1 = require("../assertMerchantAccess/index");
const env_1 = require("../shared/env");
function createRuntimeConfigRepository() {
    try {
        const cloud = require('wx-server-sdk');
        cloud.init?.();
        const db = cloud.database?.();
        return {
            async listSections() {
                if (!db) {
                    return [];
                }
                const result = await db.collection('runtime_configs').get();
                return (result.data ?? []).filter((section) => (0, runtime_config_1.isRuntimeConfigSectionDocument)(section));
            }
        };
    }
    catch (error) {
        return {
            async listSections() {
                return [];
            }
        };
    }
}
async function main(event = {}, context, repository = createRuntimeConfigRepository()) {
    (0, env_1.resolveRuntimeEnv)(process.env.CLOUDBASE_ENV_NAME ?? 'dev');
    const access = await (0, index_1.main)(event, context);
    if (!access.allowed) {
        throw new Error('MERCHANT_FORBIDDEN');
    }
    return {
        ok: true,
        sections: await repository.listSections()
    };
}
