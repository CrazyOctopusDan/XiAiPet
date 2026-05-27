declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import type {
  MerchantBalanceAdjustmentAction,
  MerchantBalanceAdjustmentReasonType,
  MerchantBalanceLedgerEntry,
  MerchantUserAddressItem,
  MerchantUserDetail,
  MerchantUserSearchListItem
} from '@xiaipet/shared/types/user-admin';

import {
  buildBalanceAdjustmentDraft,
  fetchMerchantUserAddresses,
  fetchMerchantUserBalanceLedgers,
  fetchMerchantUserDetail,
  getBalanceAdjustmentReasonOptions,
  getCachedLatestAdjustment,
  getUserDetailViewModel,
  submitBalanceAdjustment,
  type UserDetailTabKey
} from '../../src/services/user-admin';
import { getMerchantSession } from '../../src/services/api-client';

interface UserDetailSections {
  addresses?: MerchantUserAddressItem[];
  balanceLedgers?: MerchantBalanceLedgerEntry[];
  balanceLedgerCount?: number;
  currentBalance?: number;
}

interface UserDetailPageData {
  user: MerchantUserSearchListItem | null;
  detail: ReturnType<typeof getUserDetailViewModel> | null;
  drawerOpen: boolean;
  action: MerchantBalanceAdjustmentAction;
  reasonOptions: MerchantBalanceAdjustmentReasonType[];
  amountText: string;
  reasonType: MerchantBalanceAdjustmentReasonType;
  note: string;
  resultingBalanceLabel: string;
  disableSubmitReason: string | null;
  submitting: boolean;
  canAdjustBalance: boolean;
  activeDetailTab: UserDetailTabKey;
  addressesLoaded: boolean;
  addressesLoading: boolean;
  ledgerLoaded: boolean;
  ledgerLoading: boolean;
  ledgerHasMore: boolean;
  ledgerNextCursor: string | null;
}

interface UserDetailPageInstance {
  data: UserDetailPageData;
  setData(updates: Record<string, unknown>): void;
  refreshDetail(openid?: string): Promise<void>;
  mergeDetailSections(sections: UserDetailSections): MerchantUserSearchListItem | MerchantUserDetail | null;
  loadAddresses(): Promise<void>;
  loadMoreLedgers(reset?: boolean): Promise<void>;
  updateDraftPreview(): void;
}

function normalizeMoneyInputText(value: string | undefined): string {
  const sanitized = (value ?? '').replace(/[^\d.]/g, '');
  const [integerPart = '', ...decimalParts] = sanitized.split('.');

  if (!sanitized.includes('.')) {
    return integerPart;
  }

  return `${integerPart}.${decimalParts.join('').slice(0, 2)}`;
}

function normalizeBalanceAction(action?: MerchantBalanceAdjustmentAction): MerchantBalanceAdjustmentAction {
  return action === 'deduct' ? 'deduct' : 'add';
}

