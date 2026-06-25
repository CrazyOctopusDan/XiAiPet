import type { PrismaClient } from '@prisma/client';

import { createCatalogRepository } from '../catalog/repository';
import { createCatalogService } from '../catalog/service';
import {
  createOrderRepository,
  type CustomerOrderListFilters,
  type CreateOrderInput,
  type MerchantOrderListFilters,
  type OrderRecord
} from './repository';
import { getPrismaClient } from '../../db/prisma';
import { ApiError } from '../../lib/errors';
import type { MerchantContext } from '../auth/types';
import type { PaymentProvider } from '../payments/provider';
import { createMockPaymentProvider, createOrderPaymentSubject } from '../payments/provider';
import { createBalanceService } from '../users/balance-service';
import { createPaymentRepository } from '../payments/repository';
import { createRuntimeConfigRepository, type RuntimeConfigSectionRecord } from '../runtime-config/repository';
import { createGiftService, type LockedGiftSnapshot } from '../gifts/service';
import {
  assertOrderGiftsLockedForSettlement,
  markOrderPaidAndRedeemGifts,
  recordOrderPaymentAndSettle,
  runOrderSettlementTransaction
} from './settlement';

interface CustomerOrderPayload {
  id?: string;
  idempotencyKey?: string;
  paymentMethod?: 'wechat' | 'balance';
  fulfillmentMode?: 'delivery' | 'pickup' | 'express';
  itemsSubtotal?: number;
  deliveryFee?: number;
  payableTotal?: number;
  fulfillment?: {
    mode?: 'delivery' | 'pickup' | 'express';
    address?: {
      latitude?: unknown;
      longitude?: unknown;
    };
  };
  pricing?: {
    itemsSubtotal?: number;
    deliveryFee?: number;
    payableTotal?: number;
  };
  items?: unknown[];
  selectedGiftIds?: unknown;
}

interface StoreCoordinateSnapshot {
  latitude: number;
  longitude: number;
}

interface DeliveryRuleTierRow {
  distanceKm: number;
  minimumOrderAmount: number | null;
  deliveryFee: number;
  explainer: string;
}

const DEFAULT_STORE_COORDINATES: StoreCoordinateSnapshot = {
  latitude: 31.22911,
  longitude: 121.44853
};

const EARTH_RADIUS_KM = 6371;
const DEFAULT_DELIVERY_RULE_ROWS: DeliveryRuleTierRow[] = [
  { distanceKm: 5, minimumOrderAmount: 98, deliveryFee: 0, explainer: '5.0 公里内 98 元起送，配送费 0 元' },
  { distanceKm: 10, minimumOrderAmount: 98, deliveryFee: 15, explainer: '10.0 公里内 98 元起送，配送费 15 元' },
  { distanceKm: 15, minimumOrderAmount: null, deliveryFee: 25, explainer: '15.0 公里内，配送费 25 元' },
  { distanceKm: 20, minimumOrderAmount: null, deliveryFee: 40, explainer: '20.0 公里内，配送费 40 元' },
  { distanceKm: 25, minimumOrderAmount: null, deliveryFee: 50, explainer: '25.0 公里内，配送费 50 元' },
  { distanceKm: 30, minimumOrderAmount: null, deliveryFee: 60, explainer: '30.0 公里内，配送费 60 元' },
  { distanceKm: 35, minimumOrderAmount: null, deliveryFee: 65, explainer: '35.0 公里内，配送费 65 元' },
  { distanceKm: 40, minimumOrderAmount: null, deliveryFee: 70, explainer: '40.0 公里内，配送费 70 元' },
  { distanceKm: 45, minimumOrderAmount: null, deliveryFee: 75, explainer: '45.0 公里内，配送费 75 元' },
  { distanceKm: 50, minimumOrderAmount: null, deliveryFee: 80, explainer: '50.0 公里内，配送费 80 元' }
];
const ACTIVE_ORDER_AUTO_COMPLETE_DAYS = 15;
const RESERVED_ORDER_ID_PREFIXES = ['recharge-'];

