"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RECEIPT_TEMPLATE_VERSION = void 0;
exports.buildOrderReceiptLines = buildOrderReceiptLines;
exports.encodeReceiptChunks = encodeReceiptChunks;
exports.createReceiptPrintJob = createReceiptPrintJob;
exports.applyReceiptPrintAudit = applyReceiptPrintAudit;
exports.RECEIPT_TEMPLATE_VERSION = 'receipt-v1';
const CHUNK_SIZE = 18;
function formatMoney(value) {
    return `￥${value.toFixed(2)}`;
}
function getFulfillmentLine(order) {
    const { fulfillment } = order.snapshot;
    const modeLabel = fulfillment.mode === 'pickup' ? '到店自取' : fulfillment.mode === 'express' ? '快递发货' : '配送到家';
    const reservation = fulfillment.reservation
        ? `${fulfillment.reservation.dateLabel} ${fulfillment.reservation.timeLabel}`
        : '待确认';
    return [`履约方式：${modeLabel}`, `预约时间：${reservation}`];
}
function getContactLines(order) {
    const { fulfillment } = order.snapshot;
    if (fulfillment.address) {
        return [
            `联系人：${fulfillment.address.recipientName}`,
            `电话：${fulfillment.address.phoneNumber}`,
            `地址：${fulfillment.address.regionLabel} ${fulfillment.address.detailAddress}`
        ];
    }
    if (fulfillment.pickupPhone) {
        return [`自取电话：${fulfillment.pickupPhone}`];
    }
    return [`门店：${fulfillment.store.name}`, `门店地址：${fulfillment.store.address}`];
}
function buildOrderReceiptLines(order, isReprint) {
    const lines = [
        order.snapshot.fulfillment.store.name,
        isReprint ? '*** 补打小票 ***' : '订单小票',
        `订单号：${order.id}`,
        `下单时间：${order.createdAt}`,
        order.paidAt ? `支付时间：${order.paidAt}` : '支付时间：未支付',
        ...getFulfillmentLine(order),
        ...getContactLines(order),
        '------------------------------'
    ];
    for (const item of order.snapshot.items) {
        lines.push(`${item.name} ${item.specLabel}`);
        lines.push(`x${item.quantity} ${formatMoney(item.unitPrice)} = ${formatMoney(item.lineTotal)}`);
    }
    lines.push('------------------------------');
    lines.push(`商品小计：${formatMoney(order.pricing.itemsSubtotal)}`);
    lines.push(`配送费：${formatMoney(order.pricing.deliveryFee)}`);
    lines.push(`实付金额：${formatMoney(order.pricing.payableTotal)}`);
    if (order.snapshot.pets.length) {
        lines.push(`宠物：${order.snapshot.pets.map((item) => item.name).join('、')}`);
    }
    if (order.snapshot.remark.trim()) {
        lines.push(`备注：${order.snapshot.remark.trim()}`);
    }
    lines.push('------------------------------');
    lines.push(`打印版本：${exports.RECEIPT_TEMPLATE_VERSION}`);
    lines.push('\n\n');
    return lines;
}
function encodeReceiptChunks(lines) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(`${lines.join('\n')}\n`);
    const chunks = [];
    for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
        chunks.push(Buffer.from(bytes.slice(offset, offset + CHUNK_SIZE)).toString('base64'));
    }
    return chunks;
}
function createReceiptPrintJob(order, now) {
    const printCount = order.receiptPrint?.printCount ?? 0;
    const isReprint = printCount > 0;
    const previewLines = buildOrderReceiptLines(order, isReprint);
    return {
        orderId: order.id,
        printJobId: `print-${order.id}-${Date.parse(now) || Date.now()}`,
        receiptTemplateVersion: exports.RECEIPT_TEMPLATE_VERSION,
        isReprint,
        nextPrintCount: printCount + 1,
        chunksBase64: encodeReceiptChunks(previewLines),
        previewLines
    };
}
function applyReceiptPrintAudit(order, payload) {
    const nextPrintCount = payload.result === 'success' ? (order.receiptPrint?.printCount ?? 0) + 1 : order.receiptPrint?.printCount ?? 0;
    const nextOrder = {
        ...order,
        updatedAt: payload.printedAt,
        receiptPrint: {
            printCount: nextPrintCount,
            lastPrintedAt: payload.printedAt,
            lastPrintResult: payload.result,
            lastPrinterDeviceLabel: payload.printerDeviceLabel,
            receiptTemplateVersion: payload.receiptTemplateVersion
        }
    };
    const timelineEntry = {
        type: 'print',
        label: payload.result === 'success' ? (payload.isReprint ? '补打小票' : '打印小票') : '小票打印失败',
        at: payload.printedAt,
        detail: payload.result === 'failed' ? payload.failureReason : payload.printerDeviceLabel,
        operator: payload.operator,
        toStatus: payload.result
    };
    nextOrder.merchantTimeline = [...(order.merchantTimeline ?? []), timelineEntry];
    return nextOrder;
}
