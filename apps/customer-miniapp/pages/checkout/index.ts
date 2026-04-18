declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import type { PaymentMethod } from '@xiaipet/shared';

import { beginAddressSelection, type CustomerAddress } from '../../src/services/address';
import {
  getCheckoutViewModel,
  getFulfillmentModes,
  hydratePickupPhoneFromProfile,
  setCustomNoticeAcknowledged,
  setFulfillmentMode,
  setPickupPhone,
  setReservationSelection,
  toggleSelectedPet,
  type FulfillmentMode,
  type FulfillmentModeOption,
  type ReservationDayOption
} from '../../src/services/checkout';
import { getCartItems, getCartSummary, type CartItem } from '../../src/services/cart';
import { getPets, type PetProfile } from '../../src/services/pets';
import { getCheckoutPricingPreview, submitOrder } from '../../src/services/order-submit';
import { hydrateCustomerRuntimeConfig } from '../../src/services/runtime-config';

interface PaymentMethodOption {
  value: PaymentMethod;
  label: string;
  hint: string;
}

interface NavigationMetrics {
  statusBarHeight: number;
  navBarHeight: number;
  contentTop: number;
}

interface CheckoutPageData {
  navMetrics: NavigationMetrics;
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
  pickupPhone: string;
  pets: PetProfile[];
  selectedPetIds: string[];
  remarkSummary: string;
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
  submitting: boolean;
}

interface CheckoutPageInstance {
  data: CheckoutPageData;
  setData(data: Record<string, unknown>): void;
  refreshCheckout(): void;
  refreshRuntimeConfig(): Promise<void>;
  handleSubmit(): Promise<void>;
}

const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    value: 'wechat',
    label: '微信支付',
    hint: '走微信支付收银台'
  },
  {
    value: 'balance',
    label: '余额支付',
    hint: '优先扣除当前账户余额'
  }
];

function getNavigationMetrics(): NavigationMetrics {
  const windowInfo = wx.getWindowInfo?.() ?? wx.getSystemInfoSync?.() ?? {};
  const menuButton = wx.getMenuButtonBoundingClientRect?.();
  const statusBarHeight = windowInfo.statusBarHeight ?? 20;

  if (!menuButton) {
    const navBarHeight = 44;
    return {
      statusBarHeight,
      navBarHeight,
      contentTop: statusBarHeight + navBarHeight
    };
  }

  const navBarHeight = Math.max(44, menuButton.bottom + menuButton.top - statusBarHeight);
  return {
    statusBarHeight,
    navBarHeight,
    contentTop: statusBarHeight + navBarHeight
  };
}

Page({
  data: {
    navMetrics: getNavigationMetrics(),
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
    pickupPhone: '',
    pets: [],
    selectedPetIds: [],
    remarkSummary: '',
    customNotice: '',
    hasReadCustomNotice: false,
    canSubmit: false,
    submitDisabledReasons: [],
    storeName: '',
    storeAddress: '',
    storePhone: '',
    deliveryRuleRows: [],
    paymentMethods: PAYMENT_METHODS,
    activePaymentMethod: 'wechat',
    deliveryFee: 0,
    payableTotal: 0,
    deliveryFeeLabel: '待确认',
    submitting: false
  },
  onLoad(this: CheckoutPageInstance) {
    this.setData({ navMetrics: getNavigationMetrics() });
  },
  onShow(this: CheckoutPageInstance) {
    this.refreshCheckout();
    void this.refreshRuntimeConfig();
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
    const activePaymentMethod = this.data.activePaymentMethod ?? 'wechat';

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
      pickupPhone: view.pickupPhone,
      pets: getPets(),
      selectedPetIds: view.selectedPets.map((item) => item.id),
      remarkSummary: view.remark || '还没有填写备注',
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
          ? view.deliveryRuleExplainers[0] ?? '按配送距离计算'
          : '当前模式免配送费'
    });
  },
  handleBackTap() {
    wx.navigateBack();
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
  handleReservationTap(
    this: CheckoutPageInstance,
    event: { currentTarget?: { dataset?: { dateValue?: string; dateLabel?: string; timeValue?: string; timeLabel?: string } } }
  ) {
    const dateValue = event.currentTarget?.dataset?.dateValue;
    const dateLabel = event.currentTarget?.dataset?.dateLabel;
    const timeValue = event.currentTarget?.dataset?.timeValue;
    const timeLabel = event.currentTarget?.dataset?.timeLabel;

    if (!dateValue || !dateLabel || !timeValue || !timeLabel) {
      return;
    }

    setReservationSelection({
      dateLabel,
      dateValue,
      timeLabel,
      timeValue
    });
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
  handlePaymentMethodTap(this: CheckoutPageInstance, event: { currentTarget?: { dataset?: { method?: PaymentMethod } } }) {
    const method = event.currentTarget?.dataset?.method;

    if (!method) {
      return;
    }

    this.setData({
      activePaymentMethod: method
    });
  },
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
    if (this.data.submitting) {
      return;
    }

    if (!this.data.canSubmit) {
      wx.showToast({
        title: '请先补齐订单信息',
        icon: 'none'
      });
      return;
    }

    this.setData({ submitting: true });

    try {
      const result = await submitOrder(this.data.activePaymentMethod);
      this.setData({ submitting: false });

      if (result.order.status === 'paid') {
        wx.redirectTo({
          url: `/pages/orders/index?highlightOrderId=${result.order.id}`
        });
        return;
      }

      wx.showToast({
        title: '订单待支付确认',
        icon: 'none'
      });
    } catch (error) {
      this.setData({ submitting: false });
      wx.showToast({
        title:
          error instanceof Error && error.message === 'WECHAT_PAY_NOT_CONFIGURED'
            ? '微信支付暂未配置'
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