const CUSTOMER_COMPLETABLE_FULFILLMENT_STATUSES: Array<NonNullable<OrderRecord['fulfillmentStatus']>> = [
  'in_production',
  'out_for_delivery',
  'ready_for_pickup',
  'ready_to_ship'
];

interface CustomerOrderItemPayload {
  productId?: unknown;
  name?: unknown;
  quantity?: unknown;
  unitPrice?: unknown;
  specId?: unknown;
  specLabel?: unknown;
  lineTotal?: unknown;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toCents(value: number) {
  return Math.round(value * 100);
}

function toOptionalNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function calculateDistanceKm(from: StoreCoordinateSnapshot, to: { latitude?: number; longitude?: number }) {
  if (to.latitude === undefined || to.longitude === undefined) {
    return null;
  }

  const latDelta = toRadians(to.latitude - from.latitude);
  const lonDelta = toRadians(to.longitude - from.longitude);
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);
  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lonDelta / 2) ** 2;

  return Number((EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))).toFixed(1));
}

function isDeliveryRuleTier(value: unknown): value is DeliveryRuleTierRow {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.distanceKm === 'number' &&
    Number.isFinite(value.distanceKm) &&
    typeof value.deliveryFee === 'number' &&
    Number.isFinite(value.deliveryFee) &&
    (value.minimumOrderAmount === null ||
      (typeof value.minimumOrderAmount === 'number' && Number.isFinite(value.minimumOrderAmount))) &&
    typeof value.explainer === 'string'
  );
}

function normalizeDeliveryRules(value: unknown): DeliveryRuleTierRow[] {
  if (!isObject(value) || !Array.isArray(value.tiers)) {
    return DEFAULT_DELIVERY_RULE_ROWS.map((row) => ({ ...row }));
  }

  const tiers = value.tiers.filter(isDeliveryRuleTier);
  return tiers.length ? tiers.map((row) => ({ ...row })) : DEFAULT_DELIVERY_RULE_ROWS.map((row) => ({ ...row }));
}

function normalizeStoreCoordinates(value: unknown): StoreCoordinateSnapshot {
  if (!isObject(value)) {
    return DEFAULT_STORE_COORDINATES;
  }

  const latitude = toOptionalNumber(value.latitude);
  const longitude = toOptionalNumber(value.longitude);

  return latitude !== undefined && longitude !== undefined
    ? { latitude, longitude }
    : DEFAULT_STORE_COORDINATES;
}

function getRuntimeConfigValue(sections: RuntimeConfigSectionRecord[], sectionId: string) {
  return sections.find((section) => section.sectionId === sectionId)?.value;
}

async function readRuntimeSections(client: PrismaClient, sectionIds: string[]) {
  const runtimeConfigSection = (client as unknown as {
    runtimeConfigSection?: {
      findMany?: unknown;
    };
  }).runtimeConfigSection;

  if (typeof runtimeConfigSection?.findMany !== 'function') {
    return [];
  }

  return createRuntimeConfigRepository(client as never).listSections(sectionIds);
}

function getDeliveryAddress(payload: unknown) {
  const candidate = payload as CustomerOrderPayload;
  const fulfillment = isObject(candidate.fulfillment) ? candidate.fulfillment : null;
  const address = isObject(fulfillment?.address) ? fulfillment.address : null;

  if (!address) {
    return null;
  }

  return {
    latitude: toOptionalNumber(address.latitude),
    longitude: toOptionalNumber(address.longitude)
  };
}

