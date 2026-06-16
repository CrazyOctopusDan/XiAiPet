export type PaymentMethod = 'wechat' | 'balance';
export type OrderStatus = 'pending_payment' | 'payment_processing' | 'paid' | 'payment_failed' | 'cancelled';
export type OrderFulfillmentMode = 'delivery' | 'pickup' | 'express';
export type OrderPaymentStatus = 'pending' | 'processing' | 'paid' | 'failed';
export type OrderFulfillmentStatus =
  | 'pending'
  | 'in_production'
  | 'out_for_delivery'
  | 'ready_for_pickup'
  | 'ready_to_ship'
  | 'completed'
  | 'cancelled';
export type OrderManualSettlementMethod = 'offline_collection' | 'manual_override';

export interface OrderAddressSnapshot {
  id?: string;
  recipientName: string;
  phoneNumber: string;
  regionLabel: string;
  detailAddress: string;
  tag: string;
  latitude?: number;
  longitude?: number;
}

export interface OrderReservationSnapshot {
  dateValue: string;
  dateLabel: string;
  timeValue: string;
  timeLabel: string;
}

export interface OrderStoreSnapshot {
  name: string;
  address: string;
}

export interface OrderFulfillmentSnapshot {
  mode: OrderFulfillmentMode;
  address?: OrderAddressSnapshot;
  contactPhone?: string;
  pickupPhone?: string;
  reservation?: OrderReservationSnapshot;
  store: OrderStoreSnapshot;
}

export interface OrderItemSnapshotInput {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  specId: string;
  specLabel: string;
}

export interface OrderItemSnapshot extends OrderItemSnapshotInput {
  lineTotal: number;
}

export interface OrderPetSnapshot {
  id: string;
  name: string;
  gender?: 'female' | 'male' | 'unknown';
  birthday?: string;
  allergyNotes?: string;
}

export interface OrderPricingBreakdown {
  itemsSubtotal: number;
  deliveryFee: number;
  payableTotal: number;
}

export interface CreateOrderPayload {
  idempotencyKey: string;
  paymentMethod: PaymentMethod;
  fulfillment: OrderFulfillmentSnapshot;
  items: OrderItemSnapshot[];
  pets: OrderPetSnapshot[];
  remark: string;
  hasReadCustomNotice: boolean;
  pricing: OrderPricingBreakdown;
  selectedGiftIds?: string[];
}

export interface OrderSnapshot {
  fulfillment: OrderFulfillmentSnapshot;
  items: OrderItemSnapshot[];
  pets: OrderPetSnapshot[];
  remark: string;
}

export interface OrderPaymentRecord {
  method: PaymentMethod;
  status: OrderPaymentStatus;
  outTradeNo?: string;
  prepayId?: string;
  transactionId?: string;
  failureCode?: string;
  failureMessage?: string;
}

export interface OrderFulfillmentState {
  mode: OrderFulfillmentMode;
  status: OrderFulfillmentStatus;
  updatedAt?: string;
}

export interface OrderMerchantOperator {
  id: string;
  name: string;
}

export interface OrderStatusAuditSnapshot {
  orderStatus: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  fulfillmentStatus?: OrderFulfillmentStatus;
}

export interface OrderManualSettlementRecord {
  method: OrderManualSettlementMethod;
  reasonNote: string;
  operator: OrderMerchantOperator;
  before: OrderStatusAuditSnapshot;
  after: OrderStatusAuditSnapshot;
  settledAt: string;
}

export interface OrderMerchantOverride {
  manualSettlement?: OrderManualSettlementRecord;
}

export type OrderReceiptPrintResult = 'success' | 'failed';

export interface OrderReceiptPrintMetadata {
  printCount: number;
  lastPrintedAt?: string;
  lastPrintResult?: OrderReceiptPrintResult;
  lastPrinterDeviceLabel?: string;
  receiptTemplateVersion: string;
}

export interface OrderReceiptPrintAuditPayload {
  orderId: string;
  operator: OrderMerchantOperator;
  printedAt: string;
  printerDeviceId: string;
  printerDeviceLabel: string;
  receiptTemplateVersion: string;
  result: OrderReceiptPrintResult;
  failureReason?: string;
  isReprint: boolean;
}

export interface OrderReceiptPrintJob {
  orderId: string;
  printJobId: string;
  receiptTemplateVersion: string;
  isReprint: boolean;
  nextPrintCount: number;
  chunksBase64: string[];
  previewLines: string[];
}

export interface OrderRecord {
  id: string;
  openid: string;
  status: OrderStatus;
  idempotencyKey?: string;
  paymentMethod: PaymentMethod;
  payment?: OrderPaymentRecord;
  fulfillmentState?: OrderFulfillmentState;
  merchantOverride?: OrderMerchantOverride;
  receiptPrint?: OrderReceiptPrintMetadata;
  pricing: OrderPricingBreakdown;
  snapshot: OrderSnapshot;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  cancelledAt?: string;
}

export interface QueryMyOrdersResult {
  orders: OrderRecord[];
  pageInfo?: {
    hasMore: boolean;
    nextCursor: string | null;
    limit: number;
  };
}

export interface GetMyOrderDetailResult {
  order: OrderRecord;
}

export { getOrderStatusDescriptor, getOrderStatusLabel } from '../rules/order-fulfillment';
