"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrderStatusGroup = getOrderStatusGroup;
exports.getOrderStatusTone = getOrderStatusTone;
exports.getOrderStatusTabs = getOrderStatusTabs;
exports.queryMyOrders = queryMyOrders;
exports.getMyOrderDetail = getMyOrderDetail;
exports.getOrdersPageViewModel = getOrdersPageViewModel;
exports.getOrderDetailViewModel = getOrderDetailViewModel;
const order_runtime_1 = require("../shared/order-runtime");
const api_client_1 = require("./api-client");
function sortOrders(list) {
    return [...list].sort((left, right) => {
        const createdAtDiff = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
        if (createdAtDiff !== 0) {
            return createdAtDiff;
        }
        return right.id.localeCompare(left.id);
    });
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
function getFulfillmentLabel(mode) {
    if (mode === 'pickup') {
        return '到店自取';
    }
    if (mode === 'express') {
        return '快递发货';
    }
    return '配送到家';
}
function getScheduleLabel(order) {
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
function getPetNamesLabel(order) {
    if (!order.snapshot.pets.length) {
        return '未选择宠物';
    }
    return order.snapshot.pets.map((item) => item.name).join('、');
}
function getPetRows(order) {
    return order.snapshot.pets.map((item) => ({
        name: item.name
    }));
}
function toOrderCard(order) {
    return {
        id: order.id,
        statusGroup: getOrderStatusGroup(order),
        statusTone: getOrderStatusTone(order),
        statusLabel: (0, order_runtime_1.getOrderStatusLabel)(order),
        createdAtLabel: formatDateTime(order.createdAt),
        fulfillmentLabel: getFulfillmentLabel(order.snapshot.fulfillment.mode),
        scheduleLabel: getScheduleLabel(order),
        itemSummary: getItemSummary(order),
        petNamesLabel: getPetNamesLabel(order),
        payableTotalLabel: formatMoney(order.pricing.payableTotal)
    };
}
function getOrderStatusGroup(order) {
    var _a;
    if (order.status !== 'paid') {
        return 'pending';
    }
    const status = (_a = order.fulfillmentState) === null || _a === void 0 ? void 0 : _a.status;
    if (status === 'completed') {
        return 'completed';
    }
    if (status === 'in_production' || status === 'out_for_delivery' || status === 'ready_for_pickup' || status === 'ready_to_ship') {
        return 'active';
    }
    return 'pending';
}
function getOrderStatusTone(order) {
    var _a, _b;
    if (order.status === 'cancelled' || ((_a = order.fulfillmentState) === null || _a === void 0 ? void 0 : _a.status) === 'cancelled') {
        return 'cancelled';
    }
    if (order.status !== 'paid') {
        return 'payment';
    }
    const status = (_b = order.fulfillmentState) === null || _b === void 0 ? void 0 : _b.status;
    if (status === 'completed') {
        return 'completed';
    }
    if (status === 'ready_for_pickup' || status === 'ready_to_ship') {
        return 'ready';
    }
    if (status === 'out_for_delivery') {
        return 'delivery';
    }
    if (status === 'in_production') {
        return 'work';
    }
    return 'pending';
}
function getOrderStatusTabDefinitions() {
    return [
        { value: 'all', label: '全部' },
        { value: 'pending', label: '待处理' },
        { value: 'active', label: '进行中' },
        { value: 'completed', label: '已完成' }
    ];
}
function getOrderStatusTabs(orders, activeStatusGroup = 'all') {
    return getOrderStatusTabDefinitions().map((tab) => ({
        ...tab,
        count: tab.value === 'all' ? orders.length : orders.filter((order) => getOrderStatusGroup(order) === tab.value).length,
        active: tab.value === activeStatusGroup
    }));
}
function normalizeOrder(order) {
    var _a;
    const backendOrder = order;
    if (order.fulfillmentState || !backendOrder.fulfillmentStatus) {
        return order;
    }
    return {
        ...order,
        fulfillmentState: {
            mode: (_a = backendOrder.fulfillmentMode) !== null && _a !== void 0 ? _a : order.snapshot.fulfillment.mode,
            status: backendOrder.fulfillmentStatus,
            updatedAt: order.updatedAt
        }
    };
}
function resolveQueryMyOrdersArgs(optionsOrRequest, maybeRequest) {
    if (typeof optionsOrRequest === 'function') {
        return {
            options: {},
            request: optionsOrRequest
        };
    }
    return {
        options: optionsOrRequest !== null && optionsOrRequest !== void 0 ? optionsOrRequest : {},
        request: maybeRequest !== null && maybeRequest !== void 0 ? maybeRequest : api_client_1.customerApiRequest
    };
}
async function queryMyOrders(optionsOrRequest, maybeRequest) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const { options, request } = resolveQueryMyOrdersArgs(optionsOrRequest, maybeRequest);
    const response = await request('/api/v1/customer/orders', {
        method: 'GET',
        auth: 'customer',
        query: {
            statusGroup: (_a = options.statusGroup) !== null && _a !== void 0 ? _a : 'all',
            limit: (_b = options.limit) !== null && _b !== void 0 ? _b : 20,
            cursor: (_c = options.cursor) !== null && _c !== void 0 ? _c : undefined
        }
    });
    return {
        orders: ((_d = response.orders) !== null && _d !== void 0 ? _d : []).map(normalizeOrder),
        pageInfo: {
            hasMore: Boolean((_e = response.pageInfo) === null || _e === void 0 ? void 0 : _e.hasMore),
            nextCursor: typeof ((_f = response.pageInfo) === null || _f === void 0 ? void 0 : _f.nextCursor) === 'string' && response.pageInfo.nextCursor
                ? response.pageInfo.nextCursor
                : null,
            limit: typeof ((_g = response.pageInfo) === null || _g === void 0 ? void 0 : _g.limit) === 'number' ? response.pageInfo.limit : (_h = options.limit) !== null && _h !== void 0 ? _h : 20
        }
    };
}
async function getMyOrderDetail(orderId, request = api_client_1.customerApiRequest) {
    const response = await request(`/api/v1/customer/orders/${orderId}`, {
        method: 'GET',
        auth: 'customer'
    });
    return response.order ? normalizeOrder(response.order) : response.order;
}
function getOrdersPageViewModel(orders, highlightOrderId, activeStatusGroup = 'all') {
    var _a, _b, _c, _d;
    const filteredOrders = activeStatusGroup === 'all'
        ? orders
        : orders.filter((order) => getOrderStatusGroup(order) === activeStatusGroup);
    const cards = sortOrders(filteredOrders).map(toOrderCard);
    const highlightedOrderId = (_d = (_b = (_a = cards.find((item) => item.id === highlightOrderId)) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : (_c = cards[0]) === null || _c === void 0 ? void 0 : _c.id) !== null && _d !== void 0 ? _d : null;
    return {
        isEmpty: cards.length === 0,
        highlightedOrderId,
        activeStatusGroup,
        tabs: getOrderStatusTabs(orders, activeStatusGroup),
        cards
    };
}
function getOrderDetailViewModel(order) {
    if (!order) {
        return null;
    }
    const pets = getPetRows(order);
    return {
        id: order.id,
        statusLabel: (0, order_runtime_1.getOrderStatusLabel)(order),
        createdAtLabel: formatDateTime(order.createdAt),
        fulfillmentLabel: getFulfillmentLabel(order.snapshot.fulfillment.mode),
        scheduleLabel: getScheduleLabel(order),
        addressLabel: getAddressLabel(order),
        contactLabel: getContactLabel(order),
        petNamesLabel: getPetNamesLabel(order),
        hasPets: pets.length > 0,
        pets,
        paymentMethodLabel: getPaymentMethodLabel(order.paymentMethod),
        remark: order.snapshot.remark || '无备注',
        itemsSubtotalLabel: formatMoney(order.pricing.itemsSubtotal),
        deliveryFeeLabel: formatMoney(order.pricing.deliveryFee),
        payableTotalLabel: formatMoney(order.pricing.payableTotal),
        items: order.snapshot.items.map((item) => ({
            name: item.name,
            specLabel: item.specLabel || '默认规格',
            quantityLabel: `x${item.quantity}`,
            lineTotalLabel: formatMoney(item.lineTotal)
        }))
    };
}
