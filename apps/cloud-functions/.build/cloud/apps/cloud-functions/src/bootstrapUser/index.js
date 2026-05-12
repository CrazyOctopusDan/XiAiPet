"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const shared_1 = require('../../../../packages/shared/src/index.js');
const auth_context_1 = require("../shared/auth-context");
const env_1 = require("../shared/env");
async function main(event = {}, context) {
    (0, env_1.resolveRuntimeEnv)();
    const auth = (0, auth_context_1.getAuthContext)(event, context);
    const existingUser = (0, shared_1.isUserRecord)(event.existingUser) ? event.existingUser : null;
    const now = event.now ?? new Date().toISOString();
    const decision = (0, shared_1.buildBootstrapDecision)({
        openid: auth.openid,
        now,
        existingUser
    });
    return {
        ok: true,
        operation: decision.operation,
        user: decision.record,
        skippedCollections: decision.lazyCollections
    };
}
