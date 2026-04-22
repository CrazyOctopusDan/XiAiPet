declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import { getCheckoutDraft, setCheckoutRemark } from '../../src/services/checkout';
import {
  deleteRemarkHistoryEntry,
  getRemarkHistory,
  rememberRemark
} from '../../src/services/remark-history';

interface CheckoutRemarkPageData {
  remarkValue: string;
  history: string[];
}

interface CheckoutRemarkPageInstance {
  data: CheckoutRemarkPageData;
  setData(data: Record<string, unknown>): void;
  refresh(): void;
}

Page({
  data: {
    remarkValue: '',
    history: []
  },
  onShow(this: CheckoutRemarkPageInstance) {
    this.refresh();
  },
  refresh(this: CheckoutRemarkPageInstance) {
    this.setData({
      remarkValue: getCheckoutDraft().remark,
      history: getRemarkHistory()
    });
  },
  handleInput(this: CheckoutRemarkPageInstance, event: { detail?: { value?: string } }) {
    this.setData({
      remarkValue: event.detail?.value ?? ''
    });
  },
  handleUseHistory(this: CheckoutRemarkPageInstance, event: { currentTarget?: { dataset?: { value?: string } } }) {
    this.setData({
      remarkValue: event.currentTarget?.dataset?.value ?? ''
    });
  },
  handleDeleteHistory(this: CheckoutRemarkPageInstance, event: { currentTarget?: { dataset?: { value?: string } } }) {
    const value = event.currentTarget?.dataset?.value;

    if (!value) {
      return;
    }

    deleteRemarkHistoryEntry(value);
    this.refresh();
  },
  handleConfirm(this: CheckoutRemarkPageInstance) {
    const normalized = this.data.remarkValue.trim();

    setCheckoutRemark(normalized);

    if (normalized) {
      rememberRemark(normalized);
    }

    wx.navigateBack();
  }
});
