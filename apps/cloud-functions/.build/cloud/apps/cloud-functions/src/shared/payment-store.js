"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaymentStore = createPaymentStore;
function getNormalizedTitle(reasonType) {
    if (reasonType === '充值') {
        return '商户充值';
    }
    if (reasonType === '补偿') {
        return '商户补偿';
    }
    if (reasonType === '人工纠错') {
        return '余额纠错';
    }
    if (reasonType === '线下收款') {
        return '线下收款';
    }
    return '商户调整';
}
function getShortNote(payload) {
    const amount = Math.abs(payload.action === 'set' ? payload.targetBalance - payload.beforeBalance : payload.delta).toFixed(2);
    if (payload.action === 'add') {
        return `余额增加 ￥${amount}`;
    }
    if (payload.action === 'deduct') {
        return `余额扣减 ￥${amount}`;
    }
    return `余额调整至 ￥${payload.targetBalance.toFixed(2)}`;
}
function getCloudSdk() {
    try {
        const cloud = require('wx-server-sdk');
        cloud.init?.();
        return cloud;
    }
    catch (error) {
        return null;
    }
}
function createPaymentStore() {
    return {
        async getOrderById(orderId) {
            const cloud = getCloudSdk();
            const db = cloud?.database?.();
            if (!db) {
                return null;
            }
            const result = await db.collection('orders').doc(orderId).get();
            return result.data ?? null;
        },
        async saveOrder(order) {
            const cloud = getCloudSdk();
            const db = cloud?.database?.();
            if (!db) {
                return order;
            }
            await db.collection('orders').doc(order.id).set({
                data: order
            });
            return order;
        },
        async listOrdersByOpenid(openid) {
            const cloud = getCloudSdk();
            const db = cloud?.database?.();
            if (!db) {
                return [];
            }
            const result = await db.collection('orders').where({ openid }).get();
            return result.data ?? [];
        },
        async finalizeBalancePayment(order, now) {
            const cloud = getCloudSdk();
            const db = cloud?.database?.();
            if (!db?.startTransaction) {
                return {
                    error: 'INSUFFICIENT_BALANCE'
                };
            }
            const transaction = await db.startTransaction();
            const accounts = transaction.collection('balance_accounts');
            const orders = transaction.collection('orders');
            const ledgers = transaction.collection('balance_ledgers');
            const products = transaction.collection('products');
            const accountSnapshot = await accounts.doc(order.openid).get();
            const currentBalance = Number(accountSnapshot.data?.balance ?? 0);
            if (currentBalance < order.pricing.payableTotal) {
                await transaction.rollback();
                return {
                    error: 'INSUFFICIENT_BALANCE'
                };
            }
            const nextBalance = Number((currentBalance - order.pricing.payableTotal).toFixed(2));
            const paidOrder = {
                ...order,
                status: 'paid',
                payment: {
                    method: 'balance',
                    status: 'paid'
                },
                updatedAt: now,
                paidAt: now
            };
            await orders.doc(order.id).set({
                data: paidOrder
            });
            await accounts.doc(order.openid).set({
                data: {
                    ...(accountSnapshot.data ?? { openid: order.openid, createdAt: now }),
                    openid: order.openid,
                    balance: nextBalance,
                    updatedAt: now
                }
            });
            await ledgers.doc(`ledger-${order.id}`).set({
                data: {
                    id: `ledger-${order.id}`,
                    openid: order.openid,
                    orderId: order.id,
                    amountDelta: -order.pricing.payableTotal,
                    beforeBalance: currentBalance,
                    afterBalance: nextBalance,
                    reason: 'order_payment',
                    createdAt: now
                }
            });
            for (const item of order.snapshot.items) {
                const productSnapshot = await products.doc(item.productId).get();
                const currentStock = Number(productSnapshot.data?.stock ?? 0);
                await products.doc(item.productId).set({
                    data: {
                        ...(productSnapshot.data ?? {}),
                        stock: Math.max(0, currentStock - item.quantity),
                        updatedAt: now
                    }
                });
            }
            await transaction.commit();
            return {
                order: paidOrder,
                balanceAfter: nextBalance
            };
        },
        async applyMerchantBalanceAdjustment(payload) {
            const cloud = getCloudSdk();
            const db = cloud?.database?.();
            if (!db?.startTransaction) {
                return {
                    error: 'NEGATIVE_BALANCE'
                };
            }
            const transaction = await db.startTransaction();
            const accounts = transaction.collection('balance_accounts');
            const ledgers = transaction.collection('balance_ledgers');
            const accountSnapshot = await accounts.doc(payload.userOpenid).get();
            const currentBalance = Number(accountSnapshot.data?.balance ?? 0);
            const nextBalance = payload.action === 'set'
                ? Number(payload.targetBalance.toFixed(2))
                : Number((currentBalance + payload.delta).toFixed(2));
            if (nextBalance < 0) {
                await transaction.rollback();
                return {
                    error: 'NEGATIVE_BALANCE'
                };
            }
            const normalizedTitle = getNormalizedTitle(payload.reasonType);
            const shortNote = getShortNote(payload);
            const ledger = {
                id: `ledger-merchant-${payload.userOpenid}-${payload.operatedAt.replace(/\D/g, '')}`,
                openid: payload.userOpenid,
                amountDelta: payload.action === 'set' ? Number((nextBalance - currentBalance).toFixed(2)) : payload.delta,
                beforeBalance: currentBalance,
                afterBalance: nextBalance,
                reason: 'merchant_adjustment',
                reasonType: payload.reasonType,
                note: payload.note,
                normalizedTitle,
                shortNote,
                operator: payload.operator,
                action: payload.action,
                targetBalance: payload.targetBalance,
                createdAt: payload.operatedAt
            };
            await accounts.doc(payload.userOpenid).set({
                data: {
                    ...(accountSnapshot.data ?? { openid: payload.userOpenid, createdAt: payload.operatedAt }),
                    openid: payload.userOpenid,
                    balance: nextBalance,
                    updatedAt: payload.operatedAt
                }
            });
            await ledgers.doc(ledger.id).set({
                data: ledger
            });
            await transaction.commit();
            return {
                balanceAfter: nextBalance,
                ledger
            };
        },
        async getWechatPayConfig() {
            return {
                enabled: process.env.WECHAT_PAY_ENABLED === 'true',
                appid: process.env.WECHAT_PAY_APP_ID,
                mchid: process.env.WECHAT_PAY_MCH_ID,
                notifyUrl: process.env.WECHAT_PAY_NOTIFY_URL
            };
        }
    };
}
