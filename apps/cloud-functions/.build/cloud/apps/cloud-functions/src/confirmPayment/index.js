"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const env_1 = require("../shared/env");
async function main(event = {}) {
    (0, env_1.resolveRuntimeEnv)(process.env.CLOUDBASE_ENV_NAME ?? 'dev');
    if (!event.order?.id || !event.order.snapshot || !event.paymentMethod || !event.paymentStatus) {
        throw new Error('Invalid confirm-payment payload');
    }
    if (event.paymentStatus === 'failed') {
        return {
            ok: false,
            code: 'PAYMENT_FAILED'
        };
    }
    const now = event.now ?? new Date().toISOString();
    return {
        ok: true,
        order: {
            ...event.order,
            status: 'paid',
            updatedAt: now
        },
        inventoryAdjustments: event.order.snapshot.items.map((item) => ({
            productId: item.productId,
            quantityDelta: -item.quantity
        })),
        balanceAdjustment: event.paymentMethod === 'balance'
            ? {
                amount: -event.order.pricing.payableTotal
            }
            : null
    };
}
