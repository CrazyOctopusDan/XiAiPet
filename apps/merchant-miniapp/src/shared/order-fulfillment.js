"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaidFulfillmentChain = getPaidFulfillmentChain;
exports.getDefaultFulfillmentState = getDefaultFulfillmentState;
exports.getFulfillmentStatusLabel = getFulfillmentStatusLabel;
exports.getFulfillmentGroupLabel = getFulfillmentGroupLabel;
exports.isTerminalFulfillmentStatus = isTerminalFulfillmentStatus;
exports.canTransitionFulfillmentState = canTransitionFulfillmentState;
exports.getOrderStatusLabel = getOrderStatusLabel;
const PAID_FULFILLMENT_CHAINS = {
    delivery: [
        { status: 'pending', label: '待处理', groupLabel: '待处理' },
        { status: 'in_production', label: '制作中', groupLabel: '制作中' },
        { status: 'out_for_delivery', label: '配送中', groupLabel: '配送中' },
        { status: 'completed', label: '已完成', groupLabel: '已完成' }
    ],
    pickup: [
        { status: 'pending', label: '待处理', groupLabel: '待处理' },
        { status: 'in_production', label: '制作中', groupLabel: '制作中' },
        { status: 'ready_for_pickup', label: '待自取', groupLabel: '待自取' },
        { status: 'completed', label: '已完成', groupLabel: '已完成' }
    ],
    express: [
        { status: 'pending', label: '待处理', groupLabel: '待处理' },
        { status: 'in_production', label: '制作中', groupLabel: '制作中' },
        { status: 'ready_to_ship', label: '待发货', groupLabel: '待发货' },
        { status: 'completed', label: '已完成', groupLabel: '已完成' }
    ]
};
const TERMINAL_FULFILLMENT_STATUSES = ['completed', 'cancelled'];
function getFulfillmentStepsForMode(mode) {
    return PAID_FULFILLMENT_CHAINS[mode];
}
function getFulfillmentStep(mode, status) {
    if (status === 'cancelled') {
        return {
            status,
            label: '已取消',
            groupLabel: '已取消'
        };
    }
    return getFulfillmentStepsForMode(mode).find((item) => item.status === status);
}
function getPaidFulfillmentChain(mode) {
    return getFulfillmentStepsForMode(mode).map((item) => ({ ...item }));
}
function getDefaultFulfillmentState(mode) {
    return {
        mode,
        status: getFulfillmentStepsForMode(mode)[0].status
    };
}
function getFulfillmentStatusLabel(mode, status) {
    var _a, _b;
    return (_b = (_a = getFulfillmentStep(mode, status)) === null || _a === void 0 ? void 0 : _a.label) !== null && _b !== void 0 ? _b : '状态未知';
}
function getFulfillmentGroupLabel(mode, status) {
    var _a, _b;
    return (_b = (_a = getFulfillmentStep(mode, status)) === null || _a === void 0 ? void 0 : _a.groupLabel) !== null && _b !== void 0 ? _b : '状态未知';
}
function isTerminalFulfillmentStatus(status) {
    return TERMINAL_FULFILLMENT_STATUSES.includes(status);
}
function canTransitionFulfillmentState(input) {
    const currentStep = getFulfillmentStep(input.mode, input.currentStatus);
    const nextStep = getFulfillmentStep(input.mode, input.nextStatus);
    if (!currentStep || !nextStep) {
        return false;
    }
    if (input.currentStatus === input.nextStatus) {
        return true;
    }
    return !isTerminalFulfillmentStatus(input.currentStatus);
}
function getOrderStatusLabel(order) {
    var _a;
    if (order.status !== 'paid') {
        if (order.status === 'pending_payment') {
            return '待付款';
        }
        if (order.status === 'payment_processing') {
            return '支付处理中';
        }
        if (order.status === 'payment_failed') {
            return '支付失败';
        }
        return '已取消';
    }
    if (!order.fulfillmentState) {
        return '已支付';
    }
    const mode = order.fulfillmentState.mode;
    const status = (_a = order.fulfillmentState.status) !== null && _a !== void 0 ? _a : getDefaultFulfillmentState(mode).status;
    return getFulfillmentStatusLabel(mode, status);
}
