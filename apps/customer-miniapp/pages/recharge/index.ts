declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import type { RechargePlanConfig } from '@xiaipet/shared';

import {
  getRechargePlans,
  getSelectedRechargePlan,
  hydrateRechargePlans,
  selectRechargePlan,
  startRecharge
} from '../../src/services/recharge';

interface RechargePageData {
  plans: RechargePlanConfig[];
  selectedPlanId: string;
  selectedPlan: RechargePlanConfig | null;
  loading: boolean;
  submitting: boolean;
}

interface RechargePageInstance {
  data: RechargePageData;
  rechargeIdempotencyKey: string;
  rechargeIdempotencyPlanId: string;
  rechargeTransactionStarted: boolean;
  setData(data: Record<string, unknown>): void;
  refreshPlans(): Promise<void>;
  refreshSelection(plan?: RechargePlanConfig | null): void;
}

function createPageRechargeKey() {
  return `recharge-page-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function resetRechargeSubmissionState(page: RechargePageInstance) {
  page.rechargeIdempotencyKey = createPageRechargeKey();
  page.rechargeIdempotencyPlanId = '';
  page.rechargeTransactionStarted = false;
}

Page({
  data: {
    plans: [],
    selectedPlanId: '',
    selectedPlan: null,
    loading: false,
    submitting: false
  },
  rechargeIdempotencyKey: '',
  rechargeIdempotencyPlanId: '',
  rechargeTransactionStarted: false,
  onLoad(this: RechargePageInstance) {
    resetRechargeSubmissionState(this);
  },
  onShow(this: RechargePageInstance) {
    void this.refreshPlans();
  },
  async refreshPlans(this: RechargePageInstance) {
    this.setData({ loading: true });
    try {
      await hydrateRechargePlans();
    } catch {
      wx.showToast({
        title: '充值方案加载失败',
        icon: 'none'
      });
    }
    this.refreshSelection(getSelectedRechargePlan());
    this.setData({ loading: false });
  },
  refreshSelection(this: RechargePageInstance, plan?: RechargePlanConfig | null) {
    const plans = getRechargePlans();
    const selectedPlan = plan ?? plans[0] ?? null;

    this.setData({
      plans,
      selectedPlanId: selectedPlan?.planId ?? '',
      selectedPlan
    });
  },
  handlePlanTap(this: RechargePageInstance, event: { currentTarget?: { dataset?: { planId?: string } } }) {
    const planId = event.currentTarget?.dataset?.planId;

    if (!planId) {
      return;
    }

    if (planId !== this.data.selectedPlanId && this.rechargeIdempotencyPlanId !== planId) {
      resetRechargeSubmissionState(this);
    }

    this.refreshSelection(selectRechargePlan(planId));
  },
  async handleSubmitRecharge(this: RechargePageInstance) {
    if (!this.data.selectedPlanId || this.data.submitting) {
      return;
    }

    this.setData({ submitting: true });
    if (this.rechargeIdempotencyPlanId && this.rechargeIdempotencyPlanId !== this.data.selectedPlanId) {
      resetRechargeSubmissionState(this);
    }
    if (!this.rechargeIdempotencyPlanId) {
      this.rechargeIdempotencyPlanId = this.data.selectedPlanId;
    }
    this.rechargeTransactionStarted = true;
    try {
      await startRecharge(this.data.selectedPlanId, undefined, {
        idempotencyKey: this.rechargeIdempotencyKey
      });
      resetRechargeSubmissionState(this);
      wx.showToast({
        title: '充值成功',
        icon: 'success'
      });
      wx.navigateBack();
    } catch {
      wx.showToast({
        title: '充值未完成',
        icon: 'none'
      });
    } finally {
      this.setData({ submitting: false });
    }
  }
});
