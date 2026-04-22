"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const order_pricing_1 = require("./order-pricing");
(0, vitest_1.describe)('order pricing rules', () => {
    (0, vitest_1.it)('builds line totals and the payable order breakdown', () => {
        const line = (0, order_pricing_1.buildOrderLineSnapshot)({
            productId: 'ocean-party',
            name: '海洋派对蛋糕',
            quantity: 2,
            unitPrice: 58,
            specId: 'party-6inch',
            specLabel: '6 寸'
        });
        const breakdown = (0, order_pricing_1.buildOrderPricingBreakdown)({
            itemsSubtotal: line.lineTotal,
            deliveryFee: 12
        });
        (0, vitest_1.expect)(line).toMatchObject({
            quantity: 2,
            unitPrice: 58,
            lineTotal: 116
        });
        (0, vitest_1.expect)(breakdown).toEqual({
            itemsSubtotal: 116,
            deliveryFee: 12,
            payableTotal: 128
        });
    });
    (0, vitest_1.it)('accepts a complete create-order payload and rejects incomplete ones', () => {
        const payload = {
            idempotencyKey: 'checkout-20260417-001',
            paymentMethod: 'wechat',
            fulfillment: {
                mode: 'delivery',
                address: {
                    recipientName: '虾衣妈妈',
                    phoneNumber: '13800001234',
                    regionLabel: '上海市 静安区',
                    detailAddress: '南京西路 1266 号 8 楼',
                    tag: '家'
                },
                reservation: {
                    dateValue: '2026-04-17',
                    dateLabel: '今天 04-17',
                    timeValue: '10:30',
                    timeLabel: '10:30'
                },
                store: {
                    name: '虾衣宠物烘焙工作室',
                    address: '上海市静安区南京西路 1266 号 8 楼'
                }
            },
            items: [
                {
                    productId: 'ocean-party',
                    name: '海洋派对蛋糕',
                    quantity: 1,
                    unitPrice: 58,
                    lineTotal: 58,
                    specId: 'party-6inch',
                    specLabel: '6 寸'
                }
            ],
            pets: [
                {
                    id: 'pet-pudding',
                    name: '布丁'
                }
            ],
            remark: '少糖',
            hasReadCustomNotice: true,
            pricing: {
                itemsSubtotal: 58,
                deliveryFee: 10,
                payableTotal: 68
            }
        };
        (0, vitest_1.expect)((0, order_pricing_1.isCreateOrderPayload)(payload)).toBe(true);
        (0, vitest_1.expect)(payload.idempotencyKey).toBe('checkout-20260417-001');
        (0, vitest_1.expect)((0, order_pricing_1.isCreateOrderPayload)({
            paymentMethod: 'wechat',
            items: []
        })).toBe(false);
    });
});
