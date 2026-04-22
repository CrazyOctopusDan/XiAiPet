"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const order_fulfillment_1 = require("../../../../packages/shared/src/rules/order-fulfillment");
const index_1 = require("../assertMerchantAccess/index");
const env_1 = require("../shared/env");
const order_store_1 = require("../shared/order-store");
function sanitizeOrder(order) {
    const { openid: _openid, idempotencyKey: _idempotencyKey, ...safeOrder } = order;
    return safeOrder;
}
function buildFallbackTimeline(order) {
    const timeline = [
        {
            type: 'created',
            label: '订单创建',
            at: order.createdAt
        }
    ];
    if (order.merchantOverride?.manualSettlement) {
        timeline.push({
            type: 'manual_settlement',
            label: '人工收款确认',
            at: order.merchantOverride.manualSettlement.settledAt,
            detail: order.merchantOverride.manualSettlement.reasonNote,
            operator: order.merchantOverride.manualSettlement.operator,
            fromStatus: order.merchantOverride.manualSettlement.before.orderStatus,
            toStatus: order.merchantOverride.manualSettlement.after.orderStatus
        });
    }
    else if (order.paidAt) {
        timeline.push({
            type: 'payment',
            label: '支付完成',
            at: order.paidAt
        });
    }
    if (order.fulfillmentState?.updatedAt) {
        timeline.push({
            type: 'fulfillment',
            label: (0, order_fulfillment_1.getFulfillmentStatusLabel)(order.fulfillmentState.mode, order.fulfillmentState.status),
            at: order.fulfillmentState.updatedAt,
            toStatus: order.fulfillmentState.status
        });
    }
    if (order.cancelledAt) {
        timeline.push({
            type: 'cancelled',
            label: '订单取消',
            at: order.cancelledAt,
            toStatus: 'cancelled'
        });
    }
    return timeline.sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime());
}
async function main(event = {}, context, store = (0, order_store_1.createOrderStore)()) {
    (0, env_1.resolveRuntimeEnv)(process.env.CLOUDBASE_ENV_NAME ?? 'dev');
    const access = await (0, index_1.main)(event, context);
    if (!access.allowed) {
        throw new Error('MERCHANT_FORBIDDEN');
    }
    if (!event.orderId) {
        throw new Error('ORDER_NOT_FOUND');
    }
    const order = (await store.getById(event.orderId));
    if (!order) {
        throw new Error('ORDER_NOT_FOUND');
    }
    return {
        ok: true,
        order: sanitizeOrder(order),
        timeline: order.merchantTimeline?.length ? order.merchantTimeline : buildFallbackTimeline(order)
    };
}
