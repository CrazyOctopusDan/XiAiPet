import type {
  GetMyOrderDetailResult,
  OrderFulfillmentMode,
  OrderFulfillmentStatus,
  OrderRecord,
  PaymentMethod,
  QueryMyOrdersResult
} from '@xiaipet/shared';
import { getOrderStatusLabel } from '../shared/order-runtime';

import { customerApiRequest, type CustomerApiRequester } from './api-client';

export interface OrderCardViewModel {
  id: string;
  statusGroup: OrderStatusGroup;
  statusTone: OrderStatusTone;
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
  activeStatusGroup: OrderStatusGroup;
  tabs: OrderStatusTabViewModel[];
  cards: OrderCardViewModel[];
}

export type OrderStatusGroup = 'all' | 'pending' | 'active' | 'completed';
export type OrderStatusTone = 'payment' | 'pending' | 'work' | 'ready' | 'delivery' | 'completed' | 'cancelled';

export interface OrderStatusTabViewModel {
  value: OrderStatusGroup;
  label: string;
  count: number;
  active: boolean;
}

export interface QueryMyOrdersOptions {
  statusGroup?: OrderStatusGroup;
  limit?: number;
  cursor?: string | null;
}

export interface OrderPageInfo {
  hasMore: boolean;
  nextCursor: string | null;
  limit: number;
}

export interface QueryMyOrdersPage {
  orders: OrderRecord[];
  pageInfo: OrderPageInfo;
}

export interface OrderDetailItemViewModel {
  name: string;
  specLabel: string;
  quantityLabel: string;
  lineTotalLabel: string;
}

export interface OrderDetailPetViewModel {
  name: string;
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
  hasPets: boolean;
  pets: OrderDetailPetViewModel[];
  paymentMethodLabel: string;
  remark: string;
  itemsSubtotalLabel: string;
  deliveryFeeLabel: string;
  payableTotalLabel: string;
  items: OrderDetailItemViewModel[];
}

type BackendOrderRecord = OrderRecord & {
  fulfillmentMode?: OrderFulfillmentMode;
  fulfillmentStatus?: OrderFulfillmentStatus;
};

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

function getPetRows(order: OrderRecord): OrderDetailPetViewModel[] {
  return order.snapshot.pets.map((item) => ({
    name: item.name
  }));
}

function toOrderCard(order: OrderRecord): OrderCardViewModel {
  return {
    id: order.id,
    statusGroup: getOrderStatusGroup(order),
    statusTone: getOrderStatusTone(order),
    statusLabel: getOrderStatusLabel(order),
    createdAtLabel: formatDateTime(order.createdAt),
    fulfillmentLabel: getFulfillmentLabel(order.snapshot.fulfillment.mode),
    scheduleLabel: getScheduleLabel(order),
    itemSummary: getItemSummary(order),
    petNamesLabel: getPetNamesLabel(order),
    payableTotalLabel: formatMoney(order.pricing.payableTotal)
  };
}

export function getOrderStatusGroup(order: OrderRecord): OrderStatusGroup {
  if (order.status !== 'paid') {
    return 'pending';
  }

  const status = order.fulfillmentState?.status;

  if (status === 'completed') {
    return 'completed';
  }

  if (status === 'in_production' || status === 'out_for_delivery' || status === 'ready_for_pickup' || status === 'ready_to_ship') {
    return 'active';
  }

  return 'pending';
}

export function getOrderStatusTone(order: OrderRecord): OrderStatusTone {
  if (order.status === 'cancelled' || order.fulfillmentState?.status === 'cancelled') {
    return 'cancelled';
  }

  if (order.status !== 'paid') {
    return 'payment';
  }

  const status = order.fulfillmentState?.status;

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
  ] satisfies Array<{ value: OrderStatusGroup; label: string }>;
}

export function getOrderStatusTabs(orders: OrderRecord[], activeStatusGroup: OrderStatusGroup = 'all'): OrderStatusTabViewModel[] {
  return getOrderStatusTabDefinitions().map((tab) => ({
    ...tab,
    count: tab.value === 'all' ? orders.length : orders.filter((order) => getOrderStatusGroup(order) === tab.value).length,
    active: tab.value === activeStatusGroup
  }));
}

function normalizeOrder(order: OrderRecord): OrderRecord {
  const backendOrder = order as BackendOrderRecord;

  if (order.fulfillmentState || !backendOrder.fulfillmentStatus) {
    return order;
  }

  return {
    ...order,
    fulfillmentState: {
      mode: backendOrder.fulfillmentMode ?? order.snapshot.fulfillment.mode,
      status: backendOrder.fulfillmentStatus,
      updatedAt: order.updatedAt
    }
  };
}

function resolveQueryMyOrdersArgs(
  optionsOrRequest?: QueryMyOrdersOptions | CustomerApiRequester,
  maybeRequest?: CustomerApiRequester
) {
  if (typeof optionsOrRequest === 'function') {
    return {
      options: {},
      request: optionsOrRequest
    };
  }

  return {
    options: optionsOrRequest ?? {},
    request: maybeRequest ?? customerApiRequest
  };
}

export async function queryMyOrders(
  optionsOrRequest?: QueryMyOrdersOptions | CustomerApiRequester,
  maybeRequest?: CustomerApiRequester
) {
  const { options, request } = resolveQueryMyOrdersArgs(optionsOrRequest, maybeRequest);
  const response = await request<QueryMyOrdersResult & { ok?: boolean }>('/api/v1/customer/orders', {
    method: 'GET',
    auth: 'customer',
    query: {
      statusGroup: options.statusGroup ?? 'all',
      limit: options.limit ?? 20,
      cursor: options.cursor ?? undefined
    }
  });

  return {
    orders: (response.orders ?? []).map(normalizeOrder),
    pageInfo: {
      hasMore: Boolean(response.pageInfo?.hasMore),
      nextCursor: typeof response.pageInfo?.nextCursor === 'string' && response.pageInfo.nextCursor
        ? response.pageInfo.nextCursor
        : null,
      limit: typeof response.pageInfo?.limit === 'number' ? response.pageInfo.limit : options.limit ?? 20
    }
  };
}

export async function getMyOrderDetail(orderId: string, request: CustomerApiRequester = customerApiRequest) {
  const response = await request<GetMyOrderDetailResult & { ok?: boolean }>(
    `/api/v1/customer/orders/${orderId}`,
    {
      method: 'GET',
      auth: 'customer'
    }
  );

  return response.order ? normalizeOrder(response.order) : response.order;
}

export function getOrdersPageViewModel(
  orders: OrderRecord[],
  highlightOrderId?: string | null,
  activeStatusGroup: OrderStatusGroup = 'all'
): OrdersPageViewModel {
  const filteredOrders = activeStatusGroup === 'all'
    ? orders
    : orders.filter((order) => getOrderStatusGroup(order) === activeStatusGroup);
  const cards = sortOrders(filteredOrders).map(toOrderCard);
  const highlightedOrderId =
    cards.find((item) => item.id === highlightOrderId)?.id ?? cards[0]?.id ?? null;

  return {
    isEmpty: cards.length === 0,
    highlightedOrderId,
    activeStatusGroup,
    tabs: getOrderStatusTabs(orders, activeStatusGroup),
    cards
  };
}

export function getOrderDetailViewModel(order: OrderRecord | null) {
  if (!order) {
    return null;
  }

  const pets = getPetRows(order);

  return {
    id: order.id,
    statusLabel: getOrderStatusLabel(order),
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