async function assertDeliveryRulesAllowOrder(client: PrismaClient, input: CreateOrderInput, payload: unknown) {
  if (input.fulfillmentMode !== 'delivery') {
    return;
  }

  const sections = await readRuntimeSections(client, ['delivery-rules', 'store-profile']);
  const deliveryRules = normalizeDeliveryRules(getRuntimeConfigValue(sections, 'delivery-rules'));
  const store = normalizeStoreCoordinates(getRuntimeConfigValue(sections, 'store-profile'));
  const sortedTiers = [...deliveryRules].sort((left, right) => left.distanceKm - right.distanceKm);
  const deliveryAddress = getDeliveryAddress(payload);
  const distanceKm = deliveryAddress ? calculateDistanceKm(store, deliveryAddress) : null;
  const matchedTier = distanceKm === null
    ? sortedTiers[0]
    : sortedTiers.find((tier) => distanceKm <= tier.distanceKm);
  const maxTier = sortedTiers[sortedTiers.length - 1];

  if (!matchedTier && maxTier) {
    throw new ApiError('DELIVERY_OUT_OF_RANGE', 'Delivery address is outside configured delivery range', 409);
  }

  if (matchedTier?.minimumOrderAmount !== null && matchedTier?.minimumOrderAmount !== undefined && input.itemsSubtotal < matchedTier.minimumOrderAmount) {
    throw new ApiError('DELIVERY_MINIMUM_NOT_MET', 'Order subtotal is below delivery minimum amount', 409);
  }
}

function normalizeOrderItems(items: unknown): CreateOrderInput['items'] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter((item): item is CustomerOrderItemPayload => isObject(item))
    .map((item) => ({
      productId: String(item.productId ?? ''),
      name: String(item.name ?? ''),
      quantity: Math.max(0, Math.trunc(toNumber(item.quantity))),
      unitPrice: toNumber(item.unitPrice),
      specId: String(item.specId ?? ''),
      specLabel: String(item.specLabel ?? ''),
      lineTotal: toNumber(item.lineTotal)
    }))
    .filter((item) => item.productId && item.name && item.quantity > 0);
}

function normalizeSelectedGiftIds(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()))]
    : [];
}

function stripClientGiftSnapshots(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    return {};
  }

  const { gifts: _clientGifts, ...base } = snapshot as Record<string, unknown>;
  return base;
}

function appendGiftSnapshots(snapshot: unknown, gifts: LockedGiftSnapshot[]) {
  return {
    ...stripClientGiftSnapshots(snapshot),
    gifts: gifts.map((gift) => ({
      id: gift.id,
      ...gift.giftSnapshot
    }))
  };
}

function getSnapshotStockItems(snapshot: unknown): Array<{ productId: string; quantity: number }> {
  if (!isObject(snapshot) || !Array.isArray(snapshot.items)) {
    return [];
  }

  return snapshot.items
    .filter(isObject)
    .map((item) => ({
      productId: typeof item.productId === 'string' ? item.productId : '',
      quantity: Math.max(0, Math.trunc(toNumber(item.quantity)))
    }))
    .filter((item) => item.productId && item.quantity > 0);
}

async function releaseReservedOrderStock(client: PrismaClient, order: Pick<OrderRecord, 'snapshot'>) {
  const items = getSnapshotStockItems(order.snapshot);

  if (!items.length) {
    return;
  }

  const catalogRepository = createCatalogRepository(client as never);
  for (const item of items) {
    await catalogRepository.incrementStock(item.productId, item.quantity);
  }
}

