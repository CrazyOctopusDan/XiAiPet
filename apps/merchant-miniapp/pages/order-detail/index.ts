declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import type { OrderManualSettlementMethod } from '@xiaipet/shared';

import type {
  MerchantManagedOrderRecord,
  MerchantOrderDetailResponse,
  MerchantOrderDetailViewModel,
  MerchantOrderStatusOption
} from '../../src/services/orders';
import {
  getMerchantOrderDetail,
  getMerchantOrderDetailViewModel,
  updateMerchantOrderStatus
} from '../../src/services/orders';

interface AdjustmentMethodOption {
  value: OrderManualSettlementMethod;
  label: string;
}

interface OrderDetailPageData {
  orderId: string;
  loading: boolean;
  isEmpty: boolean;
  detail: MerchantOrderDetailViewModel | null;
  isDrawerOpen: boolean;
  selectedStatusValue: string;
  adjustmentMethod: OrderManualSettlementMethod;
  adjustmentMethods: AdjustmentMethodOption[];
  reasonNote: string;
  submitting: boolean;
}

interface OrderDetailPageInstance {
  data: OrderDetailPageData;
  currentOrder: MerchantManagedOrderRecord | null;
  setData(updates: Record<string, unknown>): void;
  refreshDetail(): Promise<void>;
}

const ADJUSTMENT_METHODS: AdjustmentMethodOption[] = [
  {
    value: 'manual_override',
    label: '人工兜底'
  },
  {
    value: 'offline_collection',
    label: '线下收款'
  }
];

function getDefaultStatusValue(detail: MerchantOrderDetailViewModel | null) {
  return detail?.statusOptions[0]?.value ?? '';
}

function findStatusOption(detail: MerchantOrderDetailViewModel | null, value: string) {
  return detail?.statusOptions.find((item) => item.value === value) ?? null;
}

Page({
  data: {
    orderId: '',
    loading: true,
    isEmpty: true,
    detail: null,
    isDrawerOpen: false,
    selectedStatusValue: '',
    adjustmentMethod: 'manual_override',
    adjustmentMethods: ADJUSTMENT_METHODS,
    reasonNote: '',
    submitting: false
  },
  currentOrder: null,
  onLoad(this: OrderDetailPageInstance, options?: { orderId?: string }) {
    this.setData({
      orderId: options?.orderId ?? ''
    });
  },
  async onShow(this: OrderDetailPageInstance) {
    await this.refreshDetail();
  },
  async refreshDetail(this: OrderDetailPageInstance) {
    if (!this.data.orderId) {
      this.currentOrder = null;
      this.setData({
        loading: false,
        isEmpty: true,
        detail: null
      });
      return;
    }

    this.setData({ loading: true });

    const response = (await getMerchantOrderDetail(this.data.orderId)) as MerchantOrderDetailResponse;
    const detail = getMerchantOrderDetailViewModel(response);

    this.currentOrder = response.order;

    this.setData({
      loading: false,
      isEmpty: !detail,
      detail,
      selectedStatusValue: getDefaultStatusValue(detail),
      reasonNote: ''
    });
  },
  handleBackTap() {
    wx.navigateBack();
  },
  handleOpenStatusDrawer(this: OrderDetailPageInstance) {
    if (!this.data.detail?.canUpdateStatus) {
      return;
    }

    this.setData({
      isDrawerOpen: true,
      selectedStatusValue: this.data.selectedStatusValue || getDefaultStatusValue(this.data.detail)
    });
  },
  handleCloseStatusDrawer(this: OrderDetailPageInstance) {
    this.setData({
      isDrawerOpen: false
    });
  },
  handleStatusOptionTap(this: OrderDetailPageInstance, event: { currentTarget?: { dataset?: { value?: string } } }) {
    const value = event.currentTarget?.dataset?.value;

    if (!value) {
      return;
    }

    this.setData({
      selectedStatusValue: value
    });
  },
  handleAdjustmentMethodTap(
    this: OrderDetailPageInstance,
    event: { currentTarget?: { dataset?: { value?: OrderManualSettlementMethod } } }
  ) {
    const value = event.currentTarget?.dataset?.value;

    if (!value) {
      return;
    }

    this.setData({
      adjustmentMethod: value
    });
  },
  handleReasonInput(this: OrderDetailPageInstance, event: { detail?: { value?: string } }) {
    this.setData({
      reasonNote: event.detail?.value ?? ''
    });
  },
  async handleSubmitStatus(this: OrderDetailPageInstance) {
    if (!this.currentOrder || !this.data.detail) {
      return;
    }

    const selected = findStatusOption(this.data.detail, this.data.selectedStatusValue);

    if (!selected) {
      wx.showToast({
        title: '请选择下一状态',
        icon: 'none'
      });
      return;
    }

    if (this.data.detail.requiresManualSettlement && !this.data.reasonNote.trim()) {
      wx.showToast({
        title: '请填写原因备注',
        icon: 'none'
      });
      return;
    }

    this.setData({ submitting: true });

    try {
      await updateMerchantOrderStatus({
        order: this.currentOrder,
        nextStatus: selected.value as MerchantOrderStatusOption['value'],
        adjustmentMethod: this.data.detail.requiresManualSettlement ? this.data.adjustmentMethod : undefined,
        reasonNote: this.data.detail.requiresManualSettlement ? this.data.reasonNote.trim() : undefined
      });

      wx.showToast({
        title: '更新成功',
        icon: 'success'
      });

      this.setData({
        isDrawerOpen: false,
        submitting: false,
        reasonNote: ''
      });

      await this.refreshDetail();
    } catch (error) {
      this.setData({ submitting: false });
      wx.showToast({
        title: '更新失败，请重试',
        icon: 'none'
      });
    }
  }
});
