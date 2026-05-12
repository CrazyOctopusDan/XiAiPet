"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveRuntimeEnv = resolveRuntimeEnv;
const shared_1 = require('../../../../packages/shared/src/index.js');
function resolveRuntimeEnv(rawEnvName) {
    const envName = rawEnvName ?? process.env.CLOUDBASE_ENV_NAME;
    if (!envName || !shared_1.SUPPORTED_ENVIRONMENTS.includes(envName)) {
        throw new Error(`Unsupported environment: ${String(envName)}`);
    }
    const supportedEnvName = envName;
    return {
        envName: supportedEnvName,
        envId: process.env.CLOUDBASE_ENV_ID ?? '',
        appId: process.env.WECHAT_APP_ID ?? '',
        releaseChannel: shared_1.RELEASE_CHANNELS[supportedEnvName]
    };
}
