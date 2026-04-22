"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildBootstrapDecision = buildBootstrapDecision;
const user_record_1 = require("../schema/user-record");
function buildBootstrapDecision(input) {
    if (!input.existingUser) {
        return {
            operation: 'create',
            record: (0, user_record_1.createUserRecord)({
                openid: input.openid,
                now: input.now,
                status: 'active'
            }),
            lazyCollections: []
        };
    }
    return {
        operation: 'restore',
        record: {
            ...input.existingUser,
            updatedAt: input.now,
            lastLoginAt: input.now
        },
        lazyCollections: []
    };
}
