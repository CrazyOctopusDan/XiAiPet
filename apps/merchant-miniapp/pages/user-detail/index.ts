declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import type {
  MerchantBalanceAdjustmentAction,
  MerchantBalanceAdjustmentReasonType,
  MerchantUserSearchListItem
} from '@xiaipet/shared/types/user-admin';

import {
  buildBalanceAdjustmentDraft,
  fetchMerchantUserDetail,
  getCachedLatestAdjustment,
  getUserDetailViewModel,
  submitBalanceAdjustment
} from '../../src/services/user-admin';
import { getMerchantSession } from '../../src/services/api-client';

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
  canAdjustBalance: boolean;
}

interface UserDetailPageInstance {
  data: UserDetailPageData;
  setData(updates: Record<string, unknown>): void;
  refreshDetail(openid?: string): Promise<void>;
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
    submitting: false,
    canAdjustBalance: true
  },
  onLoad(this: UserDetailPageInstance, options?: { openid?: string }) {
    this.setData({
      canAdjustBalance: getMerchantSession()?.account?.role !== 'staff'
    });
    void this.refreshDetail(options?.openid);
  },
  async refreshDetail(this: UserDetailPageInstance, openid?: string) {
    const cachedUser = wx.getStorageSync('merchant-selected-user') as MerchantUserSearchListItem | null;
    const targetOpenid = openid ?? cachedUser?.openid;

    if (!targetOpenid) {
      this.setData({
        user: null,
        detail: null
      });
      return;
    }

    if (cachedUser) {
      const latest = getCachedLatestAdjustment(cachedUser.openid);
      this.setData({
        user: cachedUser,
        detail: getUserDetailViewModel(cachedUser, latest)
      });
      this.updateDraftPreview();
    }

    try {
      const user = await fetchMerchantUserDetail(targetOpenid);
      if (!user) {
        this.setData({
          user: null,
          detail: null
        });
        return;
      }
      wx.setStorageSync('merchant-selected-user', user);
      this.setData({
        user,
        detail: getUserDetailViewModel(user, user.latestAdjustment)
      });
      this.updateDraftPreview();
    } catch (error) {
      console.error('fetch merchant user detail failed', error);
    }
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
    if (!this.data.canAdjustBalance) {
      wx.showToast({
        title: '当前账号不能调整储值',
        icon: 'none'
      });
      return;
    }
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

        try {
          const response = await submitBalanceAdjustment(draft);
          const updatedUser = {
            ...this.data.user,
            currentBalance: response.balanceAfter ?? draft.afterBalance
          };
          wx.setStorageSync('merchant-selected-user', updatedUser);
          this.setData({
            submitting: false,
            drawerOpen: false,
            user: updatedUser,
            amountText: '',
            note: ''
          });
          await this.refreshDetail(updatedUser.openid);
          wx.showToast({
            title: '调整成功',
            icon: 'success'
          });
        } catch (error) {
          this.setData({ submitting: false });
          wx.showToast({
            title: error instanceof Error ? error.message : '调整失败，请重试',
            icon: 'none'
          });
        }
      }
    });
  }
});
