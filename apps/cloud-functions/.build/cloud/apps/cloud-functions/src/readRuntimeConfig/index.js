"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const runtime_config_1 = require("../../../../packages/shared/src/schema/runtime-config");
const env_1 = require("../shared/env");
function createReadRuntimeConfigRepository() {
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
async function main(event = {}, _context, repository = createReadRuntimeConfigRepository()) {
    (0, env_1.resolveRuntimeEnv)(process.env.CLOUDBASE_ENV_NAME ?? 'dev');
    const sections = await repository.listSections();
    const byId = Object.fromEntries(sections.map((section) => [section.sectionId, section]));
    return {
        ok: true,
        banner: byId['banner']?.value ?? null,
        store: byId['store-profile']?.value ?? null,
        customNotice: byId['custom-notice']?.value ?? null,
        deliveryRules: byId['delivery-rules']?.value ?? null
    };
}
