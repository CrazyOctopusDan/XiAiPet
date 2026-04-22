"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaidFulfillmentChain = getPaidFulfillmentChain;
exports.getDefaultFulfillmentState = getDefaultFulfillmentState;
exports.getFulfillmentStatusLabel = getFulfillmentStatusLabel;
exports.getFulfillmentGroupLabel = getFulfillmentGroupLabel;
exports.isTerminalFulfillmentStatus = isTerminalFulfillmentStatus;
exports.canTransitionFulfillmentState = canTransitionFulfillmentState;
exports.createManualSettlementRecord = createManualSettlementRecord;
exports.getOrderStatusDescriptor = getOrderStatusDescriptor;
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
const UNPAID_STATUS_LABELS = {
    pending_payment: {
        code: 'pending_payment',
        label: '待付款',
        groupLabel: '待付款'
    },
    payment_processing: {
        code: 'payment_processing',
        label: '支付处理中',
        groupLabel: '支付处理中'
    },
    payment_failed: {
        code: 'payment_failed',
        label: '支付失败',
        groupLabel: '支付失败'
    },
    cancelled: {
        code: 'cancelled',
        label: '已取消',
        groupLabel: '已取消'
    }
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
    return getFulfillmentStep(mode, status)?.label ?? '状态未知';
}
function getFulfillmentGroupLabel(mode, status) {
    return getFulfillmentStep(mode, status)?.groupLabel ?? '状态未知';
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
function createManualSettlementRecord(record) {
    return {
        ...record
    };
}
function getOrderStatusDescriptor(order) {
    if (order.status !== 'paid') {
        return UNPAID_STATUS_LABELS[order.status];
    }
    if (!order.fulfillmentState) {
        return {
            code: 'paid',
            label: '已支付',
            groupLabel: '已支付'
        };
    }
    const mode = order.fulfillmentState.mode;
    const status = order.fulfillmentState.status ?? getDefaultFulfillmentState(mode).status;
    return {
        code: status,
        label: getFulfillmentStatusLabel(mode, status),
        groupLabel: getFulfillmentGroupLabel(mode, status)
    };
}
function getOrderStatusLabel(order) {
    return getOrderStatusDescriptor(order).label;
}
