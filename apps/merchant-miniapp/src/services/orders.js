"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryMerchantOrders = queryMerchantOrders;
exports.getMerchantOrdersPageViewModel = getMerchantOrdersPageViewModel;
exports.getMerchantOrderDetail = getMerchantOrderDetail;
exports.getMerchantOrderDetailViewModel = getMerchantOrderDetailViewModel;
exports.updateMerchantOrderStatus = updateMerchantOrderStatus;
const order_fulfillment_1 = require("../../../../packages/shared/src/rules/order-fulfillment");
const access_1 = require("./access");
function getCloudCaller() {
    return (payload) => wx.cloud.callFunction(payload);
}
function formatMoney(value) {
    return `￥${value.toFixed(2)}`;
}
function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}
function getPaymentMethodLabel(paymentMethod) {
    return paymentMethod === 'balance' ? '余额支付' : '微信支付';
}
function getFulfillmentModeLabel(mode) {
    if (mode === 'pickup') {
        return '到店自取';
    }
    if (mode === 'express') {
        return '快递发货';
    }
    return '配送到家';
}
function getReservationLabel(order) {
    const reservation = order.snapshot.fulfillment.reservation;
    if (!reservation) {
        return '待确认履约时间';
    }
    return `${reservation.dateLabel} ${reservation.timeLabel}`;
}
function getAddressLabel(order) {
    const { fulfillment } = order.snapshot;
    if (fulfillment.address) {
        return `${fulfillment.address.regionLabel} ${fulfillment.address.detailAddress}`;
    }
    return fulfillment.store.address;
}
function getContactLabel(order) {
    const { fulfillment } = order.snapshot;
    if (fulfillment.address) {
        return `${fulfillment.address.recipientName} ${fulfillment.address.phoneNumber}`;
    }
    if (fulfillment.pickupPhone) {
        return `预留电话 ${fulfillment.pickupPhone}`;
    }
    return fulfillment.store.name;
}
function getCustomerLabel(order) {
    var _a;
    const { fulfillment } = order.snapshot;
    if ((_a = fulfillment.address) === null || _a === void 0 ? void 0 : _a.recipientName) {
        return fulfillment.address.recipientName;
    }
    if (order.snapshot.pets.length) {
        return order.snapshot.pets.map((item) => item.name).join('、');
    }
    if (fulfillment.pickupPhone) {
        return `自取 ${fulfillment.pickupPhone}`;
    }
    return fulfillment.store.name;
}
function getItemSummary(order) {
    const firstItem = order.snapshot.items[0];
    const totalQuantity = order.snapshot.items.reduce((sum, item) => sum + item.quantity, 0);
    if (!firstItem) {
        return '暂无商品';
    }
    if (order.snapshot.items.length === 1) {
        return `${firstItem.name} x${totalQuantity}`;
    }
    return `${firstItem.name} 等 ${totalQuantity} 件商品`;
}
function getProgressStatus(order) {
    var _a, _b;
    if (order.status === 'cancelled') {
        return 'cancelled';
    }
    return (_b = (_a = order.fulfillmentState) === null || _a === void 0 ? void 0 : _a.status) !== null && _b !== void 0 ? _b : (0, order_fulfillment_1.getDefaultFulfillmentState)(order.snapshot.fulfillment.mode).status;
}
function getProgressStatusLabel(order) {
    if (order.status === 'cancelled') {
        return '已取消';
    }
    return (0, order_fulfillment_1.getFulfillmentStatusLabel)(order.snapshot.fulfillment.mode, getProgressStatus(order));
}
function getProgressGroupLabel(order) {
    if (order.status === 'cancelled') {
        return '已取消';
    }
    return (0, order_fulfillment_1.getFulfillmentGroupLabel)(order.snapshot.fulfillment.mode, getProgressStatus(order));
}
function getSecondaryBadgeLabel(order) {
    if (order.status === 'pending_payment') {
        return '待支付';
    }
    if (order.status === 'payment_processing') {
        return '支付处理中';
    }
    if (order.status === 'payment_failed') {
        return '支付失败';
    }
    return null;
}
function compareOrders(left, right) {
    const updatedAtDiff = new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    if (updatedAtDiff !== 0) {
        return updatedAtDiff;
    }
    return right.id.localeCompare(left.id);
}
function toCard(order) {
    return {
        id: order.id,
        orderIdLabel: order.id,
        statusLabel: getProgressStatusLabel(order),
        secondaryBadgeLabel: getSecondaryBadgeLabel(order),
        fulfillmentLabel: getFulfillmentModeLabel(order.snapshot.fulfillment.mode),
        updatedAtLabel: formatDateTime(order.updatedAt),
        scheduleLabel: getReservationLabel(order),
        customerLabel: getCustomerLabel(order),
        itemSummary: getItemSummary(order),
        payableTotalLabel: formatMoney(order.pricing.payableTotal)
    };
}
function toDetailItems(order) {
    return order.snapshot.items.map((item) => ({
        name: item.name,
        specLabel: item.specLabel,
        quantityLabel: `x${item.quantity}`,
        lineTotalLabel: formatMoney(item.lineTotal)
    }));
}
function toTimelineViewModel(entry) {
    var _a, _b, _c;
    return {
        label: entry.label,
        atLabel: formatDateTime(entry.at),
        operatorLabel: (_b = (_a = entry.operator) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : '系统',
        detailLabel: (_c = entry.detail) !== null && _c !== void 0 ? _c : '无备注',
        transitionLabel: entry.fromStatus && entry.toStatus ? `${entry.fromStatus} → ${entry.toStatus}` : '状态记录'
    };
}
function getAuditSummary(timeline) {
    var _a, _b, _c;
    const latest = timeline[0];
    if (!latest) {
        return {
            latestActionLabel: '暂无审计记录',
            latestOperatorLabel: '系统',
            latestAtLabel: '待更新',
            latestNoteLabel: '无备注'
        };
    }
    return {
        latestActionLabel: latest.label,
        latestOperatorLabel: (_b = (_a = latest.operator) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : '系统',
        latestAtLabel: formatDateTime(latest.at),
        latestNoteLabel: (_c = latest.detail) !== null && _c !== void 0 ? _c : '无备注'
    };
}
function isTerminalOrder(order) {
    return order.status === 'cancelled' || (0, order_fulfillment_1.isTerminalFulfillmentStatus)(getProgressStatus(order));
}
function createStatusOptions(order) {
    if (isTerminalOrder(order)) {
        return [];
    }
    const currentStatus = getProgressStatus(order);
    const options = (0, order_fulfillment_1.getPaidFulfillmentChain)(order.snapshot.fulfillment.mode)
        .filter((item) => (order.status === 'paid' ? item.status !== currentStatus : true))
        .map((item) => ({
        value: item.status,
        label: item.label,
        kind: 'fulfillment'
    }));
    options.push({
        value: 'cancelled',
        label: '已取消',
        kind: 'cancel'
    });
    return options;
}
async function resolveMerchantOperator(accessVerifier) {
    var _a, _b;
    const response = await accessVerifier();
    const access = (_a = response.result) !== null && _a !== void 0 ? _a : response;
    if (!access.allowed || !((_b = access.merchant) === null || _b === void 0 ? void 0 : _b.merchantId) || !access.merchant.storeName) {
        throw new Error('MERCHANT_FORBIDDEN');
    }
    return {
        id: access.merchant.merchantId,
        name: access.merchant.storeName
    };
}
async function queryMerchantOrders(callFunction = getCloudCaller()) {
    var _a;
    const response = (await callFunction({
        name: 'queryMerchantOrders',
        data: {}
    }));
    return (_a = response.result.groups) !== null && _a !== void 0 ? _a : [];
}
function getMerchantOrdersPageViewModel(groups) {
    const grouped = groups
        .flatMap((group) => group.orders)
        .sort(compareOrders)
        .reduce((result, order) => {
        const groupLabel = getProgressGroupLabel(order);
        const target = result.find((item) => item.groupLabel === groupLabel);
        const card = toCard(order);
        if (target) {
            target.orders.push(card);
            target.countLabel = `${target.orders.length} 单`;
            return result;
        }
        result.push({
            groupLabel,
            countLabel: '1 单',
            orders: [card]
        });
        return result;
    }, []);
    return {
        isEmpty: grouped.length === 0,
        groups: grouped
    };
}
async function getMerchantOrderDetail(orderId, callFunction = getCloudCaller()) {
    var _a;
    const response = (await callFunction({
        name: 'getMerchantOrderDetail',
        data: {
            orderId
        }
    }));
    return {
        order: response.result.order,
        timeline: (_a = response.result.timeline) !== null && _a !== void 0 ? _a : []
    };
}
function getMerchantOrderDetailViewModel(detail) {
    if (!(detail === null || detail === void 0 ? void 0 : detail.order)) {
        return null;
    }
    const { order, timeline } = detail;
    return {
        id: order.id,
        orderIdLabel: order.id,
        statusLabel: getProgressStatusLabel(order),
        paymentBadgeLabel: getSecondaryBadgeLabel(order),
        createdAtLabel: formatDateTime(order.createdAt),
        fulfillmentLabel: getFulfillmentModeLabel(order.snapshot.fulfillment.mode),
        scheduleLabel: getReservationLabel(order),
        addressLabel: getAddressLabel(order),
        contactLabel: getContactLabel(order),
        customerLabel: getCustomerLabel(order),
        paymentMethodLabel: getPaymentMethodLabel(order.paymentMethod),
        remark: order.snapshot.remark || '无备注',
        itemsSubtotalLabel: formatMoney(order.pricing.itemsSubtotal),
        deliveryFeeLabel: formatMoney(order.pricing.deliveryFee),
        payableTotalLabel: formatMoney(order.pricing.payableTotal),
        items: toDetailItems(order),
        auditSummary: getAuditSummary(timeline),
        timeline: timeline.map(toTimelineViewModel),
        canUpdateStatus: !isTerminalOrder(order),
        actionLabel: order.status === 'paid' ? '更新订单状态' : '标记已支付/已处理',
        requiresManualSettlement: order.status !== 'paid',
        statusOptions: createStatusOptions(order)
    };
}
async function updateMerchantOrderStatus(input, callFunction = getCloudCaller(), accessVerifier = access_1.verifyMerchantAccess) {
    const operator = await resolveMerchantOperator(accessVerifier);
    const data = {
        orderId: input.order.id,
        operator
    };
    if (input.nextStatus === 'cancelled') {
        data.nextOrderStatus = 'cancelled';
    }
    else if (input.order.status !== 'paid') {
        data.nextOrderStatus = 'paid';
        data.nextFulfillmentStatus = input.nextStatus;
        data.adjustmentMethod = input.adjustmentMethod;
        data.reasonNote = input.reasonNote;
    }
    else {
        data.nextFulfillmentStatus = input.nextStatus;
    }
    const response = (await callFunction({
        name: 'updateMerchantOrderStatus',
        data
    }));
    return response.result.order;
}
