declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import type { RuntimeConfigSectionDocument, RuntimeConfigSectionId } from '../../../../packages/shared/src/types/runtime-config';

import {
  LOCKED_DELIVERY_RULE_ROWS,
  buildRuntimeConfigSectionDocument,
  getRuntimeConfigAdminViewModel,
  queryRuntimeConfigSections,
  saveRuntimeConfigSection
} from '../../src/services/runtime-config-admin';

interface RuntimeConfigPageData {
  loading: boolean;
  dirty: Record<string, boolean>;
  sections: RuntimeConfigSectionDocument[];
  view: ReturnType<typeof getRuntimeConfigAdminViewModel>;
}

interface RuntimeConfigPageInstance {
  data: RuntimeConfigPageData;
  setData(updates: Record<string, unknown>): void;
  refreshSections(): Promise<void>;
  patchSection(sectionId: RuntimeConfigSectionId, updater: (section: RuntimeConfigSectionDocument) => RuntimeConfigSectionDocument): void;
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

Page({
  data: {
    loading: true,
    dirty: {},
    sections: [],
    view: {
      sections: []
    }
  },
  async onShow(this: RuntimeConfigPageInstance) {
    await this.refreshSections();
  },
  async refreshSections(this: RuntimeConfigPageInstance) {
    this.setData({ loading: true });
    const sections = await queryRuntimeConfigSections();
    this.setData({
      loading: false
    });
    refreshView(this, sections, this.data.dirty);
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
        ...(section.sectionId === 'store-profile' ? section.value : { address: '', latitude: 0, longitude: 0, contactPhone: '' }),
        [field]: field === 'latitude' || field === 'longitude' ? Number(value || 0) : value
      }, section)
    );
  },
  handleMembershipInput(
    this: RuntimeConfigPageInstance,
    event: { currentTarget?: { dataset?: { index?: string; field?: string } }; detail?: { value?: string } }
  ) {
    const index = Number(event.currentTarget?.dataset?.index ?? -1);
    const field = event.currentTarget?.dataset?.field;
    const value = event.detail?.value ?? '';

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
        [field]: field === 'threshold' ? Number(value || 0) : value
      };

      return buildRuntimeConfigSectionDocument('membership-tiers', { tiers }, section);
    });
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
      content: '说明弹层：配送费按距离和价格阶梯录入，下列每一档都会直接展示给商户。',
      showCancel: false
    });
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
  }
});
