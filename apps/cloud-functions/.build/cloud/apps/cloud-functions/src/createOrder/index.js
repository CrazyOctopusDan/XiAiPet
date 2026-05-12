"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const shared_1 = require('../../../../packages/shared/src/index.js');
const auth_context_1 = require("../shared/auth-context");
const env_1 = require("../shared/env");
const order_store_1 = require("../shared/order-store");
function assertSameOrderPayload(existing, nextPayload) {
    if (!nextPayload || typeof nextPayload !== 'object') {
        throw new Error('duplicate_submit_conflict');
    }
    const payload = nextPayload;
    const existingComparable = JSON.stringify({
        pricing: existing.pricing,
        fulfillment: existing.snapshot.fulfillment,
        items: existing.snapshot.items,
        pets: existing.snapshot.pets,
        remark: existing.snapshot.remark,
        paymentMethod: existing.paymentMethod
    });
    const nextComparable = JSON.stringify({
        pricing: payload.pricing,
        fulfillment: payload.fulfillment,
        items: payload.items,
        pets: payload.pets,
        remark: payload.remark,
        paymentMethod: payload.paymentMethod
    });
    if (existingComparable !== nextComparable) {
        throw new Error('duplicate_submit_conflict');
    }
}
async function main(event = {}, context, repository = (0, order_store_1.createOrderStore)()) {
    (0, env_1.resolveRuntimeEnv)(process.env.CLOUDBASE_ENV_NAME ?? 'dev');
    const auth = (0, auth_context_1.getAuthContext)(event, context);
    if (!(0, shared_1.isCreateOrderPayload)(event.payload)) {
        throw new Error('Invalid create-order payload');
    }
    const existingOrder = await repository.getByOpenidAndIdempotencyKey(auth.openid, event.payload.idempotencyKey);
    if (existingOrder) {
        assertSameOrderPayload(existingOrder, event.payload);
        return {
            ok: true,
            order: existingOrder
        };
    }
    const now = event.now ?? new Date().toISOString();
    const order = {
        id: `order-${now.replace(/\D/g, '').slice(0, 14)}`,
        openid: auth.openid,
        status: 'pending_payment',
        idempotencyKey: event.payload.idempotencyKey,
        paymentMethod: event.payload.paymentMethod,
        payment: {
            method: event.payload.paymentMethod,
            status: 'pending'
        },
        pricing: event.payload.pricing,
        snapshot: {
            fulfillment: event.payload.fulfillment,
            items: event.payload.items,
            pets: event.payload.pets,
            remark: event.payload.remark
        },
        createdAt: now,
        updatedAt: now
    };
    const savedOrder = await repository.save(order);
    return {
        ok: true,
        order: savedOrder
    };
}
