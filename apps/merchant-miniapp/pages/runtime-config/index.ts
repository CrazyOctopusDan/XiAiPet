declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import type { RuntimeConfigSectionDocument, RuntimeConfigSectionId } from '@xiaipet/shared/types/runtime-config';

import {
  buildDeliveryRuleExplainer,
  buildRuntimeConfigSectionDocument,
  getRuntimeConfigAdminViewModel,
  queryRuntimeConfigSections,
  saveRuntimeConfigSection,
  uploadRuntimeBannerAsset
} from '../../src/services/runtime-config-admin';

interface RuntimeConfigPageData {
  loading: boolean;
  dirty: Record<string, boolean>;
  sections: RuntimeConfigSectionDocument[];
  view: ReturnType<typeof getRuntimeConfigAdminViewModel>;
  deliveryEditorVisible: boolean;
  deliveryEditorIndex: number;
  deliveryEditorDraft: {
    distanceKm: string;
    minimumOrderAmount: string;
    deliveryFee: string;
  };
}

interface RuntimeConfigPageInstance {
  data: RuntimeConfigPageData;
  setData(updates: Record<string, unknown>): void;
  refreshSections(): Promise<void>;
  patchSection(sectionId: RuntimeConfigSectionId, updater: (section: RuntimeConfigSectionDocument) => RuntimeConfigSectionDocument): void;
  handleCloseDeliveryEditor(): void;
}

function getSection(sections: RuntimeConfigSectionDocument[], sectionId: RuntimeConfigSectionId) {
  return sections.find((item) => item.sectionId === sectionId) ?? null;
}

function refreshView(instance: RuntimeConfigPageInstance, sections: RuntimeConfigSectionDocument[], dirty: Record<string, boolean>) {
  instance.setData({
    sections,
    dirty,
    view: getRuntimeConfigAdminViewModel(sections, dirty)
  });
}

function getStoreProfileFallback() {
  return {
    storeName: '',
    address: '',
    latitude: 0,
    longitude: 0,
    wechatId: '',
    ownerPhone: ''
  };
}

function getDeliveryRulesSection(sections: RuntimeConfigSectionDocument[]) {
  const section = getSection(sections, 'delivery-rules');
  return section?.sectionId === 'delivery-rules' ? section : null;
}

function buildDeliveryRuleDraft(row?: { distanceKm: number; minimumOrderAmount: number | null; deliveryFee: number }) {
  return {
    distanceKm: row ? String(row.distanceKm) : '',
    minimumOrderAmount: row?.minimumOrderAmount === null || row?.minimumOrderAmount === undefined ? '' : String(row.minimumOrderAmount),
    deliveryFee: row ? String(row.deliveryFee) : ''
  };
}

function normalizeMoneyInputText(value: string | undefined): string {
  const sanitized = (value ?? '').replace(/[^\d.]/g, '');
  const [integerPart = '', ...decimalParts] = sanitized.split('.');

  if (!sanitized.includes('.')) {
    return integerPart;
  }

  return `${integerPart}.${decimalParts.join('').slice(0, 2)}`;
}

function parseMoneyInput(value: string | undefined): number {
  const numeric = Number(normalizeMoneyInputText(value));

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0;
  }

  return Math.floor(numeric * 100) / 100;
}

