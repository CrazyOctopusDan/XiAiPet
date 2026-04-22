declare const wx: any;

import type { GetMyOrderDetailResult, OrderFulfillmentMode, OrderRecord, PaymentMethod, QueryMyOrdersResult } from '@xiaipet/shared';
import { getOrderStatusLabel } from '../shared/order-runtime';

export interface OrderCardViewModel {
  id: string;
  statusLabel: string;
  createdAtLabel: string;
  fulfillmentLabel: string;
  scheduleLabel: string;
  itemSummary: string;
  petNamesLabel: string;
  payableTotalLabel: string;
}

export interface OrdersPageViewModel {
  isEmpty: boolean;
  highlightedOrderId: string | null;
  cards: OrderCardViewModel[];
}

export interface OrderDetailItemViewModel {
  name: string;
  specLabel: string;
  quantityLabel: string;
  lineTotalLabel: string;
}

export interface OrderDetailViewModel {
  id: string;
  statusLabel: string;
  createdAtLabel: string;
  fulfillmentLabel: string;
  scheduleLabel: string;
  addressLabel: string;
  contactLabel: string;
  petNamesLabel: string;
  paymentMethodLabel: string;
  remark: string;
  itemsSubtotalLabel: string;
  deliveryFeeLabel: string;
  payableTotalLabel: string;
  items: OrderDetailItemViewModel[];
}

function getCloudCaller() {
  return (payload: Record<string, unknown>) => wx.cloud.callFunction(payload);
}

function sortOrders(list: OrderRecord[]) {
  return [...list].sort((left, right) => {
    const createdAtDiff = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();

    if (createdAtDiff !== 0) {
      return createdAtDiff;
    }

    return right.id.localeCompare(left.id);
  });
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

function getFulfillmentLabel(mode: OrderFulfillmentMode) {
  if (mode === 'pickup') {
    return '到店自取';
  }

  if (mode === 'express') {
    return '快递发货';
  }

  return '配送到家';
}

function getScheduleLabel(order: OrderRecord) {
  const reservation = order.snapshot.fulfillment.reservation;

  if (!reservation) {
    return '待确认履约时间';
  }

  return `${reservation.dateLabel} ${reservation.timeLabel}`;
}

function getAddressLabel(order: OrderRecord) {
  const { fulfillment } = order.snapshot;

  if (fulfillment.address) {
    return `${fulfillment.address.regionLabel} ${fulfillment.address.detailAddress}`;
  }

  return fulfillment.store.address;
}

function getContactLabel(order: OrderRecord) {
  const { fulfillment } = order.snapshot;

  if (fulfillment.address) {
    return `${fulfillment.address.recipientName} ${fulfillment.address.phoneNumber}`;
  }

  if (fulfillment.pickupPhone) {
    return `预留电话 ${fulfillment.pickupPhone}`;
  }

  return fulfillment.store.name;
}

function getItemSummary(order: OrderRecord) {
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

function getPetNamesLabel(order: OrderRecord) {
  if (!order.snapshot.pets.length) {
    return '未选择宠物';
  }

  return order.snapshot.pets.map((item) => item.name).join('、');
}

function toOrderCard(order: OrderRecord): OrderCardViewModel {
  return {
    id: order.id,
    statusLabel: getOrderStatusLabel(order),
    createdAtLabel: formatDateTime(order.createdAt),
    fulfillmentLabel: getFulfillmentLabel(order.snapshot.fulfillment.mode),
    scheduleLabel: getScheduleLabel(order),
    itemSummary: getItemSummary(order),
    petNamesLabel: getPetNamesLabel(order),
    payableTotalLabel: formatMoney(order.pricing.payableTotal)
  };
}

export async function queryMyOrders(callFunction = getCloudCaller()) {
  const response = (await callFunction({
    name: 'queryMyOrders',
    data: {}
  })) as {
    result: QueryMyOrdersResult & { ok?: boolean };
  };

  return response.result.orders ?? [];
}

export async function getMyOrderDetail(orderId: string, callFunction = getCloudCaller()) {
  const response = (await callFunction({
    name: 'getMyOrderDetail',
    data: {
      orderId
    }
  })) as {
    result: GetMyOrderDetailResult & { ok?: boolean };
  };

  return response.result.order;
}

export function getOrdersPageViewModel(orders: OrderRecord[], highlightOrderId?: string | null): OrdersPageViewModel {
  const cards = sortOrders(orders).map(toOrderCard);
  const highlightedOrderId =
    cards.find((item) => item.id === highlightOrderId)?.id ?? cards[0]?.id ?? null;

  return {
    isEmpty: cards.length === 0,
    highlightedOrderId,
    cards
  };
}

export function getOrderDetailViewModel(order: OrderRecord | null) {
  if (!order) {
    return null;
  }

  return {
    id: order.id,
    statusLabel: getOrderStatusLabel(order),
    createdAtLabel: formatDateTime(order.createdAt),
    fulfillmentLabel: getFulfillmentLabel(order.snapshot.fulfillment.mode),
    scheduleLabel: getScheduleLabel(order),
    addressLabel: getAddressLabel(order),
    contactLabel: getContactLabel(order),
    petNamesLabel: getPetNamesLabel(order),
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
