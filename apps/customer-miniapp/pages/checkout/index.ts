declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import type { PaymentMethod, UserGiftView } from '@xiaipet/shared';

import { beginAddressSelection, hydrateAddresses, type CustomerAddress } from '../../src/services/address';
import {
  getCheckoutViewModel,
  getFulfillmentModes,
  hydratePickupPhoneFromProfile,
  resetCheckoutDraft,
  setCustomNoticeAcknowledged,
  setFulfillmentMode,
  setPickupPhone,
  setReservationSelection,
  toggleSelectedPet,
  type FulfillmentMode,
  type FulfillmentModeOption,
  type ReservationDayOption
} from '../../src/services/checkout';
import { getCartItems, getCartSummary, removeSelectedCartItems, type CartItem } from '../../src/services/cart';
import { getPets, hydratePets, type PetProfile } from '../../src/services/pets';
import { getPhoneBindingRedirectUrl, hydrateProfile } from '../../src/services/profile';
import { getSelectedCheckoutGiftSummary } from '../../src/services/gifts';
import { getCheckoutPricingPreview, getDeliveryFeePreview, submitOrder } from '../../src/services/order-submit';
import { hydrateCustomerRuntimeConfig } from '../../src/services/runtime-config';
import { setPendingOrdersHighlight } from '../../src/services/tab-navigation';

interface PaymentMethodOption {
  value: PaymentMethod;
  label: string;
  hint: string;
}

interface PetChoice extends PetProfile {
  selected: boolean;
}

interface CheckoutPageData {
  items: CartItem[];
  selectedCount: number;
  selectedTotalPrice: number;
  fulfillmentModes: FulfillmentModeOption[];
  activeFulfillmentMode: FulfillmentMode;
  activeAddressType: 'city' | 'express' | null;
  selectedAddress: CustomerAddress | null;
  reservationOptions: ReservationDayOption[];
  selectedReservationValue: string;
  selectedReservationLabel: string;
  showReservationModal: boolean;
  pendingReservationDateValue: string;
  pendingReservationTimeValue: string;
  pickupPhone: string;
  pets: PetChoice[];
  selectedPetIds: string[];
  remarkSummary: string;
  selectedGiftCount: number;
  selectedGiftSummaryLabel: string;
  selectedGiftFeeLabel: string;
  selectedGiftSummary: UserGiftView[];
  customNotice: string;
  hasReadCustomNotice: boolean;
  canSubmit: boolean;
  submitDisabledReasons: string[];
  storeName: string;
  storeAddress: string;
  storePhone: string;
  deliveryRuleRows: string[];
  paymentMethods: PaymentMethodOption[];
  activePaymentMethod: PaymentMethod;
  deliveryFee: number;
  payableTotal: number;
  deliveryFeeLabel: string;
  showDeliveryFeeModal: boolean;
  submitting: boolean;
}

interface CheckoutPageInstance {
  data: CheckoutPageData;
  setData(data: Record<string, unknown>): void;
  onLoad(options?: { source?: string }): void;
  refreshCheckout(): void;
  refreshCustomerContext(): Promise<void>;
  refreshRuntimeConfig(): Promise<void>;
  handleSubmit(): Promise<void>;
}

function resolvePendingReservation(options: ReservationDayOption[], selectedValue: string) {
  for (const day of options) {
    for (const slot of day.slots) {
      if (`${day.value}-${slot.value}` === selectedValue) {
        return {
          dateValue: day.value,
          timeValue: slot.value
        };
      }
    }
  }

  const firstDay = options[0];
  const firstSlot = firstDay?.slots[0];

  if (!firstDay || !firstSlot) {
    return null;
  }

  return {
    dateValue: firstDay.value,
    timeValue: firstSlot.value
  };
}

function findReservationSelection(options: ReservationDayOption[], dateValue: string, timeValue: string) {
  const day = options.find((item) => item.value === dateValue);
  const slot = day?.slots.find((item) => item.value === timeValue);

  if (!day || !slot) {
    return null;
  }

  return {
    dateLabel: day.label,
    dateValue: day.value,
    timeLabel: slot.label,
    timeValue: slot.value
  };
}

