"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryMerchantOrders = queryMerchantOrders;
exports.getMerchantOrdersPageViewModel = getMerchantOrdersPageViewModel;
exports.getMerchantOrderDetail = getMerchantOrderDetail;
exports.getMerchantOrderDetailViewModel = getMerchantOrderDetailViewModel;
exports.updateMerchantOrderStatus = updateMerchantOrderStatus;
const order_fulfillment_1 = require("../shared/order-fulfillment");
const api_client_1 = require("./api-client");
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
function getReceiptPrintCountLabel(order) {
    var _a, _b;
    const printCount = (_b = (_a = order.receiptPrint) === null || _a === void 0 ? void 0 : _a.printCount) !== null && _b !== void 0 ? _b : 0;
    if (printCount <= 0) {
        return '尚未打印';
    }
    return `已打印 ${printCount} 次`;
}
function getReceiptPrintStatusLabel(order) {
    const metadata = order.receiptPrint;
    if (!(metadata === null || metadata === void 0 ? void 0 : metadata.lastPrintResult)) {
        return '等待首次打印';
    }
    const resultLabel = metadata.lastPrintResult === 'success' ? '最近打印成功' : '最近打印失败';
    const timeLabel = metadata.lastPrintedAt ? formatDateTime(metadata.lastPrintedAt) : '时间未知';
    const printerLabel = metadata.lastPrinterDeviceLabel ? ` · ${metadata.lastPrinterDeviceLabel}` : '';
    return `${resultLabel} · ${timeLabel}${printerLabel}`;
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
function getCurrentMerchantOperator() {
    var _a;
    const account = (_a = (0, api_client_1.getMerchantSession)()) === null || _a === void 0 ? void 0 : _a.account;
    if (!(account === null || account === void 0 ? void 0 : account.id) || !account.username) {
        throw new api_client_1.MerchantApiError('MERCHANT_LOGIN_REQUIRED', '请先登录商户账号', 401);
    }
    return {
        id: account.id,
        name: account.username
    };
}
async function queryMerchantOrders(request = api_client_1.merchantApiRequest) {
    var _a;
    const response = await request('/api/v1/merchant/orders', {
        method: 'GET',
        auth: 'merchant'
    });
    return (_a = response.groups) !== null && _a !== void 0 ? _a : [];
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
async function getMerchantOrderDetail(orderId, request = api_client_1.merchantApiRequest) {
    var _a;
    const response = await request(`/api/v1/merchant/orders/${orderId}`, {
        method: 'GET',
        auth: 'merchant'
    });
    return {
        order: response.order,
        timeline: (_a = response.timeline) !== null && _a !== void 0 ? _a : []
    };
}
function getMerchantOrderDetailViewModel(detail) {
    var _a, _b;
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
        canPrintReceipt: order.status === 'paid',
        printActionLabel: ((_b = (_a = order.receiptPrint) === null || _a === void 0 ? void 0 : _a.printCount) !== null && _b !== void 0 ? _b : 0) > 0 ? '补打小票' : '打印小票',
        receiptPrintCountLabel: getReceiptPrintCountLabel(order),
        receiptPrintStatusLabel: getReceiptPrintStatusLabel(order),
        canUpdateStatus: !isTerminalOrder(order),
        actionLabel: order.status === 'paid' ? '更新订单状态' : '标记已支付/已处理',
        requiresManualSettlement: order.status !== 'paid',
        statusOptions: createStatusOptions(order)
    };
}
async function updateMerchantOrderStatus(input, request = api_client_1.merchantApiRequest) {
    const operator = getCurrentMerchantOperator();
    const body = {
        operator
    };
    if (input.nextStatus === 'cancelled') {
        body.status = 'cancelled';
        body.fulfillmentStatus = 'cancelled';
    }
    else if (input.order.status !== 'paid') {
        body.status = 'paid';
        body.paymentStatus = 'paid';
        body.fulfillmentStatus = input.nextStatus;
        body.adjustmentMethod = input.adjustmentMethod;
        body.reasonNote = input.reasonNote;
    }
    else {
        body.fulfillmentStatus = input.nextStatus;
    }
    const response = await request(`/api/v1/merchant/orders/${input.order.id}/status`, {
        method: 'PATCH',
        body,
        auth: 'merchant'
    });
    return response.order;
}
