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
  setData(data: Record<string, unknown>): void;
  refreshPlans(): Promise<void>;
  refreshSelection(plan?: RechargePlanConfig | null): void;
}

function createPageRechargeKey() {
  return `recharge-page-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
  onLoad(this: RechargePageInstance) {
    this.rechargeIdempotencyKey = createPageRechargeKey();
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

    this.refreshSelection(selectRechargePlan(planId));
  },
  async handleSubmitRecharge(this: RechargePageInstance) {
    if (!this.data.selectedPlanId || this.data.submitting) {
      return;
    }

    this.setData({ submitting: true });
    try {
      await startRecharge(this.data.selectedPlanId, undefined, {
        idempotencyKey: this.rechargeIdempotencyKey
      });
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
      this.rechargeIdempotencyKey = createPageRechargeKey();
      this.setData({ submitting: false });
    }
  }
});
