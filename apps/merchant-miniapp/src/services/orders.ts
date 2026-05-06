declare const wx: any;

import type {
  OrderFulfillmentMode,
  OrderFulfillmentStatus,
  OrderManualSettlementMethod,
  OrderRecord,
  OrderStatus,
  PaymentMethod
} from '@xiaipet/shared';
import {
  getDefaultFulfillmentState,
  getFulfillmentGroupLabel,
  getFulfillmentStatusLabel,
  getPaidFulfillmentChain,
  isTerminalFulfillmentStatus
} from '../shared/order-fulfillment';

import { verifyMerchantAccess } from './access';

export interface MerchantOrderTimelineEntry {
  type: 'created' | 'payment' | 'manual_settlement' | 'fulfillment' | 'cancelled' | 'print';
  label: string;
  at: string;
  detail?: string;
  operator?: {
    id: string;
    name: string;
  };
  fromStatus?: string;
  toStatus?: string;
}

export interface MerchantManagedOrderRecord extends OrderRecord {
  merchantTimeline?: MerchantOrderTimelineEntry[];
}

export interface MerchantOrderQueryGroup {
  groupLabel: string;
  orders: MerchantManagedOrderRecord[];
}

export interface MerchantOrderCardViewModel {
  id: string;
  orderIdLabel: string;
  statusLabel: string;
  secondaryBadgeLabel: string | null;
  fulfillmentLabel: string;
  updatedAtLabel: string;
  scheduleLabel: string;
  customerLabel: string;
  itemSummary: string;
  payableTotalLabel: string;
}

export interface MerchantOrderGroupViewModel {
  groupLabel: string;
  countLabel: string;
  orders: MerchantOrderCardViewModel[];
}

export interface MerchantOrdersPageViewModel {
  isEmpty: boolean;
  groups: MerchantOrderGroupViewModel[];
}

export interface MerchantOrderStatusOption {
  value: OrderFulfillmentStatus | 'cancelled';
  label: string;
  kind: 'fulfillment' | 'cancel';
}

export interface MerchantOrderDetailItemViewModel {
  name: string;
  specLabel: string;
  quantityLabel: string;
  lineTotalLabel: string;
}

export interface MerchantOrderTimelineViewModel {
  label: string;
  atLabel: string;
  operatorLabel: string;
  detailLabel: string;
  transitionLabel: string;
}

export interface MerchantOrderAuditSummaryViewModel {
  latestActionLabel: string;
  latestOperatorLabel: string;
  latestAtLabel: string;
  latestNoteLabel: string;
}

export interface MerchantOrderDetailViewModel {
  id: string;
  orderIdLabel: string;
  statusLabel: string;
  paymentBadgeLabel: string | null;
  createdAtLabel: string;
  fulfillmentLabel: string;
  scheduleLabel: string;
  addressLabel: string;
  contactLabel: string;
  customerLabel: string;
  paymentMethodLabel: string;
  remark: string;
  itemsSubtotalLabel: string;
  deliveryFeeLabel: string;
  payableTotalLabel: string;
  items: MerchantOrderDetailItemViewModel[];
  auditSummary: MerchantOrderAuditSummaryViewModel;
  timeline: MerchantOrderTimelineViewModel[];
  canPrintReceipt: boolean;
  printActionLabel: string;
  receiptPrintCountLabel: string;
  receiptPrintStatusLabel: string;
  canUpdateStatus: boolean;
  actionLabel: string;
  requiresManualSettlement: boolean;
  statusOptions: MerchantOrderStatusOption[];
}

export interface MerchantOrderDetailResponse {
  order: MerchantManagedOrderRecord;
  timeline: MerchantOrderTimelineEntry[];
}

export interface UpdateMerchantOrderStatusInput {
  order: MerchantManagedOrderRecord;
  nextStatus: OrderFulfillmentStatus | 'cancelled';
  adjustmentMethod?: OrderManualSettlementMethod;
  reasonNote?: string;
}

interface MerchantAccessResult {
  allowed?: boolean;
  merchant?: {
    merchantId: string;
    storeName: string;
  };
  result?: MerchantAccessResult;
}

function getCloudCaller() {
  return (payload: Record<string, unknown>) => wx.cloud.callFunction(payload);
}

function formatMoney(value: number) {
  return `￥${value.toFixed(2)}`;
}

