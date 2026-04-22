"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const order_fulfillment_1 = require("../../../../packages/shared/src/rules/order-fulfillment");
const index_1 = require("../assertMerchantAccess/index");
const env_1 = require("../shared/env");
const order_store_1 = require("../shared/order-store");
function isTerminalOrder(order) {
    return order.status === 'cancelled' || Boolean(order.fulfillmentState && (0, order_fulfillment_1.isTerminalFulfillmentStatus)(order.fulfillmentState.status));
}
function appendTimeline(order, entry) {
    return [...(order.merchantTimeline ?? []), entry];
}
function requireOperator(event) {
    if (!event.operator?.id || !event.operator?.name) {
        throw new Error('INVALID_MERCHANT_OPERATOR');
    }
    return event.operator;
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
    if (isTerminalOrder(order)) {
        throw new Error('ORDER_TERMINAL_LOCKED');
    }
    const now = event.now ?? new Date().toISOString();
    const operator = event.operator;
    if (order.status !== 'paid' && event.nextOrderStatus === 'paid') {
        if (!event.adjustmentMethod || !event.reasonNote) {
            throw new Error('MANUAL_SETTLEMENT_REQUIRED');
        }
        const settlementOperator = requireOperator(event);
        const fulfillmentState = order.fulfillmentState ?? {
            ...(0, order_fulfillment_1.getDefaultFulfillmentState)(order.snapshot.fulfillment.mode),
            updatedAt: now
        };
        const fulfilledStatus = event.nextFulfillmentStatus ?? fulfillmentState.status;
        if (!(0, order_fulfillment_1.canTransitionFulfillmentState)({
            mode: fulfillmentState.mode,
            currentStatus: fulfillmentState.status,
            nextStatus: fulfilledStatus
        })) {
            throw new Error('INVALID_FULFILLMENT_TRANSITION');
        }
        const nextOrder = {
            ...order,
            status: 'paid',
            payment: {
                method: order.payment?.method ?? order.paymentMethod,
                status: 'paid'
            },
            paidAt: now,
            updatedAt: now,
            fulfillmentState: {
                mode: fulfillmentState.mode,
                status: fulfilledStatus,
                updatedAt: now
            },
            merchantOverride: {
                ...(order.merchantOverride ?? {}),
                manualSettlement: (0, order_fulfillment_1.createManualSettlementRecord)({
                    method: event.adjustmentMethod,
                    reasonNote: event.reasonNote,
                    operator: settlementOperator,
                    before: {
                        orderStatus: order.status,
                        paymentStatus: order.payment?.status ?? 'pending'
                    },
                    after: {
                        orderStatus: 'paid',
                        paymentStatus: 'paid',
                        fulfillmentStatus: fulfilledStatus
                    },
                    settledAt: now
                })
            }
        };
        nextOrder.merchantTimeline = appendTimeline(nextOrder, {
            type: 'manual_settlement',
            label: '人工收款确认',
            at: now,
            detail: event.reasonNote,
            operator: settlementOperator,
            fromStatus: order.status,
            toStatus: 'paid'
        });
        return {
            ok: true,
            order: await store.save(nextOrder)
        };
    }
    if (event.nextOrderStatus === 'cancelled') {
        const cancelledOrder = {
            ...order,
            status: 'cancelled',
            cancelledAt: now,
            updatedAt: now,
            fulfillmentState: order.fulfillmentState
                ? {
                    ...order.fulfillmentState,
                    status: 'cancelled',
                    updatedAt: now
                }
                : undefined
        };
        cancelledOrder.merchantTimeline = appendTimeline(cancelledOrder, {
            type: 'cancelled',
            label: '订单取消',
            at: now,
            operator,
            fromStatus: order.status,
            toStatus: 'cancelled'
        });
        return {
            ok: true,
            order: await store.save(cancelledOrder)
        };
    }
    if (!event.nextFulfillmentStatus || order.status !== 'paid' || !order.fulfillmentState) {
        throw new Error('INVALID_STATUS_MUTATION');
    }
    if (!(0, order_fulfillment_1.canTransitionFulfillmentState)({
        mode: order.fulfillmentState.mode,
        currentStatus: order.fulfillmentState.status,
        nextStatus: event.nextFulfillmentStatus
    })) {
        throw new Error('INVALID_FULFILLMENT_TRANSITION');
    }
    const updatedOrder = {
        ...order,
        updatedAt: now,
        fulfillmentState: {
            ...order.fulfillmentState,
            status: event.nextFulfillmentStatus,
            updatedAt: now
        }
    };
    updatedOrder.merchantTimeline = appendTimeline(updatedOrder, {
        type: 'fulfillment',
        label: (0, order_fulfillment_1.getFulfillmentStatusLabel)(order.fulfillmentState.mode, event.nextFulfillmentStatus),
        at: now,
        operator,
        fromStatus: order.fulfillmentState.status,
        toStatus: event.nextFulfillmentStatus
    });
    return {
        ok: true,
        order: await store.save(updatedOrder)
    };
}