function normalizeCreateOrderPayload(openid: string, payload: unknown): CreateOrderInput {
  const candidate = payload as CustomerOrderPayload;
  if (candidate.id && RESERVED_ORDER_ID_PREFIXES.some((prefix) => candidate.id?.startsWith(prefix))) {
    throw new ApiError('RESERVED_ORDER_ID', 'Order id uses a reserved payment prefix', 400);
  }
  const pricing = isObject(candidate.pricing) ? candidate.pricing : null;
  const fulfillment = isObject(candidate.fulfillment) ? candidate.fulfillment : null;
  const paymentMethod = candidate.paymentMethod === 'balance' ? 'balance' : 'wechat';
  const fulfillmentMode =
    fulfillment?.mode === 'delivery' || fulfillment?.mode === 'express' || fulfillment?.mode === 'pickup'
      ? fulfillment.mode
      : candidate.fulfillmentMode ?? 'pickup';

  return {
    id: candidate.id ?? `order-${Date.now()}`,
    openid,
    idempotencyKey: candidate.idempotencyKey ?? `idem-${Date.now()}`,
    paymentMethod,
    fulfillmentMode,
    itemsSubtotal: toNumber(pricing?.itemsSubtotal, candidate.itemsSubtotal ?? 0),
    deliveryFee: toNumber(pricing?.deliveryFee, candidate.deliveryFee ?? 0),
    payableTotal: toNumber(pricing?.payableTotal, candidate.payableTotal ?? 0),
    snapshot: stripClientGiftSnapshots(payload),
    items: normalizeOrderItems(candidate.items),
    selectedGiftIds: normalizeSelectedGiftIds(candidate.selectedGiftIds)
  };
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function withServerOrderSnapshot(
  snapshot: unknown,
  items: CreateOrderInput['items'],
  pricing: {
    itemsSubtotal: number;
    deliveryFee: number;
    payableTotal: number;
  }
) {
  const base = isObject(snapshot) ? snapshot : {};
  return {
    ...base,
    items,
    pricing
  };
}

function toOrderItemValidationError(status: string) {
  if (status === 'product_unavailable') {
    return new ApiError('ORDER_PRODUCT_UNAVAILABLE', 'Order product is unavailable', 409);
  }

  if (status === 'spec_unavailable') {
    return new ApiError('ORDER_SPEC_UNAVAILABLE', 'Order product spec is unavailable', 409);
  }

  if (status === 'sold_out' || status === 'quantity_adjusted') {
    return new ApiError('ORDER_STOCK_UNAVAILABLE', 'Order product stock is unavailable', 409);
  }

  return new ApiError('INVALID_ORDER_ITEM', 'Invalid order item', 400);
}

async function resolveCustomerOrderItems(client: PrismaClient, input: CreateOrderInput): Promise<CreateOrderInput> {
  if (!input.items.length) {
    return input;
  }

  const catalogService = createCatalogService(createCatalogRepository(client as never) as never);
  const resolved = await catalogService.resolveCustomerCartLines({
    lines: input.items.map((item) => ({
      productId: item.productId,
      specId: item.specId,
      quantity: item.quantity
    }))
  });
  const nextItems: CreateOrderInput['items'] = [];

  for (const line of resolved.lines) {
    if (line.status !== 'available') {
      throw toOrderItemValidationError(line.status);
    }

    if (!line.product) {
      throw new ApiError('ORDER_PRODUCT_UNAVAILABLE', 'Order product is unavailable', 409);
    }

    if (!line.spec) {
      throw new ApiError('ORDER_SPEC_UNAVAILABLE', 'Order product spec is unavailable', 409);
    }

    if (!line.product.deliveryModes.includes(input.fulfillmentMode)) {
      throw new ApiError('INCOMPATIBLE_FULFILLMENT', 'Order items do not support the selected fulfillment mode', 409);
    }

    const unitPrice = roundCurrency(line.spec.price);
    const quantity = line.resolvedQuantity;
    const lineTotal = roundCurrency(unitPrice * quantity);

    nextItems.push({
      productId: line.productId,
      name: line.product.name,
      quantity,
      unitPrice,
      specId: line.resolvedSpecId,
      specLabel: line.spec.label,
      lineTotal
    });
  }

  const itemsSubtotal = roundCurrency(nextItems.reduce((total, item) => total + item.lineTotal, 0));
  const pricing = {
    itemsSubtotal,
    deliveryFee: input.deliveryFee,
    payableTotal: roundCurrency(itemsSubtotal + input.deliveryFee)
  };

  return {
    ...input,
    ...pricing,
    items: nextItems,
    snapshot: withServerOrderSnapshot(input.snapshot, nextItems, pricing)
  };
}

function getFirstString(value: unknown) {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : undefined;
  }

  return typeof value === 'string' ? value : undefined;
}