const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    value: 'balance',
    label: '余额支付',
    hint: '优先扣除当前账户余额'
  },
  {
    value: 'wechat',
    label: '微信支付',
    hint: '走微信支付收银台'
  }
];

let checkoutSubmissionLocked = false;

Page({
  data: {
    items: [],
    selectedCount: 0,
    selectedTotalPrice: 0,
    fulfillmentModes: getFulfillmentModes(),
    activeFulfillmentMode: 'delivery',
    activeAddressType: 'city',
    selectedAddress: null,
    reservationOptions: [],
    selectedReservationValue: '',
    selectedReservationLabel: '',
    showReservationModal: false,
    pendingReservationDateValue: '',
    pendingReservationTimeValue: '',
    pickupPhone: '',
    pets: [],
    selectedPetIds: [],
    remarkSummary: '',
    selectedGiftCount: 0,
    selectedGiftSummaryLabel: '去选择',
    selectedGiftFeeLabel: '未选择',
    selectedGiftSummary: [],
    customNotice: '',
    hasReadCustomNotice: false,
    canSubmit: false,
    submitDisabledReasons: [],
    storeName: '',
    storeAddress: '',
    storePhone: '',
    deliveryRuleRows: [],
    paymentMethods: PAYMENT_METHODS,
    activePaymentMethod: 'balance',
    deliveryFee: 0,
    payableTotal: 0,
    deliveryFeeLabel: '待确认',
    showDeliveryFeeModal: false,
    submitting: false
  },
  onLoad(this: CheckoutPageInstance) {
    checkoutSubmissionLocked = false;
    resetCheckoutDraft();
    this.setData({
      activePaymentMethod: 'balance',
      showReservationModal: false,
      showDeliveryFeeModal: false,
      submitting: false
    });
    this.refreshCheckout();
  },
  onShow(this: CheckoutPageInstance) {
    if (!this.data.submitting) {
      checkoutSubmissionLocked = false;
    }
    this.refreshCheckout();
    void this.refreshCustomerContext();
    void this.refreshRuntimeConfig();
  },
  async refreshCustomerContext(this: CheckoutPageInstance) {
    await Promise.allSettled([
      hydrateAddresses(),
      hydratePets(),
      hydrateProfile()
    ]);
    this.refreshCheckout();
  },
  async refreshRuntimeConfig(this: CheckoutPageInstance) {
    try {
      await hydrateCustomerRuntimeConfig();
    } finally {
      this.refreshCheckout();
    }
  },
  refreshCheckout(this: CheckoutPageInstance) {
    const summary = getCartSummary();
    const view = getCheckoutViewModel();
    const pricing = getCheckoutPricingPreview();
    const deliveryFeePreview = getDeliveryFeePreview(view.selectedAddress);
    const activePaymentMethod = this.data.activePaymentMethod ?? 'balance';
    const selectedPetIds = view.selectedPets.map((item) => item.id);
    const selectedPetIdSet = new Set(selectedPetIds);
    const selectedGiftSummary = getSelectedCheckoutGiftSummary();

    this.setData({
      items: getCartItems().filter((item) => item.selected),
      selectedCount: summary.selectedCount,
      selectedTotalPrice: summary.selectedTotalPrice,
      fulfillmentModes: getFulfillmentModes(),
      activeFulfillmentMode: view.mode,
      activeAddressType: view.addressType,
      selectedAddress: view.selectedAddress,
      reservationOptions: view.reservationOptions,
      selectedReservationValue: view.reservationSelection
        ? `${view.reservationSelection.dateValue}-${view.reservationSelection.timeValue}`
        : '',
      selectedReservationLabel: view.reservationSelection
        ? `${view.reservationSelection.dateLabel} ${view.reservationSelection.timeLabel}`
        : '',
      pickupPhone: view.contactPhone,
      pets: getPets().map((item) => ({
        ...item,
        selected: selectedPetIdSet.has(item.id)
      })),
      selectedPetIds,
      remarkSummary: view.remark || '还没有填写备注',
      selectedGiftCount: selectedGiftSummary.length,
      selectedGiftSummaryLabel: selectedGiftSummary.length ? `${selectedGiftSummary.length} 件已选` : '去选择',
      selectedGiftFeeLabel: selectedGiftSummary.length ? `${selectedGiftSummary.length} 件` : '未选择',
      selectedGiftSummary,
      customNotice: view.customNotice,
      hasReadCustomNotice: view.hasReadCustomNotice,
      canSubmit: view.canSubmit,
      submitDisabledReasons: view.submitDisabledReasons,
      storeName: view.store.name,
      storeAddress: view.store.address,
      storePhone: view.storePhone,
      deliveryRuleRows: view.deliveryRuleExplainers,
      paymentMethods: PAYMENT_METHODS,
      activePaymentMethod,
      deliveryFee: pricing.deliveryFee,
      payableTotal: pricing.payableTotal,
      deliveryFeeLabel:
        view.mode === 'delivery'
          ? deliveryFeePreview.ruleLabel
          : '当前模式免配送费'
    });
  },
  handleFulfillmentModeTap(this: CheckoutPageInstance, event: { currentTarget?: { dataset?: { mode?: FulfillmentMode } } }) {
    const mode = event.currentTarget?.dataset?.mode;

    if (!mode) {
      return;
    }

    setFulfillmentMode(mode);

    if (mode === 'pickup') {
      hydratePickupPhoneFromProfile();
    }

    this.refreshCheckout();
  },
  handleSelectAddress(this: CheckoutPageInstance) {
    if (!this.data.activeAddressType) {
      return;
    }

    beginAddressSelection('checkout', this.data.activeAddressType);
    wx.navigateTo({
      url: `/pages/address-list/index?source=checkout&type=${this.data.activeAddressType}`
    });
  },
  handleOpenReservationModal(this: CheckoutPageInstance) {
    const pending = resolvePendingReservation(this.data.reservationOptions, this.data.selectedReservationValue);

    if (!pending) {
      return;
    }

    this.setData({
      showReservationModal: true,
      pendingReservationDateValue: pending.dateValue,
      pendingReservationTimeValue: pending.timeValue
    });
  },
  handleCloseReservationModal(this: CheckoutPageInstance) {
    this.setData({ showReservationModal: false });
  },
  handleReservationDateTap(this: CheckoutPageInstance, event: { currentTarget?: { dataset?: { dateValue?: string } } }) {
    const dateValue = event.currentTarget?.dataset?.dateValue;
    const day = this.data.reservationOptions.find((item) => item.value === dateValue);
    const firstSlot = day?.slots[0];

    if (!day || !firstSlot) {
      return;
    }

    this.setData({
      pendingReservationDateValue: day.value,
      pendingReservationTimeValue: firstSlot.value
    });
  },
  handleReservationSlotTap(this: CheckoutPageInstance, event: { currentTarget?: { dataset?: { timeValue?: string } } }) {
    const timeValue = event.currentTarget?.dataset?.timeValue;

    if (!timeValue) {
      return;
    }

    this.setData({
      pendingReservationTimeValue: timeValue
    });
  },
  handleConfirmReservation(this: CheckoutPageInstance) {
    const selection = findReservationSelection(
      this.data.reservationOptions,
      this.data.pendingReservationDateValue,
      this.data.pendingReservationTimeValue
    );

    if (!selection) {
      return;
    }

    setReservationSelection(selection);
    this.setData({ showReservationModal: false });
    this.refreshCheckout();
  },
  handlePhoneInput(this: CheckoutPageInstance, event: { detail?: { value?: string } }) {
    setPickupPhone(event.detail?.value ?? '');
    this.refreshCheckout();
  },
  handleAutoFillPhone(this: CheckoutPageInstance) {
    const hydrated = hydratePickupPhoneFromProfile();

    this.refreshCheckout();

    if (!hydrated) {
      wx.navigateTo({
        url: '/pages/contact-bind/index'
      });
    }
  },
  handlePetTap(this: CheckoutPageInstance, event: { currentTarget?: { dataset?: { petId?: string } } }) {
    const petId = event.currentTarget?.dataset?.petId;

    if (!petId) {
      return;
    }

    toggleSelectedPet(petId);
    this.refreshCheckout();
  },
  handleRemarkTap() {
    wx.navigateTo({
      url: '/pages/checkout-remark/index'
    });
  },
  handleGiftTap() {
    wx.navigateTo({
      url: '/pages/checkout-gifts/index'
    });
  },
  handlePaymentMethodTap(this: CheckoutPageInstance, event: { currentTarget?: { dataset?: { method?: PaymentMethod } } }) {
    const method = event.currentTarget?.dataset?.method;

    if (!method) {
      return;
    }

    this.setData({
      activePaymentMethod: method
    });
  },
  handleDeliveryFeeTap(this: CheckoutPageInstance) {
    if (this.data.activeFulfillmentMode !== 'delivery' || !this.data.deliveryRuleRows.length) {
      return;
    }

    this.setData({ showDeliveryFeeModal: true });
  },
  handleCloseDeliveryFeeModal(this: CheckoutPageInstance) {
    this.setData({ showDeliveryFeeModal: false });
  },
  noop() {},
  handleNoticeToggle(this: CheckoutPageInstance) {
    setCustomNoticeAcknowledged(!this.data.hasReadCustomNotice);
    this.refreshCheckout();
  },
  handleOpenLocation() {
    const view = getCheckoutViewModel();
    wx.openLocation?.({
      name: view.store.name,
      address: view.store.address,
      latitude: view.store.latitude,
      longitude: view.store.longitude,
      scale: 17
    });
  },
  async handleSubmit(this: CheckoutPageInstance) {
    if (checkoutSubmissionLocked || this.data.submitting) {
      return;
    }

    checkoutSubmissionLocked = true;
    await this.refreshCustomerContext();

    if (!this.data.canSubmit) {
      checkoutSubmissionLocked = false;
      if (this.data.submitDisabledReasons.includes('missing_registration')) {
        wx.navigateTo({
          url: getPhoneBindingRedirectUrl('/pages/checkout/index')
        });
        return;
      }
      wx.showToast({
        title: '请先补齐订单信息',
        icon: 'none'
      });
      return;
    }

    this.setData({ submitting: true });

    try {
      const result = await submitOrder(this.data.activePaymentMethod);

      if (result.order.status === 'paid') {
        removeSelectedCartItems();
        setPendingOrdersHighlight(result.order.id);
        wx.redirectTo({
          url: `/pages/order-detail/index?orderId=${result.order.id}`,
          fail: () => {
            checkoutSubmissionLocked = false;
            this.setData({ submitting: false });
          }
        });
        return;
      }

      checkoutSubmissionLocked = false;
      wx.showToast({
        title: '订单待支付确认',
        icon: 'none'
      });
      this.setData({ submitting: false });
    } catch (error) {
      checkoutSubmissionLocked = false;
      this.setData({ submitting: false });
      wx.showToast({
        title:
          error instanceof Error && error.message === 'WECHAT_PAY_NOT_CONFIGURED'
            ? '微信支付暂未配置'
            : error instanceof Error && error.message === 'INSUFFICIENT_BALANCE'
              ? '余额不足'
            : error instanceof Error && error.message === 'DELIVERY_MINIMUM_NOT_MET'
              ? '未达到配送起送金额'
            : error instanceof Error && error.message === 'DELIVERY_OUT_OF_RANGE'
              ? '超出配送范围'
            : error instanceof Error
              ? error.message
              : '下单失败',
        icon: 'none'
      });
    }
  },
  handleReturnCart() {
    wx.navigateBack();
  }
});
