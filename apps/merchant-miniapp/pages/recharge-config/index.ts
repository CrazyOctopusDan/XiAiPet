declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import type { RechargeGiftTemplate, RechargePlanConfig } from '@xiaipet/shared/types/recharge';

import {
  buildRechargeGiftDraft,
  buildRechargePlanDraft,
  getRechargeConfigViewModel,
  normalizeRechargePlansDraft,
  normalizeRechargeMoneyInputText,
  parseRechargeGiftValidDaysInput,
  parseRechargeMoneyInput,
  queryRechargePlans,
  saveRechargePlans
} from '../../src/services/recharge-config';

interface RechargeConfigPageData {
  loading: boolean;
  saving: boolean;
  plans: RechargePlanConfig[];
  expandedPlanId: string;
  view: ReturnType<typeof getRechargeConfigViewModel>;
}

interface RechargeConfigPageInstance {
  data: RechargeConfigPageData;
  setData(updates: Record<string, unknown>): void;
  refreshView(plans: RechargePlanConfig[], expandedPlanId?: string): void;
  refreshPlans(): Promise<void>;
}

function patchPlan(
  plans: RechargePlanConfig[],
  planId: string,
  updater: (plan: RechargePlanConfig) => RechargePlanConfig
): RechargePlanConfig[] {
  return plans.map((plan) => (plan.planId === planId ? updater(plan) : plan));
}

Page({
  data: {
    loading: true,
    saving: false,
    plans: [],
    expandedPlanId: '',
    view: getRechargeConfigViewModel([])
  },
  async onShow(this: RechargeConfigPageInstance) {
    await this.refreshPlans();
  },
  refreshView(this: RechargeConfigPageInstance, plans: RechargePlanConfig[], expandedPlanId?: string) {
    this.setData({
      plans,
      expandedPlanId: expandedPlanId ?? this.data.expandedPlanId,
      view: getRechargeConfigViewModel(plans)
    });
  },
  async refreshPlans(this: RechargeConfigPageInstance) {
    this.setData({ loading: true });
    try {
      const plans = await queryRechargePlans();
      this.setData({ loading: false });
      this.refreshView(plans, plans[0]?.planId ?? '');
    } catch {
      this.setData({ loading: false });
      wx.showToast({
        title: '充值配置加载失败',
        icon: 'none'
      });
    }
  },
  handleTogglePlanExpanded(this: RechargeConfigPageInstance, event: { currentTarget?: { dataset?: { planId?: string } } }) {
    const planId = event.currentTarget?.dataset?.planId ?? '';

    this.setData({
      expandedPlanId: this.data.expandedPlanId === planId ? '' : planId
    });
  },
  handleAddPlan(this: RechargeConfigPageInstance) {
    const draft = buildRechargePlanDraft();
    this.refreshView([...this.data.plans, draft], draft.planId);
  },
  handleDeletePlan(this: RechargeConfigPageInstance, event: { currentTarget?: { dataset?: { planId?: string } } }) {
    const planId = event.currentTarget?.dataset?.planId;

    if (!planId) {
      return;
    }

    wx.showModal({
      title: '删除充值档位',
      content: '删除后需保存才会同步到用户端。',
      success: (result: { confirm?: boolean }) => {
        if (!result.confirm) {
          return;
        }
        const plans = this.data.plans.filter((plan) => plan.planId !== planId);
        this.refreshView(plans, plans[0]?.planId ?? '');
      }
    });
  },
  handlePlanInput(
    this: RechargeConfigPageInstance,
    event: { currentTarget?: { dataset?: { planId?: string; field?: keyof RechargePlanConfig } }; detail?: { value?: string | boolean } }
  ) {
    const planId = event.currentTarget?.dataset?.planId;
    const field = event.currentTarget?.dataset?.field;

    if (!planId || !field) {
      return;
    }

    const rawValue = event.detail?.value;
    const plans = patchPlan(this.data.plans, planId, (plan) => {
      if (field === 'enabled') {
        return { ...plan, enabled: Boolean(rawValue) };
      }

      if (field === 'paidAmount' || field === 'bonusAmount') {
        return { ...plan, [field]: parseRechargeMoneyInput(typeof rawValue === 'string' ? rawValue : '') };
      }

      if (field === 'description') {
        return { ...plan, description: typeof rawValue === 'string' ? rawValue : '' };
      }

      return plan;
    });

    this.refreshView(plans);

    if (field === 'paidAmount' || field === 'bonusAmount') {
      return normalizeRechargeMoneyInputText(typeof rawValue === 'string' ? rawValue : '');
    }
    return undefined;
  },
  handleAddGift(this: RechargeConfigPageInstance, event: { currentTarget?: { dataset?: { planId?: string } } }) {
    const planId = event.currentTarget?.dataset?.planId;

    if (!planId) {
      return;
    }

    const plans = patchPlan(this.data.plans, planId, (plan) => ({
      ...plan,
      gifts: [...plan.gifts, buildRechargeGiftDraft()]
    }));
    this.refreshView(plans, planId);
  },
  handleDeleteGift(this: RechargeConfigPageInstance, event: { currentTarget?: { dataset?: { planId?: string; giftId?: string } } }) {
    const planId = event.currentTarget?.dataset?.planId;
    const giftId = event.currentTarget?.dataset?.giftId;

    if (!planId || !giftId) {
      return;
    }

    const plans = patchPlan(this.data.plans, planId, (plan) => ({
      ...plan,
      gifts: plan.gifts.filter((gift) => gift.giftTemplateId !== giftId)
    }));
    this.refreshView(plans, planId);
  },
  handleGiftInput(
    this: RechargeConfigPageInstance,
    event: {
      currentTarget?: { dataset?: { planId?: string; giftId?: string; field?: keyof RechargeGiftTemplate } };
      detail?: { value?: string };
    }
  ) {
    const planId = event.currentTarget?.dataset?.planId;
    const giftId = event.currentTarget?.dataset?.giftId;
    const field = event.currentTarget?.dataset?.field;

    if (!planId || !giftId || !field) {
      return;
    }

    const rawValue = event.detail?.value ?? '';
    const plans = patchPlan(this.data.plans, planId, (plan) => ({
      ...plan,
      gifts: plan.gifts.map((gift) => {
        if (gift.giftTemplateId !== giftId) {
          return gift;
        }

        if (field === 'validDays') {
          return { ...gift, validDays: parseRechargeGiftValidDaysInput(rawValue) };
        }

        return { ...gift, [field]: rawValue };
      })
    }));

    this.refreshView(plans, planId);

    if (field === 'validDays') {
      return String(parseRechargeGiftValidDaysInput(rawValue) || '');
    }
    return undefined;
  },
  async handleSave(this: RechargeConfigPageInstance) {
    let normalized;
    try {
      normalized = normalizeRechargePlansDraft({ plans: this.data.plans });
    } catch {
      wx.showToast({
        title: '请补全金额和赠品名称',
        icon: 'none'
      });
      return;
    }

    this.setData({ saving: true });
    try {
      const plans = await saveRechargePlans(normalized);
      this.setData({ saving: false });
      this.refreshView(plans, plans[0]?.planId ?? '');
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });
    } catch {
      this.setData({ saving: false });
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    }
  }
});