function normalizeMerchantOrderFilters(filters: Record<string, unknown> = {}): MerchantOrderListFilters {
  const rawScope = getFirstString(filters.scope);
  const rawFulfillmentMode = getFirstString(filters.fulfillmentMode);
  const keyword = getFirstString(filters.keyword)?.trim();
  const result: MerchantOrderListFilters = {
    scope: rawScope === 'history' ? 'history' : 'active'
  };

  if (rawFulfillmentMode === 'delivery' || rawFulfillmentMode === 'pickup' || rawFulfillmentMode === 'express') {
    result.fulfillmentMode = rawFulfillmentMode;
  }

  if (keyword) {
    result.keyword = keyword;
  }

  return result;
}

function normalizeCustomerOrderFilters(filters: Record<string, unknown> = {}): CustomerOrderListFilters {
  const rawStatusGroup = getFirstString(filters.statusGroup);
  const rawLimit = getFirstString(filters.limit);
  const cursor = getFirstString(filters.cursor);
  const statusGroup =
    rawStatusGroup === 'pending' || rawStatusGroup === 'active' || rawStatusGroup === 'completed' || rawStatusGroup === 'all'
      ? rawStatusGroup
      : 'all';
  const parsedLimit = rawLimit ? Number(rawLimit) : undefined;

  return {
    statusGroup,
    limit: parsedLimit,
    cursor
  };
}

function getAutoCompleteCutoff(now = new Date()) {
  return new Date(now.getTime() - ACTIVE_ORDER_AUTO_COMPLETE_DAYS * 24 * 60 * 60 * 1000);
}

function createAutoCompleteMetadata(now = new Date()) {
  return {
    actorType: 'system',
    action: 'auto_complete_active_order',
    operatedAt: now.toISOString(),
    thresholdDays: ACTIVE_ORDER_AUTO_COMPLETE_DAYS
  };
}

async function completeStaleActiveOrders(client: PrismaClient) {
  const now = new Date();
  await createOrderRepository(client).completeStaleActiveOrders(getAutoCompleteCutoff(now), createAutoCompleteMetadata(now));
}

function canCustomerCompleteOrder(order: OrderRecord) {
  if (order.status !== 'paid' || order.paymentStatus !== 'paid') {
    return false;
  }

  return order.fulfillmentStatus ? CUSTOMER_COMPLETABLE_FULFILLMENT_STATUSES.includes(order.fulfillmentStatus) : false;
}

function assertSyncedPaymentAmountMatchesOrder(order: OrderRecord, paidAmountCents?: number) {
  if (paidAmountCents === undefined) {
    throw new ApiError('ORDER_PAYMENT_AMOUNT_MISSING', 'Order payment amount is required for settlement', 409);
  }
  if (paidAmountCents !== toCents(order.pricing.payableTotal)) {
    throw new ApiError('ORDER_PAYMENT_AMOUNT_MISMATCH', 'Order payment amount does not match order total', 409);
  }
}

