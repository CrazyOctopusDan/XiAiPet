declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import type {
  MerchantBalanceAdjustmentAction,
  MerchantBalanceAdjustmentReasonType,
  MerchantUserSearchListItem
} from '@xiaipet/shared/types/user-admin';

import {
  buildBalanceAdjustmentDraft,
  getCachedLatestAdjustment,
  getUserDetailViewModel,
  submitBalanceAdjustment
} from '../../src/services/user-admin';

interface UserDetailPageData {
  user: MerchantUserSearchListItem | null;
  detail: ReturnType<typeof getUserDetailViewModel> | null;
  drawerOpen: boolean;
  action: MerchantBalanceAdjustmentAction;
  amountText: string;
  reasonType: MerchantBalanceAdjustmentReasonType;
  note: string;
  resultingBalanceLabel: string;
  disableSubmitReason: string | null;
  submitting: boolean;
}

interface UserDetailPageInstance {
  data: UserDetailPageData;
  setData(updates: Record<string, unknown>): void;
  refreshDetail(): void;
  updateDraftPreview(): void;
}

Page({
  data: {
    user: null,
    detail: null,
    drawerOpen: false,
    action: 'add',
    amountText: '',
    reasonType: '充值',
    note: '',
    resultingBalanceLabel: '￥0.00',
    disableSubmitReason: '请输入调整金额',
    submitting: false
  },
  onLoad(this: UserDetailPageInstance) {
    this.refreshDetail();
  },
  refreshDetail(this: UserDetailPageInstance) {
    const user = wx.getStorageSync('merchant-selected-user') as MerchantUserSearchListItem | null;

    if (!user) {
      this.setData({
        user: null,
        detail: null
      });
      return;
    }

    const latest = getCachedLatestAdjustment(user.openid);
    this.setData({
      user,
      detail: getUserDetailViewModel(user, latest)
    });
    this.updateDraftPreview();
  },
  updateDraftPreview(this: UserDetailPageInstance) {
    if (!this.data.user) {
      return;
    }

    const draft = buildBalanceAdjustmentDraft(this.data.user, {
      action: this.data.action,
      amountText: this.data.amountText,
      reasonType: this.data.reasonType,
      note: this.data.note
    });

    this.setData({
      resultingBalanceLabel: draft.resultingBalanceLabel,
      disableSubmitReason: draft.disableSubmitReason
    });
  },
  handleOpenDrawer(this: UserDetailPageInstance) {
    this.setData({
      drawerOpen: true
    });
  },
  handleCloseDrawer(this: UserDetailPageInstance) {
    this.setData({
      drawerOpen: false
    });
  },
  handleActionTap(
    this: UserDetailPageInstance,
    event: { currentTarget?: { dataset?: { action?: MerchantBalanceAdjustmentAction } } }
  ) {
    this.setData({
      action: event.currentTarget?.dataset?.action ?? 'add'
    });
    this.updateDraftPreview();
  },
  handleAmountInput(this: UserDetailPageInstance, event: { detail?: { value?: string } }) {
    this.setData({
      amountText: event.detail?.value ?? ''
    });
    this.updateDraftPreview();
  },
  handleReasonTap(
    this: UserDetailPageInstance,
    event: { currentTarget?: { dataset?: { reason?: MerchantBalanceAdjustmentReasonType } } }
  ) {
    this.setData({
      reasonType: event.currentTarget?.dataset?.reason ?? '充值'
    });
    this.updateDraftPreview();
  },
  handleNoteInput(this: UserDetailPageInstance, event: { detail?: { value?: string } }) {
    this.setData({
      note: event.detail?.value ?? ''
    });
    this.updateDraftPreview();
  },
  async handleConfirmAdjust(this: UserDetailPageInstance) {
    if (!this.data.user) {
      return;
    }

    const draft = buildBalanceAdjustmentDraft(this.data.user, {
      action: this.data.action,
      amountText: this.data.amountText,
      reasonType: this.data.reasonType,
      note: this.data.note
    });

    if (draft.disableSubmitReason) {
      wx.showToast({
        title: draft.disableSubmitReason,
        icon: 'none'
      });
      return;
    }

    const risky = this.data.action === 'deduct' || this.data.action === 'set';

    wx.showModal({
      title: '确认余额调整',
      content: risky
        ? '请确认本次余额调整，提交后将生成流水记录。'
        : '请确认本次余额调整，提交后将生成流水记录。',
      success: async (result: { confirm?: boolean }) => {
        if (!result.confirm) {
          return;
        }

        this.setData({ submitting: true });

        await submitBalanceAdjustment(draft);

        const updatedUser = {
          ...this.data.user,
          currentBalance: draft.afterBalance
        };
        wx.setStorageSync('merchant-selected-user', updatedUser);
        this.setData({
          submitting: false,
          drawerOpen: false,
          user: updatedUser,
          amountText: '',
          note: ''
        });
        this.refreshDetail();
        wx.showToast({
          title: '确认余额调整',
          icon: 'success'
        });
      }
    });
  }
});
