"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const runtime_config_1 = require("../../../../packages/shared/src/schema/runtime-config");
const index_1 = require("../assertMerchantAccess/index");
const env_1 = require("../shared/env");
function createRuntimeConfigMutationRepository() {
    try {
        const cloud = require('wx-server-sdk');
        cloud.init?.();
        const db = cloud.database?.();
        return {
            async saveSection(section) {
                if (!db) {
                    return section;
                }
                await db.collection('runtime_configs').doc(section.sectionId).set({
                    data: section
                });
                return section;
            }
        };
    }
    catch (error) {
        return {
            async saveSection(section) {
                return section;
            }
        };
    }
}
async function main(event = {}, context, repository = createRuntimeConfigMutationRepository()) {
    (0, env_1.resolveRuntimeEnv)(process.env.CLOUDBASE_ENV_NAME ?? 'dev');
    const access = await (0, index_1.main)(event, context);
    if (!access.allowed) {
        throw new Error('MERCHANT_FORBIDDEN');
    }
    if (!(0, runtime_config_1.isRuntimeConfigSectionDocument)(event.section)) {
        throw new Error('INVALID_RUNTIME_CONFIG_SECTION');
    }
    return {
        ok: true,
        section: await repository.saveSection(event.section)
    };
}