export function createOrderService(
  client: PrismaClient = getPrismaClient(),
  paymentProvider: PaymentProvider = createMockPaymentProvider()
) {
  return {
    async createPendingOrder(input: CreateOrderInput): Promise<OrderRecord> {
      return client.$transaction(async (tx) => {
        const orderRepository = createOrderRepository(tx);
        const catalogRepository = createCatalogRepository(tx);
        const existing = await orderRepository.getByOpenidAndIdempotencyKey(input.openid, input.idempotencyKey);

        if (existing) {
          return existing;
        }

        const giftSnapshots = input.selectedGiftIds.length
          ? await createGiftService(tx as never).lockGiftsForOrder(input.openid, input.id, input.selectedGiftIds, tx as never)
          : [];
        const order = await orderRepository.createPending({
          ...input,
          snapshot: giftSnapshots.length ? appendGiftSnapshots(input.snapshot, giftSnapshots) : stripClientGiftSnapshots(input.snapshot)
        });

        for (const item of input.items) {
          await catalogRepository.decrementStock(item.productId, item.quantity);
        }

        return order;
      });
    },

    async createCustomerOrder(openid: string, payload: unknown): Promise<{ ok: true; order: OrderRecord }> {
      if (!payload || typeof payload !== 'object') {
        throw new ApiError('INVALID_ORDER', 'Invalid order payload', 400);
      }
      const user = await client.user.findUnique({
        where: { openid },
        select: { phoneBindingState: true }
      });
      if (!user || user.phoneBindingState !== 'BOUND') {
        throw new ApiError('CUSTOMER_NOT_REGISTERED', 'Customer must bind phone before ordering', 403);
      }
      const input = normalizeCreateOrderPayload(openid, payload);
      const resolvedInput = await resolveCustomerOrderItems(client, input);
      await assertDeliveryRulesAllowOrder(client, resolvedInput, payload);
      const order = await this.createPendingOrder(resolvedInput);
      return { ok: true, order };
    },

    async startCustomerPayment(openid: string, orderId: string, payload: unknown = {}) {
      const orderRepository = createOrderRepository(client);
      const order = await orderRepository.getById(orderId);
      if (!order || order.openid !== openid) {
        throw new ApiError('ORDER_NOT_FOUND', 'Order not found', 404);
      }
      if (order.paymentStatus === 'paid') {
        const settledOrder = await markOrderPaidAndRedeemGifts(
          client as never,
          orderId,
          order.paidAt ? new Date(order.paidAt) : undefined
        );
        return { ok: true as const, paymentStatus: 'paid', order: settledOrder };
      }
      if (order.paymentMethod === 'balance') {
        let balance: Awaited<ReturnType<ReturnType<typeof createBalanceService>['adjustBalance']>> | undefined;
        let paidOrder: OrderRecord | undefined;
        try {
          await assertOrderGiftsLockedForSettlement(client as never, orderId, order.snapshot);
          await runOrderSettlementTransaction(client as never, async (tx) => {
            balance = await createBalanceService(tx as never).adjustBalance({
              openid,
              amountDelta: -order.pricing.payableTotal,
              type: 'order_payment',
              orderId,
              idempotencyKey: `order-payment-${orderId}`,
              metadata: payload
            });
            paidOrder = await markOrderPaidAndRedeemGifts(tx as never, orderId);
          });
        } catch (error) {
          if (error instanceof ApiError) {
            throw error;
          }
          await createGiftService(client as never).releaseGiftsForOrder(orderId);
          return {
            ok: false as const,
            code: 'INSUFFICIENT_BALANCE',
            message: 'Insufficient balance',
            paymentStatus: 'blocked'
          };
        }
        if (!balance || !paidOrder) {
          throw new ApiError('ORDER_PAYMENT_SETTLEMENT_FAILED', 'Order payment settlement failed', 500);
        }
        return {
          ok: true as const,
          paymentStatus: 'paid',
          order: paidOrder,
          balanceAfter: balance.balanceAfter
        };
      }
      const processing = await orderRepository.markPaymentProcessing(orderId);
      const paymentStart = await paymentProvider.startWechatPayment(createOrderPaymentSubject(processing), { openid });
      await createPaymentRepository(client).upsertPayment({
        orderId,
        method: 'wechat',
        status: 'processing',
        outTradeNo: paymentStart.outTradeNo,
        prepayId: paymentStart.prepayId
      });
      return {
        ok: true as const,
        paymentStatus: 'pending_wechat',
        order: processing,
        paymentParams: paymentStart.paymentParams
      };
    },

    async confirmCustomerPayment(openid: string, orderId: string, payload: unknown = {}) {
      const orderRepository = createOrderRepository(client);
      const order = await orderRepository.getById(orderId);
      if (!order || order.openid !== openid) {
        throw new ApiError('ORDER_NOT_FOUND', 'Order not found', 404);
      }
      return { ok: true as const, order, confirmation: payload };
    },

    async syncCustomerPayment(openid: string, orderId: string) {
      const order = await createOrderRepository(client).getById(orderId);
      if (!order || order.openid !== openid) {
        throw new ApiError('ORDER_NOT_FOUND', 'Order not found', 404);
      }

      if (order.paymentMethod === 'wechat' && order.paymentStatus !== 'paid') {
        const syncedPayment = await paymentProvider.syncWechatPayment(createOrderPaymentSubject(order), { openid });

        if (syncedPayment.tradeState === 'SUCCESS') {
          assertSyncedPaymentAmountMatchesOrder(order, syncedPayment.paidAmountCents);
          const paidOrder = await recordOrderPaymentAndSettle(client as never, {
            orderId,
            method: 'wechat',
            status: 'paid',
            outTradeNo: orderId,
            transactionId: syncedPayment.transactionId,
            paidAt: syncedPayment.paidAt ?? new Date()
          });
          return { ok: true as const, order: paidOrder };
        }

        if (syncedPayment.failureCode) {
          await createPaymentRepository(client).upsertPayment({
            orderId,
            method: 'wechat',
            status: 'processing',
            outTradeNo: orderId,
            failureCode: syncedPayment.failureCode,
            failureMessage: syncedPayment.failureMessage
          });
        }
      }

      return { ok: true as const, order };
    },

    async queryCustomerOrders(openid: string, filters: Record<string, unknown> = {}) {
      await completeStaleActiveOrders(client);
      const page = await createOrderRepository(client).listByOpenid(openid, normalizeCustomerOrderFilters(filters));
      return { ok: true as const, ...page };
    },

    async getCustomerOrderDetail(openid: string, orderId: string) {
      await completeStaleActiveOrders(client);
      const order = await createOrderRepository(client).getById(orderId);
      if (!order || order.openid !== openid) {
        throw new ApiError('ORDER_NOT_FOUND', 'Order not found', 404);
      }
      return { ok: true as const, order };
    },

    async completeCustomerOrder(openid: string, orderId: string) {
      await completeStaleActiveOrders(client);
      const orderRepository = createOrderRepository(client);
      const current = await orderRepository.getById(orderId);

      if (!current || current.openid !== openid) {
        throw new ApiError('ORDER_NOT_FOUND', 'Order not found', 404);
      }

      if (current.fulfillmentStatus === 'completed') {
        return { ok: true as const, order: current };
      }

      if (current.status === 'cancelled' || current.fulfillmentStatus === 'cancelled') {
        throw new ApiError('ORDER_TERMINAL', 'Terminal order cannot be updated', 409);
      }

      if (!canCustomerCompleteOrder(current)) {
        throw new ApiError('ORDER_NOT_READY_TO_COMPLETE', 'Order is not ready for customer completion', 409);
      }

      const order = await orderRepository.updateStatus(orderId, {
        fulfillmentStatus: 'completed',
        merchantOverride: {
          actorType: 'customer',
          actorOpenid: openid,
          action: 'customer_confirm_completed',
          operatedAt: new Date().toISOString()
        }
      });

      return { ok: true as const, order };
    },

    async cancelCustomerOrder(openid: string, orderId: string) {
      const orderRepository = createOrderRepository(client);
      const current = await orderRepository.getById(orderId);

      if (!current || current.openid !== openid) {
        throw new ApiError('ORDER_NOT_FOUND', 'Order not found', 404);
      }

      if (current.status === 'cancelled') {
        return { ok: true as const, order: current };
      }

      if (current.paymentStatus === 'paid') {
        throw new ApiError('ORDER_ALREADY_PAID', 'Paid order cannot be cancelled by customer', 409);
      }

      const cancelledAt = new Date();
      const order = await runOrderSettlementTransaction(client as never, async (tx) => {
        await createPaymentRepository(tx as never).upsertPayment({
          orderId,
          method: current.paymentMethod,
          status: 'failed',
          failureCode: 'CUSTOMER_CANCELLED',
          failureMessage: 'Customer cancelled payment',
          paidAt: undefined
        });
        const cancelled = await createOrderRepository(tx as never).updateStatus(orderId, {
          status: 'cancelled',
          paymentStatus: 'failed',
          fulfillmentStatus: 'cancelled',
          cancelledAt,
          merchantOverride: {
            actorType: 'customer',
            actorOpenid: openid,
            action: 'customer_cancel_unpaid_order',
            operatedAt: cancelledAt.toISOString()
          }
        });
        await createGiftService(tx as never).releaseGiftsForOrder(orderId, tx as never);
        await releaseReservedOrderStock(tx as never, current);
        return cancelled;
      });

      return { ok: true as const, order };
    },

    async queryMerchantOrders(_merchantContext: MerchantContext, filters: Record<string, unknown> = {}) {
      await completeStaleActiveOrders(client);
      const orders = await createOrderRepository(client).listForMerchant(normalizeMerchantOrderFilters(filters));
      return { ok: true as const, orders };
    },

    async getMerchantOrderDetail(_merchantContext: MerchantContext, orderId: string) {
      await completeStaleActiveOrders(client);
      const order = await createOrderRepository(client).getById(orderId);
      if (!order) {
        throw new ApiError('ORDER_NOT_FOUND', 'Order not found', 404);
      }
      return { ok: true as const, order };
    },

    async updateMerchantOrderStatus(merchantContext: MerchantContext, orderId: string, payload: unknown) {
      if (!payload || typeof payload !== 'object') {
        throw new ApiError('INVALID_ORDER_STATUS', 'Invalid order status payload', 400);
      }
      await completeStaleActiveOrders(client);
      const current = await createOrderRepository(client).getById(orderId);
      if (!current) {
        throw new ApiError('ORDER_NOT_FOUND', 'Order not found', 404);
      }
      if (current.status === 'cancelled' || current.fulfillmentStatus === 'completed') {
        throw new ApiError('ORDER_TERMINAL', 'Terminal order cannot be updated', 409);
      }
      const candidate = payload as {
        status?: OrderRecord['status'];
        paymentStatus?: OrderRecord['paymentStatus'];
        fulfillmentStatus?: NonNullable<OrderRecord['fulfillmentStatus']>;
      };
      const updateInput = {
        status: candidate.status,
        paymentStatus: candidate.paymentStatus,
        fulfillmentStatus: candidate.fulfillmentStatus,
        paidAt: candidate.status === 'paid' ? new Date() : undefined,
        cancelledAt: candidate.status === 'cancelled' ? new Date() : undefined,
        merchantOverride: {
          actorOpenid: merchantContext.openid,
          actorName: merchantContext.storeName,
          operatedAt: new Date().toISOString(),
          payload
        }
      };
      const order = candidate.status === 'cancelled' && current.paymentStatus !== 'paid'
        ? await runOrderSettlementTransaction(client as never, async (tx) => {
          const cancelled = await createOrderRepository(tx as never).updateStatus(orderId, updateInput);
          await createGiftService(tx as never).releaseGiftsForOrder(orderId, tx as never);
          await releaseReservedOrderStock(tx as never, current);
          return cancelled;
        })
        : await createOrderRepository(client).updateStatus(orderId, updateInput);
      return { ok: true as const, order };
    }
  };
}
