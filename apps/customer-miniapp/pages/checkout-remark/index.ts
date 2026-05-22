declare const wx: any;
declare function Page(options: Record<string, unknown>): void;
declare function getCurrentPages(): Array<Record<string, unknown>>;

import { getCheckoutDraft, setCheckoutRemark } from '../../src/services/checkout';
import {
  deleteRemarkHistoryEntry,
  getRemarkHistory,
  hydrateRemarkHistory,
  normalizeRemark,
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
  syncRemark(value?: string): string;
}

function refreshPreviousCheckoutPage() {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
  const previousPage = pages[pages.length - 2] as { refreshCheckout?: () => void } | undefined;
  previousPage?.refreshCheckout?.();
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
    hydrateRemarkHistory();
    this.setData({
      remarkValue: getCheckoutDraft().remark,
      history: getRemarkHistory()
    });
  },
  syncRemark(this: CheckoutRemarkPageInstance, value?: string) {
    const normalized = normalizeRemark(value ?? this.data.remarkValue);
    setCheckoutRemark(normalized);
    refreshPreviousCheckoutPage();
    return normalized;
  },
  handleInput(this: CheckoutRemarkPageInstance, event: { detail?: { value?: string } }) {
    const remarkValue = normalizeRemark(event.detail?.value ?? '');
    this.setData({
      remarkValue
    });
    this.syncRemark(remarkValue);
  },
  handleUseHistory(this: CheckoutRemarkPageInstance, event: { currentTarget?: { dataset?: { value?: string } } }) {
    const value = normalizeRemark(event.currentTarget?.dataset?.value ?? '');
    if (value) {
      rememberRemark(value);
    }

    this.setData({
      remarkValue: value,
      history: getRemarkHistory()
    });
    this.syncRemark(value);
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
    const normalized = this.syncRemark();

    if (normalized) {
      rememberRemark(normalized);
    }

    wx.navigateBack();
  }
});
