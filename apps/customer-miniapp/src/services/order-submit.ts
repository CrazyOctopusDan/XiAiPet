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
import { getCartItems, getSelectedCartFulfillmentModes, removeSelectedCartItems } from './cart';
import { ensureContactPhoneFromProfile, getCheckoutViewModel } from './checkout';
import { getDeliveryRuleViolation, resolveDeliveryFeePreview, type DeliveryFeePreview } from './delivery-rules';
import { getSelectedCheckoutGiftIds, resetCheckoutGiftSelection } from './gifts';
import { getCachedCustomerRuntimeConfig } from './runtime-config';

declare const wx: any;

const EXPRESS_SHIPPING_FEE = 6;
const EXPRESS_SHIPPING_FREE_THRESHOLD = 100;

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
    tag: address.tag,
    latitude: address.latitude,
    longitude: address.longitude
  };
}

function createIdempotencyKey() {
  return `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function resolveExpressShippingFee(itemsSubtotal: number) {
  if (itemsSubtotal <= 0 || itemsSubtotal >= EXPRESS_SHIPPING_FREE_THRESHOLD) {
    return 0;
  }

  return EXPRESS_SHIPPING_FEE;
}

export function getCheckoutPricingPreview(): OrderPricingBreakdown {
  const checkout = getCheckoutViewModel();
  const selectedItems = getCartItems().filter((item) => item.selected);
  const itemsSubtotal = Number(
    selectedItems.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2)
  );
  const address = checkout.addressType ? getSelectedAddress(checkout.addressType) : null;
  const deliveryFee = checkout.mode === 'delivery'
    ? getDeliveryFeePreview(address).fee
    : checkout.mode === 'express'
      ? resolveExpressShippingFee(itemsSubtotal)
      : 0;

  return buildOrderPricingBreakdown({
    itemsSubtotal,
    deliveryFee
  });
}

export function getDeliveryFeePreview(address: ReturnType<typeof getSelectedAddress>): DeliveryFeePreview {
  const runtimeConfig = getCachedCustomerRuntimeConfig();
  return resolveDeliveryFeePreview(runtimeConfig, address);
}

export function buildCreateOrderPayload(paymentMethod: PaymentMethod, idempotencyKey = createIdempotencyKey()): CreateOrderPayload {
  ensureContactPhoneFromProfile();
  const checkout = getCheckoutViewModel();
  const selectedItems = getCartItems().filter((item) => item.selected);
  const selectedFulfillmentModes = getSelectedCartFulfillmentModes();
  const pricing = getCheckoutPricingPreview();
  const deliveryRuleViolation = checkout.mode === 'delivery'
    ? getDeliveryRuleViolation({
      runtimeConfig: getCachedCustomerRuntimeConfig(),
      address: checkout.addressType ? getSelectedAddress(checkout.addressType) : null,
      itemsSubtotal: pricing.itemsSubtotal
    })
    : null;
  const pets: OrderPetSnapshot[] = checkout.selectedPets.map((pet) => ({
    id: pet.id,
    name: pet.name,
    gender: pet.gender,
    birthday: pet.birthday,
    allergyNotes: pet.allergyNotes
  }));

  if (selectedItems.length > 0 && !selectedFulfillmentModes.includes(checkout.mode)) {
    throw new Error('INCOMPATIBLE_FULFILLMENT');
  }

  if (deliveryRuleViolation) {
    throw new Error(deliveryRuleViolation.errorCode);
  }

  return {
    idempotencyKey,
    paymentMethod,
    fulfillment: {
      mode: checkout.mode,
      address: buildAddressSnapshot(checkout.addressType ? getSelectedAddress(checkout.addressType) : null),
      contactPhone: checkout.contactPhone || undefined,
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
    pricing,
    selectedGiftIds: getSelectedCheckoutGiftIds()
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

function requestWechatPayment(paymentParams: Record<string, unknown>) {
  return new Promise<void>((resolve, reject) => {
    if (typeof wx?.requestPayment !== 'function') {
      reject(new Error('WECHAT_PAY_UNAVAILABLE'));
      return;
    }

    wx.requestPayment({
      ...paymentParams,
      success: () => resolve(),
      fail: () => reject(new Error('WECHAT_PAY_CANCELLED'))
    });
  });
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
      if (!payOrderResponse.paymentParams) {
        throw new Error('missing_wechat_payment_params');
      }

      try {
        await requestWechatPayment(payOrderResponse.paymentParams);
      } catch (paymentError) {
        try {
          await request(`/api/v1/customer/orders/${createOrderResponse.order.id}/cancel`, {
            method: 'POST',
            auth: 'customer'
          });
          resetCheckoutGiftSelection();
        } catch {
          // Preserve the original payment error so the page can keep the user's retry context.
        }
        throw paymentError;
      }

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

      resetCheckoutGiftSelection();
      removeSelectedCartItems();

      return {
        order: syncOrderPaymentResponse.order,
        payment: payOrderResponse
      };
    }

    resetCheckoutGiftSelection();
    removeSelectedCartItems();

    return {
      order: payOrderResponse.order,
      payment: payOrderResponse
    };
  } catch (error) {
    throw toSubmitOrderError(error);
  }
}
