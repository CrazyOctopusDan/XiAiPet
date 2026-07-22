"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryMerchantOrders = queryMerchantOrders;
exports.getMerchantOrdersPageViewModel = getMerchantOrdersPageViewModel;
exports.getMerchantOrderGroupSummary = getMerchantOrderGroupSummary;
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
function parseLocalDateValue(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
        return null;
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
}
function startOfLocalDate(value) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}
function getRelativeReservationPrefix(reservationDate, now = new Date()) {
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.round((startOfLocalDate(reservationDate).getTime() - startOfLocalDate(now).getTime()) / millisecondsPerDay);
    if (diffDays === -1) {
        return '昨天';
    }
    if (diffDays === 0) {
        return '今天';
    }
    if (diffDays === 1) {
        return '明天';
    }
    return '';
}
function formatReservationDateLabel(reservation) {
    var _a;
    const reservationDate = (reservation === null || reservation === void 0 ? void 0 : reservation.dateValue) ? parseLocalDateValue(reservation.dateValue) : null;
    if (!reservationDate) {
        return (_a = reservation === null || reservation === void 0 ? void 0 : reservation.dateLabel) !== null && _a !== void 0 ? _a : '';
    }
    const now = new Date();
    const relativePrefix = getRelativeReservationPrefix(reservationDate, now);
    const sameYear = reservationDate.getFullYear() === now.getFullYear();
    const dateLabel = sameYear
        ? `${reservationDate.getMonth() + 1}月${reservationDate.getDate()}日`
        : `${reservationDate.getFullYear()}年${reservationDate.getMonth() + 1}月${reservationDate.getDate()}日`;
    return relativePrefix ? `${relativePrefix} ${dateLabel}` : dateLabel;
}
function getReservationLabel(order) {
    const reservation = order.snapshot.fulfillment.reservation;
    if (!reservation) {
        return '待确认履约时间';
    }
    return `${formatReservationDateLabel(reservation)} ${reservation.timeLabel}`;
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
function getOrderGifts(order) {
    return Array.isArray(order.snapshot.gifts) ? order.snapshot.gifts : [];
}
function getGiftSummaryLabel(order) {
    const gifts = getOrderGifts(order);
    if (!gifts.length) {
        return null;
    }
    return `赠品 ${gifts.length} 件：${gifts.map((gift) => gift.name).join('、')}`;
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
function normalizeMerchantOrder(order) {
    if (order.fulfillmentState || !order.fulfillmentStatus) {
        return order;
    }
    return {
        ...order,
        fulfillmentState: {
            mode: order.snapshot.fulfillment.mode,
            status: order.fulfillmentStatus,
            updatedAt: order.updatedAt
        }
    };
}
function normalizeQueryGroups(groups = []) {
    return groups.map((group) => ({
        ...group,
        orders: group.orders.map(normalizeMerchantOrder)
    }));
}
function groupsFromFlatOrders(orders = []) {
    if (!orders.length) {
        return [];
    }
    return [
        {
            groupLabel: '订单',
            orders: orders.map(normalizeMerchantOrder)
        }
    ];
}
function isMerchantApiRequester(value) {
    return typeof value === 'function';
}
function toCard(order) {
    return {
        id: order.id,
        orderIdLabel: order.id,
        statusLabel: getProgressStatusLabel(order),
        secondaryBadgeLabel: getSecondaryBadgeLabel(order),
        fulfillmentLabel: getFulfillmentModeLabel(order.snapshot.fulfillment.mode),
        createdAtLabel: formatDateTime(order.createdAt),
        scheduleLabel: getReservationLabel(order),
        customerLabel: getCustomerLabel(order),
        itemSummary: getItemSummary(order),
        payableTotalLabel: formatMoney(order.pricing.payableTotal),
        hasGifts: getOrderGifts(order).length > 0,
        giftSummaryLabel: getGiftSummaryLabel(order)
    };
}
function buildFallbackTimeline(order) {
    var _a;
    const timeline = [
        {
            type: 'created',
            label: '订单创建',
            at: order.createdAt
        }
    ];
    if (order.paidAt) {
        timeline.push({
            type: 'payment',
            label: '支付完成',
            at: order.paidAt
        });
    }
    if ((_a = order.fulfillmentState) === null || _a === void 0 ? void 0 : _a.updatedAt) {
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
function toDetailItems(order) {
    return order.snapshot.items.map((item) => ({
        name: item.name,
        specLabel: item.specLabel,
        quantityLabel: `x${item.quantity}`,
        lineTotalLabel: formatMoney(item.lineTotal)
    }));
}
function toDetailGifts(order) {
    return getOrderGifts(order).map((gift) => ({
        id: gift.id,
        name: gift.name,
        description: gift.description.trim() || '无补充说明'
    }));
}
function getPetGenderLabel(gender) {
    if (gender === 'female') {
        return '女孩';
    }
    if (gender === 'male') {
        return '男孩';
    }
    return '性别未设置';
}
function toDetailPets(order) {
    return order.snapshot.pets.map((pet) => {
        var _a;
        const allergyNotes = (_a = pet.allergyNotes) === null || _a === void 0 ? void 0 : _a.trim();
        return {
            name: pet.name,
            genderLabel: getPetGenderLabel(pet.gender),
            birthdayLabel: pet.birthday ? `生日 ${pet.birthday}` : '生日未设置',
            allergyNotesLabel: allergyNotes ? `过敏源：${allergyNotes}` : '暂无过敏源备注',
            hasAllergyNotes: Boolean(allergyNotes)
        };
    });
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
async function queryMerchantOrders(filtersOrRequest = {}, maybeRequest = api_client_1.merchantApiRequest) {
    var _a;
    const request = isMerchantApiRequester(filtersOrRequest) ? filtersOrRequest : maybeRequest;
    const filters = isMerchantApiRequester(filtersOrRequest) ? {} : filtersOrRequest;
    const response = await request('/api/v1/merchant/orders', {
        method: 'GET',
        auth: 'merchant',
        query: {
            scope: (_a = filters.scope) !== null && _a !== void 0 ? _a : 'active',
            fulfillmentMode: filters.fulfillmentMode === 'all' ? undefined : filters.fulfillmentMode
        }
    });
    return response.groups ? normalizeQueryGroups(response.groups) : groupsFromFlatOrders(response.orders);
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
function getMerchantOrderGroupSummary(groups) {
    return groups.reduce((summary, group) => ({
        totalOrders: summary.totalOrders + group.orders.length,
        activeGroups: summary.activeGroups + (group.groupLabel === '已取消' ? 0 : 1),
        pendingPayment: summary.pendingPayment + group.orders.filter((order) => order.secondaryBadgeLabel === '待支付').length
    }), {
        totalOrders: 0,
        activeGroups: 0,
        pendingPayment: 0
    });
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
    const order = normalizeMerchantOrder(detail.order);
    const timeline = detail.timeline.length ? detail.timeline : buildFallbackTimeline(order);
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
        gifts: toDetailGifts(order),
        hasGifts: getOrderGifts(order).length > 0,
        giftCountLabel: `共 ${getOrderGifts(order).length} 件，务必随单发出`,
        giftSettlementLabel: order.status === 'paid'
            ? '赠品权益已核销，请备货时逐项确认，避免漏发。'
            : '赠品权益已锁定，支付成功后自动核销；请在确认收款后备货。',
        pets: toDetailPets(order),
        hasPets: order.snapshot.pets.length > 0,
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
