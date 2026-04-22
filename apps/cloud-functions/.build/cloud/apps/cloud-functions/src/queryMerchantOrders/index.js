"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const shared_1 = require("@xiaipet/shared");
const order_fulfillment_1 = require("../../../../packages/shared/src/rules/order-fulfillment");
const index_1 = require("../assertMerchantAccess/index");
const env_1 = require("../shared/env");
const order_store_1 = require("../shared/order-store");
function sortOrders(list) {
    return [...list].sort((left, right) => {
        const updatedAtDiff = new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
        if (updatedAtDiff !== 0) {
            return updatedAtDiff;
        }
        return right.id.localeCompare(left.id);
    });
}
function toListItem(order) {
    const descriptor = (0, shared_1.getOrderStatusDescriptor)(order);
    const fallbackFulfillment = (0, order_fulfillment_1.getDefaultFulfillmentState)(order.snapshot.fulfillment.mode);
    const fulfillmentStatus = order.fulfillmentState?.status ?? fallbackFulfillment.status;
    const groupLabel = order.status === 'cancelled'
        ? descriptor.groupLabel
        : (0, order_fulfillment_1.getFulfillmentGroupLabel)(order.snapshot.fulfillment.mode, fulfillmentStatus);
    return {
        id: order.id,
        status: order.status,
        statusLabel: descriptor.label,
        groupLabel,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.payment?.status,
        fulfillmentMode: order.snapshot.fulfillment.mode,
        fulfillmentStatus,
        pricing: order.pricing,
        snapshot: order.snapshot,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
    };
}
async function main(event = {}, context, store = (0, order_store_1.createOrderStore)()) {
    (0, env_1.resolveRuntimeEnv)(process.env.CLOUDBASE_ENV_NAME ?? 'dev');
    const access = await (0, index_1.main)(event, context);
    if (!access.allowed) {
        throw new Error('MERCHANT_FORBIDDEN');
    }
    const orders = sortOrders((await store.listMerchantOrders()));
    const groups = orders.reduce((result, order) => {
        const item = toListItem(order);
        const group = result.find((entry) => entry.groupLabel === item.groupLabel);
        if (group) {
            group.orders.push(item);
            return result;
        }
        result.push({
            groupLabel: item.groupLabel,
            orders: [item]
        });
        return result;
    }, []);
    return {
        ok: true,
        groups
    };
}
