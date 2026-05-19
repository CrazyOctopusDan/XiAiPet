declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import type { CatalogCategoryRecord } from '@xiaipet/shared/types/catalog-admin';

import {
  applyProductCountsToCategories,
  deleteCategory,
  getCategoryPageViewModel,
  queryCategories,
  queryProducts,
  saveCategory
} from '../../src/services/catalog-admin';

interface CategoryPageData {
  loading: boolean;
  isEmpty: boolean;
  cards: ReturnType<typeof getCategoryPageViewModel>['cards'];
  summary: ReturnType<typeof getCategoryPageViewModel>['summary'];
  draftId: string;
  draftName: string;
  draftIconToken: string;
  isEditorOpen: boolean;
  editorTitle: string;
  editorSubtitle: string;
}

interface CategoryPageInstance {
  data: CategoryPageData;
  setData(updates: Record<string, unknown>): void;
  refreshCategories(): Promise<void>;
  handleCreateTap(): void;
  closeEditor(): void;
}

function createDraftId() {
  return `category-${Date.now()}`;
}

Page({
  data: {
    loading: true,
    isEmpty: true,
    cards: [],
    summary: {
      totalCategories: 0,
      linkedProducts: 0,
      lockedCategories: 0
    },
    draftId: createDraftId(),
    draftName: '',
    draftIconToken: '',
    isEditorOpen: false,
    editorTitle: '新建品类',
    editorSubtitle: '保存后同步商品筛选'
  },
  async onShow(this: CategoryPageInstance) {
    await this.refreshCategories();
  },
  async refreshCategories(this: CategoryPageInstance) {
    this.setData({ loading: true });
    try {
      const [categories, products] = await Promise.all([
        queryCategories(),
        queryProducts()
      ]);
      const view = getCategoryPageViewModel(applyProductCountsToCategories(categories, products));
      this.setData({
        loading: false,
        isEmpty: view.isEmpty,
        cards: view.cards,
        summary: view.summary
      });
    } catch {
      this.setData({ loading: false });
      wx.showToast({
        title: '品类加载失败',
        icon: 'none'
      });
    }
  },
  handleNameInput(this: CategoryPageInstance, event: { detail?: { value?: string } }) {
    this.setData({ draftName: event.detail?.value ?? '' });
  },
  handleIconInput(this: CategoryPageInstance, event: { detail?: { value?: string } }) {
    this.setData({ draftIconToken: event.detail?.value ?? '' });
  },
  handleEditTap(
    this: CategoryPageInstance,
    event: { currentTarget?: { dataset?: { id?: string; name?: string; icon?: string } } }
  ) {
    this.setData({
      draftId: event.currentTarget?.dataset?.id ?? createDraftId(),
      draftName: event.currentTarget?.dataset?.name ?? '',
      draftIconToken: event.currentTarget?.dataset?.icon ?? '',
      isEditorOpen: true,
      editorTitle: '编辑品类',
      editorSubtitle: '更新后商品筛选会同步变化'
    });
  },
  handleCreateTap(this: CategoryPageInstance) {
    this.setData({
      draftId: createDraftId(),
      draftName: '',
      draftIconToken: '',
      isEditorOpen: true,
      editorTitle: '新建品类',
      editorSubtitle: '创建一级品类后即可维护商品'
    });
  },
  closeEditor(this: CategoryPageInstance) {
    this.setData({
      isEditorOpen: false,
      draftId: createDraftId(),
      draftName: '',
      draftIconToken: '',
      editorTitle: '新建品类',
      editorSubtitle: '保存后同步商品筛选'
    });
  },
  handleEditorPanelTap() {},
  async handleSaveTap(this: CategoryPageInstance) {
    if (!this.data.draftName.trim() || !this.data.draftIconToken.trim()) {
      wx.showToast({
        title: '请填写名称和 icon',
        icon: 'none'
      });
      return;
    }

    const now = new Date().toISOString();
    const existing = this.data.cards.find((item) => item.id === this.data.draftId);
    const category: CatalogCategoryRecord = {
      id: this.data.draftId,
      name: this.data.draftName.trim(),
      iconToken: this.data.draftIconToken.trim(),
      createdAt: existing ? now : now,
      updatedAt: now
    };

    try {
      await saveCategory(category);
      wx.showToast({
        title: '品类已保存',
        icon: 'success'
      });

      this.closeEditor();
      await this.refreshCategories();
    } catch {
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    }
  },
  handleDeleteTap(
    this: CategoryPageInstance,
    event: { currentTarget?: { dataset?: { id?: string; action?: string; name?: string } } }
  ) {
    const categoryId = event.currentTarget?.dataset?.id;
    const action = event.currentTarget?.dataset?.action;
    const name = event.currentTarget?.dataset?.name ?? '当前品类';

    if (!categoryId) {
      return;
    }

    if (action === '先迁移商品') {
      wx.showModal({
        title: '先迁移商品',
        content: `删除品类前，请先迁移 ${name} 下全部商品。`,
        showCancel: false
      });
      return;
    }

    wx.showModal({
      title: '删除品类',
      content: `删除品类：请先确认 ${name} 已经没有关联商品。`,
      success: async (result: { confirm?: boolean }) => {
        if (!result.confirm) {
          return;
        }

        try {
          await deleteCategory(categoryId);
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
          await this.refreshCategories();
        } catch (error) {
          wx.showToast({
            title: '请先迁移商品',
            icon: 'none'
          });
        }
      }
    });
  },
  handleOpenProducts(event: { currentTarget?: { dataset?: { id?: string } } }) {
    const categoryId = event.currentTarget?.dataset?.id ?? '';

    wx.navigateTo({
      url: `/pages/products/index?categoryId=${categoryId}`
    });
  }
});