Page({
  data: {
    loading: true,
    dirty: {},
    sections: [],
    view: {
      summary: {
        totalSections: 0,
        dirtySections: 0,
        deliveryRuleCount: 0
      },
      sections: []
    },
    deliveryEditorVisible: false,
    deliveryEditorIndex: -1,
    deliveryEditorDraft: buildDeliveryRuleDraft()
  },
  async onShow(this: RuntimeConfigPageInstance) {
    await this.refreshSections();
  },
  async refreshSections(this: RuntimeConfigPageInstance) {
    this.setData({ loading: true });
    try {
      const sections = await queryRuntimeConfigSections();
      this.setData({
        loading: false
      });
      refreshView(this, sections, this.data.dirty);
    } catch {
      this.setData({ loading: false });
      wx.showToast({
        title: '配置加载失败',
        icon: 'none'
      });
    }
  },
  patchSection(this: RuntimeConfigPageInstance, sectionId: RuntimeConfigSectionId, updater: (section: RuntimeConfigSectionDocument) => RuntimeConfigSectionDocument) {
    const sections = this.data.sections.map((section) => (section.sectionId === sectionId ? updater(section) : section));
    const dirty = {
      ...this.data.dirty,
      [sectionId]: true
    };
    refreshView(this, sections, dirty);
  },
  handleStoreInput(
    this: RuntimeConfigPageInstance,
    event: { currentTarget?: { dataset?: { field?: string } }; detail?: { value?: string } }
  ) {
    const field = event.currentTarget?.dataset?.field;
    const value = event.detail?.value ?? '';

    if (!field) {
      return;
    }

    this.patchSection('store-profile', (section) =>
      buildRuntimeConfigSectionDocument('store-profile', {
        ...(section.sectionId === 'store-profile' ? section.value : getStoreProfileFallback()),
        [field]: value
      }, section)
    );
  },
  handleChooseStoreLocation(this: RuntimeConfigPageInstance) {
    wx.chooseLocation({
      success: (result: { name?: string; address?: string; latitude?: number; longitude?: number }) => {
        this.patchSection('store-profile', (section) =>
          buildRuntimeConfigSectionDocument(
            'store-profile',
            {
              ...(section.sectionId === 'store-profile' ? section.value : getStoreProfileFallback()),
              address: result.address || result.name || '',
              latitude: result.latitude ?? 0,
              longitude: result.longitude ?? 0
            },
            section
          )
        );
      },
      fail: (error: { errMsg?: string }) => {
        const message = error.errMsg ?? '';

        if (message.includes('cancel')) {
          wx.showToast({
            title: '已取消选择位置',
            icon: 'none'
          });
          return;
        }

        const content = message.includes('auth') || message.includes('authorize') || message.includes('permission')
          ? '位置权限未开启。请在微信开发者工具或手机系统权限中允许使用位置后重试。'
          : '位置选择失败。请检查小程序后台是否开通位置接口，并确认 app.json 已声明位置权限用途。';

        wx.showModal({
          title: '无法选择店铺位置',
          content,
          showCancel: false,
          confirmText: '知道了'
        });
      }
    });
  },
  handleMembershipInput(
    this: RuntimeConfigPageInstance,
    event: { currentTarget?: { dataset?: { index?: string; field?: string } }; detail?: { value?: string } }
  ) {
    const index = Number(event.currentTarget?.dataset?.index ?? -1);
    const field = event.currentTarget?.dataset?.field;
    const value = field === 'threshold' ? normalizeMoneyInputText(event.detail?.value) : (event.detail?.value ?? '');

    this.patchSection('membership-tiers', (section) => {
      if (section.sectionId !== 'membership-tiers') {
        return section;
      }

      const tiers = [...section.value.tiers];
      const current = tiers[index];

      if (!current || !field) {
        return section;
      }

      tiers[index] = {
        ...current,
        [field]: field === 'threshold' ? parseMoneyInput(value) : value
      };

      return buildRuntimeConfigSectionDocument('membership-tiers', { tiers }, section);
    });
    return value;
  },
  handleAddTier(this: RuntimeConfigPageInstance) {
    this.patchSection('membership-tiers', (section) => {
      if (section.sectionId !== 'membership-tiers') {
        return section;
      }

      return buildRuntimeConfigSectionDocument(
        'membership-tiers',
        {
          tiers: [
            ...section.value.tiers,
            {
              tierId: `tier-${Date.now()}`,
              threshold: 0,
              name: '',
              description: ''
            }
          ]
        },
        section
      );
    });
  },
  handleAddDeliveryRule(this: RuntimeConfigPageInstance) {
    this.setData({
      deliveryEditorVisible: true,
      deliveryEditorIndex: -1,
      deliveryEditorDraft: buildDeliveryRuleDraft()
    });
  },
  handleDeliveryRowTap(this: RuntimeConfigPageInstance, event: { currentTarget?: { dataset?: { index?: string } } }) {
    const index = Number(event.currentTarget?.dataset?.index ?? -1);
    const section = getDeliveryRulesSection(this.data.sections);
    const row = section?.value.tiers[index];

    if (!row) {
      return;
    }

    wx.showActionSheet({
      itemList: ['编辑', '删除'],
      success: (result: { tapIndex?: number }) => {
        if (result.tapIndex === 0) {
          this.setData({
            deliveryEditorVisible: true,
            deliveryEditorIndex: index,
            deliveryEditorDraft: buildDeliveryRuleDraft(row)
          });
        }

        if (result.tapIndex === 1) {
          wx.showModal({
            title: '删除配送档',
            content: `确认删除 ${row.distanceKm}km 配送档吗？`,
            success: (modalResult: { confirm?: boolean }) => {
              if (!modalResult.confirm) {
                return;
              }
              this.patchSection('delivery-rules', (section) => {
                if (section.sectionId !== 'delivery-rules') {
                  return section;
                }
                if (section.value.tiers.length <= 1) {
                  wx.showToast({
                    title: '至少保留一个配送档',
                    icon: 'none'
                  });
                  return section;
                }
                const tiers = section.value.tiers.filter((_, rowIndex) => rowIndex !== index);
                return buildRuntimeConfigSectionDocument('delivery-rules', { tiers }, section);
              });
            }
          });
        }
      }
    });
  },
  handleDeliveryEditorInput(
    this: RuntimeConfigPageInstance,
    event: { currentTarget?: { dataset?: { field?: string } }; detail?: { value?: string } }
  ) {
    const field = event.currentTarget?.dataset?.field;

    if (!field) {
      return;
    }
    const rawValue = event.detail?.value ?? '';
    const value = field === 'minimumOrderAmount' || field === 'deliveryFee'
      ? normalizeMoneyInputText(rawValue)
      : rawValue;

    this.setData({
      deliveryEditorDraft: {
        ...this.data.deliveryEditorDraft,
        [field]: value
      }
    });
    return value;
  },
  handleCloseDeliveryEditor(this: RuntimeConfigPageInstance) {
    this.setData({
      deliveryEditorVisible: false,
      deliveryEditorIndex: -1,
      deliveryEditorDraft: buildDeliveryRuleDraft()
    });
  },
  handleConfirmDeliveryEditor(this: RuntimeConfigPageInstance) {
    const distanceKm = Number(this.data.deliveryEditorDraft.distanceKm);
    const minimumOrderAmount = this.data.deliveryEditorDraft.minimumOrderAmount.trim()
      ? Number(this.data.deliveryEditorDraft.minimumOrderAmount)
      : null;
    const deliveryFee = Number(this.data.deliveryEditorDraft.deliveryFee);

    if (!Number.isFinite(distanceKm) || distanceKm <= 0 || !Number.isFinite(deliveryFee) || deliveryFee < 0) {
      wx.showToast({
        title: '请填写有效配送数据',
        icon: 'none'
      });
      return;
    }

    if (minimumOrderAmount !== null && (!Number.isFinite(minimumOrderAmount) || minimumOrderAmount < 0)) {
      wx.showToast({
        title: '请填写有效起送金额',
        icon: 'none'
      });
      return;
    }

    this.patchSection('delivery-rules', (section) => {
      if (section.sectionId !== 'delivery-rules') {
        return section;
      }

      const row = {
        distanceKm,
        minimumOrderAmount,
        deliveryFee,
        explainer: buildDeliveryRuleExplainer({ distanceKm, minimumOrderAmount, deliveryFee })
      };
      const tiers = [...section.value.tiers];

      if (this.data.deliveryEditorIndex >= 0) {
        tiers[this.data.deliveryEditorIndex] = row;
      } else {
        tiers.push(row);
      }

      tiers.sort((left, right) => left.distanceKm - right.distanceKm);
      return buildRuntimeConfigSectionDocument('delivery-rules', { tiers }, section);
    });
    this.handleCloseDeliveryEditor();
  },
  handleBannerInput(
    this: RuntimeConfigPageInstance,
    event: { currentTarget?: { dataset?: { field?: string } }; detail?: { value?: string } }
  ) {
    const field = event.currentTarget?.dataset?.field;
    const value = event.detail?.value ?? '';

    if (!field) {
      return;
    }

    this.patchSection('banner', (section) =>
      buildRuntimeConfigSectionDocument('banner', {
        ...(section.sectionId === 'banner' ? section.value : { fileId: '', altText: '' }),
        [field]: value
      }, section)
    );
  },
  async handleUploadBanner(this: RuntimeConfigPageInstance) {
    wx.chooseImage({
      count: 1,
      success: async (result: { tempFilePaths?: string[]; tempFiles?: Array<{ path?: string; tempFilePath?: string; size?: number }> }) => {
        const filePath = result.tempFilePaths?.[0];
        if (!filePath) {
          return;
        }
        const tempFile = result.tempFiles?.[0];

        try {
          const uploaded = await uploadRuntimeBannerAsset({
            filePath: tempFile?.path ?? tempFile?.tempFilePath ?? filePath,
            sizeBytes: tempFile?.size
          });
          this.patchSection('banner', (section) =>
            buildRuntimeConfigSectionDocument('banner', {
              ...(section.sectionId === 'banner' ? section.value : { fileId: '', altText: '' }),
              fileId: uploaded.storageId,
              asset: uploaded.asset
            }, section)
          );
          wx.showToast({
            title: '上传成功',
            icon: 'success'
          });
        } catch {
          wx.showToast({
            title: '上传失败',
            icon: 'none'
          });
        }
      }
    });
  },
  handleNoticeInput(
    this: RuntimeConfigPageInstance,
    event: { currentTarget?: { dataset?: { field?: string } }; detail?: { value?: string } }
  ) {
    const field = event.currentTarget?.dataset?.field;
    const value = event.detail?.value ?? '';

    this.patchSection('custom-notice', (section) =>
      buildRuntimeConfigSectionDocument('custom-notice', {
        ...(section.sectionId === 'custom-notice' ? section.value : { enabled: true, content: '' }),
        [field ?? 'content']: field === 'enabled' ? value === 'true' : value
      }, section)
    );
  },
  handleNoticeToggle(this: RuntimeConfigPageInstance) {
    this.patchSection('custom-notice', (section) => {
      if (section.sectionId !== 'custom-notice') {
        return section;
      }

      return buildRuntimeConfigSectionDocument(
        'custom-notice',
        {
          ...section.value,
          enabled: !section.value.enabled
        },
        section
      );
    });
  },
  handleOpenDeliveryNotice() {
    wx.showModal({
      title: '配送费说明',
      content: '点击配送档可以编辑或删除；新增和保存后会同步到用户端展示。',
      showCancel: false
    });
  },
  handleEditorTap() {
    return undefined;
  },
  async handleSaveSection(this: RuntimeConfigPageInstance, event: { currentTarget?: { dataset?: { sectionId?: RuntimeConfigSectionId } } }) {
    const sectionId = event.currentTarget?.dataset?.sectionId;

    if (!sectionId) {
      return;
    }

    const section = getSection(this.data.sections, sectionId);

    if (!section) {
      return;
    }

    if (section.sectionId === 'membership-tiers' && section.value.tiers.some((tier) => !tier.name.trim())) {
      wx.showToast({
        title: '请填写等级名称',
        icon: 'none'
      });
      return;
    }

    try {
      const saved = await saveRuntimeConfigSection(section);
      const sections = this.data.sections.map((item) => (item.sectionId === sectionId ? saved : item));
      const dirty = {
        ...this.data.dirty,
        [sectionId]: false
      };
      refreshView(this, sections, dirty);

      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });
    } catch {
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    }
  }
});
