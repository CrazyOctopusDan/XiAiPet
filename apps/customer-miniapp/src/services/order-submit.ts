import type {
  CreateOrderPayload,
  OrderAddressSnapshot,
  OrderRecord,
  OrderPetSnapshot,
  OrderPricingBreakdown,
  PaymentMethod
} from '@xiaipet/shared';
import { buildOrderLineSnapshot, buildOrderPricingBreakdown } from '../shared/order-runtime';

import { getSelectedAddress } from './address';
import { customerApiRequest, CustomerApiError, type CustomerApiRequester } from './api-client';
import { getCartItems } from './cart';
import { getCheckoutViewModel } from './checkout';

interface DeliveryFeePreview {
  distanceKm: number;
  fee: number;
  ruleLabel: string;
}

const CITY_DELIVERY_FEES: Record<string, DeliveryFeePreview> = {
  'address-city-home': {
    distanceKm: 3.2,
    fee: 10,
    ruleLabel: '3km 内配送费 10 元'
  },
  'address-city-studio': {
    distanceKm: 5.8,
    fee: 16,
    ruleLabel: '3-6km 配送费 16 元'
  }
};

function buildAddressSnapshot(address: ReturnType<typeof getSelectedAddress>): OrderAddressSnapshot | undefined {
  if (!address) {
    return undefined;
  }

  return {
    id: address.id,
    recipientName: address.recipientName,
    phoneNumber: address.phoneNumber,
    regionLabel: address.regionLabel,
    detailAddress: address.detailAddress,
    tag: address.tag
  };
}

function createIdempotencyKey() {
  return `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getCheckoutPricingPreview(): OrderPricingBreakdown {
  const checkout = getCheckoutViewModel();
  const selectedItems = getCartItems().filter((item) => item.selected);
  const itemsSubtotal = Number(
    selectedItems.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2)
  );
  const address = checkout.addressType ? getSelectedAddress(checkout.addressType) : null;
  const deliveryFee = checkout.mode === 'delivery' ? getDeliveryFeePreview(address).fee : 0;

  return buildOrderPricingBreakdown({
    itemsSubtotal,
    deliveryFee
  });
}

export function getDeliveryFeePreview(address: ReturnType<typeof getSelectedAddress>): DeliveryFeePreview {
  if (!address) {
    return {
      distanceKm: 0,
      fee: 0,
      ruleLabel: '待选择配送地址'
    };
  }

  return (
    CITY_DELIVERY_FEES[address.id] ?? {
      distanceKm: 8.6,
      fee: 22,
      ruleLabel: '6km 以上配送费 22 元'
    }
  );
}

export function buildCreateOrderPayload(paymentMethod: PaymentMethod, idempotencyKey = createIdempotencyKey()): CreateOrderPayload {
  const checkout = getCheckoutViewModel();
  const selectedItems = getCartItems().filter((item) => item.selected);
  const pricing = getCheckoutPricingPreview();
  const pets: OrderPetSnapshot[] = checkout.selectedPets.map((pet) => ({
    id: pet.id,
    name: pet.name
  }));

  return {
    idempotencyKey,
    paymentMethod,
    fulfillment: {
      mode: checkout.mode,
      address: buildAddressSnapshot(checkout.addressType ? getSelectedAddress(checkout.addressType) : null),
      pickupPhone: checkout.mode === 'pickup' ? checkout.pickupPhone : undefined,
      reservation: checkout.reservationSelection ?? undefined,
      store: {
        name: checkout.store.name,
        address: checkout.store.address
      }
    },
    items: selectedItems.map((item) =>
      buildOrderLineSnapshot({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        specId: item.specId,
        specLabel: item.specLabel
      })
    ),
    pets,
    remark: checkout.remark,
    hasReadCustomNotice: checkout.hasReadCustomNotice,
    pricing
  };
}

interface SubmitOrderOptions {
  idempotencyKey?: string;
}

interface CreateOrderResult {
  ok: boolean;
  order?: OrderRecord;
  code?: string;
}

interface StartPaymentResult {
  ok: boolean;
  code?: string;
  order?: OrderRecord;
  paymentStatus?: 'paid' | 'processing' | 'pending_wechat' | 'blocked';
  paymentParams?: Record<string, unknown>;
  balanceAfter?: number;
}

interface SyncPaymentResult {
  ok: boolean;
  order?: OrderRecord;
  code?: string;
}

function toSubmitOrderError(error: unknown): Error {
  if (error instanceof CustomerApiError) {
    return new Error(error.code);
  }
  return error instanceof Error ? error : new Error('submit_order_failed');
}

export async function submitOrder(
  paymentMethod: PaymentMethod,
  request: CustomerApiRequester = customerApiRequest,
  options: SubmitOrderOptions = {}
) {
  const payload = buildCreateOrderPayload(paymentMethod, options.idempotencyKey);

  try {
    const createOrderResponse = await request<CreateOrderResult>('/api/v1/customer/orders', {
      method: 'POST',
      body: payload,
      auth: 'customer'
    });

    if (!createOrderResponse.ok || !createOrderResponse.order) {
      throw new Error(String(createOrderResponse.code ?? 'create_order_failed'));
    }

    const payOrderResponse = await request<StartPaymentResult>(
      `/api/v1/customer/orders/${createOrderResponse.order.id}/payment`,
      {
        method: 'POST',
        body: {
          paymentMethod
        },
        auth: 'customer'
      }
    );

    if (!payOrderResponse.ok) {
      throw new Error(String(payOrderResponse.code ?? 'pay_order_failed'));
    }

    if (!payOrderResponse.order) {
      throw new Error('missing_paid_order');
    }

    if (
      paymentMethod === 'wechat' &&
      (payOrderResponse.paymentStatus === 'pending_wechat' || payOrderResponse.paymentStatus === 'processing')
    ) {
      const syncOrderPaymentResponse = await request<SyncPaymentResult>(
        `/api/v1/customer/orders/${createOrderResponse.order.id}/payment-sync`,
        {
          method: 'POST',
          auth: 'customer'
        }
      );

      if (!syncOrderPaymentResponse.ok || !syncOrderPaymentResponse.order) {
        throw new Error(String(syncOrderPaymentResponse.code ?? 'sync_payment_failed'));
      }

      return {
        order: syncOrderPaymentResponse.order,
        payment: payOrderResponse
      };
    }

    return {
      order: payOrderResponse.order,
      payment: payOrderResponse
    };
  } catch (error) {
    throw toSubmitOrderError(error);
  }
}