function formatDateTime(value: string) {
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

function getPaymentMethodLabel(paymentMethod: PaymentMethod) {
  return paymentMethod === 'balance' ? '余额支付' : '微信支付';
}

function getFulfillmentModeLabel(mode: OrderFulfillmentMode) {
  if (mode === 'pickup') {
    return '到店自取';
  }

  if (mode === 'express') {
    return '快递发货';
  }

  return '配送到家';
}

function getReservationLabel(order: MerchantManagedOrderRecord) {
  const reservation = order.snapshot.fulfillment.reservation;

  if (!reservation) {
    return '待确认履约时间';
  }

  return `${reservation.dateLabel} ${reservation.timeLabel}`;
}

function getAddressLabel(order: MerchantManagedOrderRecord) {
  const { fulfillment } = order.snapshot;

  if (fulfillment.address) {
    return `${fulfillment.address.regionLabel} ${fulfillment.address.detailAddress}`;
  }

  return fulfillment.store.address;
}

function getContactLabel(order: MerchantManagedOrderRecord) {
  const { fulfillment } = order.snapshot;

  if (fulfillment.address) {
    return `${fulfillment.address.recipientName} ${fulfillment.address.phoneNumber}`;
  }

  if (fulfillment.pickupPhone) {
    return `预留电话 ${fulfillment.pickupPhone}`;
  }

  return fulfillment.store.name;
}

function getCustomerLabel(order: MerchantManagedOrderRecord) {
  const { fulfillment } = order.snapshot;

  if (fulfillment.address?.recipientName) {
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

function getItemSummary(order: MerchantManagedOrderRecord) {
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

function getProgressStatus(order: MerchantManagedOrderRecord) {
  if (order.status === 'cancelled') {
    return 'cancelled';
  }

  return order.fulfillmentState?.status ?? getDefaultFulfillmentState(order.snapshot.fulfillment.mode).status;
}

function getProgressStatusLabel(order: MerchantManagedOrderRecord) {
  if (order.status === 'cancelled') {
    return '已取消';
  }

  return getFulfillmentStatusLabel(order.snapshot.fulfillment.mode, getProgressStatus(order));
}

function getProgressGroupLabel(order: MerchantManagedOrderRecord) {
  if (order.status === 'cancelled') {
    return '已取消';
  }

  return getFulfillmentGroupLabel(order.snapshot.fulfillment.mode, getProgressStatus(order));
}

function getSecondaryBadgeLabel(order: MerchantManagedOrderRecord) {
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

function compareOrders(left: MerchantManagedOrderRecord, right: MerchantManagedOrderRecord) {
  const updatedAtDiff = new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();

  if (updatedAtDiff !== 0) {
    return updatedAtDiff;
  }

  return right.id.localeCompare(left.id);
}

function toCard(order: MerchantManagedOrderRecord): MerchantOrderCardViewModel {
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

function toDetailItems(order: MerchantManagedOrderRecord) {
  return order.snapshot.items.map((item) => ({
    name: item.name,
    specLabel: item.specLabel,
    quantityLabel: `x${item.quantity}`,
    lineTotalLabel: formatMoney(item.lineTotal)
  }));
}

function toTimelineViewModel(entry: MerchantOrderTimelineEntry): MerchantOrderTimelineViewModel {
  return {
    label: entry.label,
    atLabel: formatDateTime(entry.at),
    operatorLabel: entry.operator?.name ?? '系统',
    detailLabel: entry.detail ?? '无备注',
    transitionLabel:
      entry.fromStatus && entry.toStatus ? `${entry.fromStatus} → ${entry.toStatus}` : '状态记录'
  };
}

function getAuditSummary(timeline: MerchantOrderTimelineEntry[]): MerchantOrderAuditSummaryViewModel {
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
    latestOperatorLabel: latest.operator?.name ?? '系统',
    latestAtLabel: formatDateTime(latest.at),
    latestNoteLabel: latest.detail ?? '无备注'
  };
}

function getReceiptPrintCountLabel(order: MerchantManagedOrderRecord) {
  const printCount = order.receiptPrint?.printCount ?? 0;

  if (printCount <= 0) {
    return '尚未打印';
  }

  return `已打印 ${printCount} 次`;
}

function getReceiptPrintStatusLabel(order: MerchantManagedOrderRecord) {
  const metadata = order.receiptPrint;

  if (!metadata?.lastPrintResult) {
    return '等待首次打印';
  }

  const resultLabel = metadata.lastPrintResult === 'success' ? '最近打印成功' : '最近打印失败';
  const timeLabel = metadata.lastPrintedAt ? formatDateTime(metadata.lastPrintedAt) : '时间未知';
  const printerLabel = metadata.lastPrinterDeviceLabel ? ` · ${metadata.lastPrinterDeviceLabel}` : '';

  return `${resultLabel} · ${timeLabel}${printerLabel}`;
}

function isTerminalOrder(order: MerchantManagedOrderRecord) {
  return order.status === 'cancelled' || isTerminalFulfillmentStatus(getProgressStatus(order));
}

function createStatusOptions(order: MerchantManagedOrderRecord): MerchantOrderStatusOption[] {
  if (isTerminalOrder(order)) {
    return [];
  }

  const currentStatus = getProgressStatus(order);
  const options: MerchantOrderStatusOption[] = getPaidFulfillmentChain(order.snapshot.fulfillment.mode)
    .filter((item) => (order.status === 'paid' ? item.status !== currentStatus : true))
    .map((item) => ({
      value: item.status,
      label: item.label,
      kind: 'fulfillment' as const
    }));

  options.push({
    value: 'cancelled',
    label: '已取消',
    kind: 'cancel'
  });

  return options;
}

async function resolveMerchantOperator(accessVerifier: () => Promise<MerchantAccessResult>) {
  const response = await accessVerifier();
  const access: MerchantAccessResult = response.result ?? response;

  if (!access.allowed || !access.merchant?.merchantId || !access.merchant.storeName) {
    throw new Error('MERCHANT_FORBIDDEN');
  }

  return {
    id: access.merchant.merchantId,
    name: access.merchant.storeName
  };
}

export async function queryMerchantOrders(callFunction = getCloudCaller()) {
  const response = (await callFunction({
    name: 'queryMerchantOrders',
    data: {}
  })) as {
    result: {
      ok?: boolean;
      groups?: MerchantOrderQueryGroup[];
    };
  };

  return response.result.groups ?? [];
}

export function getMerchantOrdersPageViewModel(groups: MerchantOrderQueryGroup[]): MerchantOrdersPageViewModel {
  const grouped = groups
    .flatMap((group) => group.orders)
    .sort(compareOrders)
    .reduce<MerchantOrderGroupViewModel[]>((result, order) => {
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

export async function getMerchantOrderDetail(orderId: string, callFunction = getCloudCaller()) {
  const response = (await callFunction({
    name: 'getMerchantOrderDetail',
    data: {
      orderId
    }
  })) as {
    result: MerchantOrderDetailResponse & { ok?: boolean };
  };

  return {
    order: response.result.order,
    timeline: response.result.timeline ?? []
  };
}

export function getMerchantOrderDetailViewModel(detail: MerchantOrderDetailResponse | null) {
  if (!detail?.order) {
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
    printActionLabel: (order.receiptPrint?.printCount ?? 0) > 0 ? '补打小票' : '打印小票',
    receiptPrintCountLabel: getReceiptPrintCountLabel(order),
    receiptPrintStatusLabel: getReceiptPrintStatusLabel(order),
    canUpdateStatus: !isTerminalOrder(order),
    actionLabel: order.status === 'paid' ? '更新订单状态' : '标记已支付/已处理',
    requiresManualSettlement: order.status !== 'paid',
    statusOptions: createStatusOptions(order)
  } satisfies MerchantOrderDetailViewModel;
}

export async function updateMerchantOrderStatus(
  input: UpdateMerchantOrderStatusInput,
  callFunction = getCloudCaller(),
  accessVerifier = verifyMerchantAccess
) {
  const operator = await resolveMerchantOperator(accessVerifier);
  const data: {
    orderId: string;
    nextOrderStatus?: OrderStatus;
    nextFulfillmentStatus?: OrderFulfillmentStatus;
    adjustmentMethod?: OrderManualSettlementMethod;
    reasonNote?: string;
    operator: {
      id: string;
      name: string;
    };
  } = {
    orderId: input.order.id,
    operator
  };

  if (input.nextStatus === 'cancelled') {
    data.nextOrderStatus = 'cancelled';
  } else if (input.order.status !== 'paid') {
    data.nextOrderStatus = 'paid';
    data.nextFulfillmentStatus = input.nextStatus;
    data.adjustmentMethod = input.adjustmentMethod;
    data.reasonNote = input.reasonNote;
  } else {
    data.nextFulfillmentStatus = input.nextStatus;
  }

  const response = (await callFunction({
    name: 'updateMerchantOrderStatus',
    data
  })) as {
    result: {
      ok?: boolean;
      order: MerchantManagedOrderRecord;
    };
  };

  return response.result.order;
}
