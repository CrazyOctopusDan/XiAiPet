"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrderStore = createOrderStore;
function getCloudDatabase() {
    try {
        const cloud = require('wx-server-sdk');
        cloud.init?.();
        return cloud.database?.();
    }
    catch (error) {
        return undefined;
    }
}
function createOrderStore() {
    return {
        async getByOpenidAndIdempotencyKey(openid, idempotencyKey) {
            const db = getCloudDatabase();
            if (!db) {
                return null;
            }
            const result = await db.collection('orders').where({ openid, idempotencyKey }).get();
            return result.data[0] ?? null;
        },
        async getById(orderId) {
            const db = getCloudDatabase();
            if (!db) {
                return null;
            }
            const result = await db.collection('orders').doc(orderId).get();
            return result.data ?? null;
        },
        async listMerchantOrders() {
            const db = getCloudDatabase();
            if (!db) {
                return [];
            }
            const result = await db.collection('orders').get();
            return result.data ?? [];
        },
        async save(order) {
            const db = getCloudDatabase();
            if (!db) {
                return order;
            }
            await db.collection('orders').doc(order.id).set({
                data: order
            });
            return order;
        }
    };
}