Page({
  data: {
    user: null,
    detail: null,
    drawerOpen: false,
    action: 'add',
    reasonOptions: getBalanceAdjustmentReasonOptions('add'),
    amountText: '',
    reasonType: '充值',
    note: '',
    resultingBalanceLabel: '￥0.00',
    disableSubmitReason: '请输入调整金额',
    submitting: false,
    canAdjustBalance: true,
    activeDetailTab: 'basic',
    addressesLoaded: false,
    addressesLoading: false,
    ledgerLoaded: false,
    ledgerLoading: false,
    ledgerHasMore: false,
    ledgerNextCursor: null
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
        detail: getUserDetailViewModel(user, user.latestAdjustment),
        addressesLoaded: false,
        addressesLoading: false,
        ledgerLoaded: false,
        ledgerLoading: false,
        ledgerHasMore: false,
        ledgerNextCursor: null
      });
      this.updateDraftPreview();
    } catch (error) {
      console.error('fetch merchant user detail failed', error);
    }
  },
  mergeDetailSections(this: UserDetailPageInstance, sections: UserDetailSections) {
    if (!this.data.user) {
      return null;
    }

    const current = this.data.user as MerchantUserDetail;
    const merged: MerchantUserDetail = {
      ...current,
      currentBalance: sections.currentBalance ?? current.currentBalance,
      latestAdjustment: current.latestAdjustment ?? getCachedLatestAdjustment(current.openid),
      addresses: sections.addresses ?? current.addresses ?? [],
      balanceLedgers: sections.balanceLedgers ?? current.balanceLedgers ?? [],
      addressCount: sections.addresses?.length ?? current.addressCount,
      balanceLedgerCount: sections.balanceLedgerCount ?? current.balanceLedgerCount
    };
    wx.setStorageSync('merchant-selected-user', merged);
    this.setData({
      user: merged,
      detail: getUserDetailViewModel(merged, merged.latestAdjustment)
    });
    this.updateDraftPreview();
    return merged;
  },
  async loadAddresses(this: UserDetailPageInstance) {
    if (!this.data.user || this.data.addressesLoading || this.data.addressesLoaded) {
      return;
    }

    this.setData({ addressesLoading: true });
    try {
      const addresses = await fetchMerchantUserAddresses(this.data.user.openid);
      this.mergeDetailSections({ addresses });
      this.setData({
        addressesLoaded: true,
        addressesLoading: false
      });
    } catch (error) {
      this.setData({ addressesLoading: false });
      wx.showToast({
        title: '地址加载失败',
        icon: 'none'
      });
    }
  },
  async loadMoreLedgers(this: UserDetailPageInstance, reset = false) {
    if (!this.data.user || this.data.ledgerLoading) {
      return;
    }
    if (!reset && this.data.ledgerLoaded && !this.data.ledgerHasMore) {
      return;
    }

    const cursor = reset ? '0' : this.data.ledgerNextCursor;
    this.setData({ ledgerLoading: true });
    try {
      const page = await fetchMerchantUserBalanceLedgers(this.data.user.openid, {
        cursor,
        limit: 20
      });
      const currentLedgers = reset ? [] : ((this.data.user as MerchantUserDetail).balanceLedgers ?? []);
      const existingIds = new Set(currentLedgers.map((item) => item.id));
      const mergedLedgers = [
        ...currentLedgers,
        ...page.records.filter((item) => !existingIds.has(item.id))
      ];
      this.mergeDetailSections({
        balanceLedgers: mergedLedgers,
        balanceLedgerCount: page.pagination.total
      });
      this.setData({
        ledgerLoaded: true,
        ledgerLoading: false,
        ledgerHasMore: page.pagination.hasMore,
        ledgerNextCursor: page.pagination.nextCursor
      });
    } catch (error) {
      this.setData({ ledgerLoading: false });
      wx.showToast({
        title: '流水加载失败',
        icon: 'none'
      });
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
      reasonType: draft.reasonType,
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
    const action = normalizeBalanceAction(event.currentTarget?.dataset?.action);
    const reasonOptions = getBalanceAdjustmentReasonOptions(action);
    this.setData({
      action,
      reasonOptions,
      reasonType: reasonOptions[0]
    });
    this.updateDraftPreview();
  },
  handleAmountInput(this: UserDetailPageInstance, event: { detail?: { value?: string } }) {
    const amountText = normalizeMoneyInputText(event.detail?.value);
    this.setData({
      amountText
    });
    this.updateDraftPreview();
    return amountText;
  },
  handleReasonTap(
    this: UserDetailPageInstance,
    event: { currentTarget?: { dataset?: { reason?: MerchantBalanceAdjustmentReasonType } } }
  ) {
    const reasonType = event.currentTarget?.dataset?.reason ?? this.data.reasonOptions[0] ?? '充值';
    this.setData({
      reasonType
    });
    this.updateDraftPreview();
  },
  handleNoteInput(this: UserDetailPageInstance, event: { detail?: { value?: string } }) {
    this.setData({
      note: event.detail?.value ?? ''
    });
    this.updateDraftPreview();
  },
  handleDetailTabTap(this: UserDetailPageInstance, event: { currentTarget?: { dataset?: { tab?: UserDetailTabKey } } }) {
    const nextTab = event.currentTarget?.dataset?.tab ?? 'basic';
    this.setData({
      activeDetailTab: nextTab
    });
    if (nextTab === 'addresses') {
      void this.loadAddresses();
    }
    if (nextTab === 'ledger') {
      void this.loadMoreLedgers(false);
    }
  },
  onReachBottom(this: UserDetailPageInstance) {
    if (this.data.activeDetailTab === 'ledger') {
      void this.loadMoreLedgers(false);
    }
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

    const risky = this.data.action === 'deduct';

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
            note: '',
            ledgerLoaded: false,
            ledgerHasMore: false,
            ledgerNextCursor: null
          });
          await this.refreshDetail(updatedUser.openid);
          if (this.data.activeDetailTab === 'ledger') {
            await this.loadMoreLedgers(true);
          }
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
