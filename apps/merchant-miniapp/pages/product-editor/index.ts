declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import type { OrderFulfillmentMode } from '@xiaipet/shared';
import type {
  CatalogProductAdminRecord,
  CatalogProductEditorPayload,
  CatalogProductEditorStep
} from '@xiaipet/shared/types/catalog-admin';

import {
  createEmptyProductEditorPayload,
  getProductEditorViewModel,
  queryCategories,
  queryProducts,
  saveProduct,
  splitProductEditorPayload,
  uploadProductImage
} from '../../src/services/catalog-admin';

interface ProductEditorPageData {
  loading: boolean;
  saving: boolean;
  imageUploading: boolean;
  activeStep: CatalogProductEditorStep;
  categories: Awaited<ReturnType<typeof queryCategories>>;
  draft: CatalogProductEditorPayload;
  editorView: ReturnType<typeof getProductEditorViewModel>;
}

interface ProductEditorPageInstance {
  data: ProductEditorPageData;
  setData(updates: Record<string, unknown>): void;
  hydrateEditor(productId?: string, categoryId?: string): Promise<void>;
}

function createDraft(categoryId = '') {
  return createEmptyProductEditorPayload(categoryId);
}

function refreshEditorView(instance: ProductEditorPageInstance, draft: CatalogProductEditorPayload, activeStep: CatalogProductEditorStep) {
  instance.setData({
    draft,
    activeStep,
    editorView: getProductEditorViewModel(draft, activeStep)
  });
}

function updateSpecRow(draft: CatalogProductEditorPayload, index: number, key: 'label' | 'surcharge', value: string) {
  draft.pricing.specs[index] = {
    ...draft.pricing.specs[index],
    [key]: key === 'surcharge' ? Number(value || 0) : value
  };
}

function updateFormulaRow(draft: CatalogProductEditorPayload, index: number, key: 'label' | 'surcharge', value: string) {
  draft.pricing.formulas[index] = {
    ...draft.pricing.formulas[index],
    [key]: key === 'surcharge' ? Number(value || 0) : value
  };
}

Page({
  data: {
    loading: true,
    saving: false,
    imageUploading: false,
    activeStep: 'basicInfo',
    categories: [],
    draft: createDraft(),
    editorView: getProductEditorViewModel(createDraft(), 'basicInfo')
  },
  async onLoad(this: ProductEditorPageInstance, options?: { productId?: string; categoryId?: string }) {
    await this.hydrateEditor(options?.productId, options?.categoryId);
  },
  async hydrateEditor(this: ProductEditorPageInstance, productId = '', categoryId = '') {
    this.setData({ loading: true });
    const categories = await queryCategories();
    let draft = createDraft(categoryId);

    if (productId) {
      const products = await queryProducts();
      const product = products.find((item) => item.id === productId) as CatalogProductAdminRecord | undefined;

      if (product) {
        draft = splitProductEditorPayload(product);
      }
    }

    this.setData({
      loading: false,
      categories
    });
    refreshEditorView(this, draft, 'basicInfo');
  },
  handleStepTap(this: ProductEditorPageInstance, event: { currentTarget?: { dataset?: { step?: CatalogProductEditorStep } } }) {
    const step = event.currentTarget?.dataset?.step;

    if (!step) {
      return;
    }

    refreshEditorView(this, this.data.draft, step);
  },
  handleBasicInput(
    this: ProductEditorPageInstance,
    event: { currentTarget?: { dataset?: { field?: string } }; detail?: { value?: string } }
  ) {
    const field = event.currentTarget?.dataset?.field;
    const value = event.detail?.value ?? '';
    const draft = { ...this.data.draft, basicInfo: { ...this.data.draft.basicInfo } };

    if (field === 'stock') {
      draft.basicInfo.stock = Number(value || 0);
    } else if (field && field in draft.basicInfo) {
      (draft.basicInfo as Record<string, unknown>)[field] = value;
    }

    refreshEditorView(this, draft, this.data.activeStep);
  },
  handleCategoryTap(this: ProductEditorPageInstance, event: { currentTarget?: { dataset?: { id?: string } } }) {
    const categoryId = event.currentTarget?.dataset?.id ?? '';
    const draft = { ...this.data.draft, basicInfo: { ...this.data.draft.basicInfo, categoryId } };
    refreshEditorView(this, draft, this.data.activeStep);
  },
  async handleUploadImage(this: ProductEditorPageInstance) {
    wx.chooseImage({
      count: 1,
      success: async (result: { tempFilePaths?: string[] }) => {
        const filePath = result.tempFilePaths?.[0];

        if (!filePath) {
          return;
        }

        this.setData({ imageUploading: true });
        const fileID = await uploadProductImage(filePath, this.data.draft.basicInfo.productId);
        const draft = {
          ...this.data.draft,
          basicInfo: {
            ...this.data.draft.basicInfo,
            imageFileId: fileID,
            imagePreviewUrl: fileID
          }
        };
        this.setData({ imageUploading: false });
        refreshEditorView(this, draft, this.data.activeStep);
      }
    });
  },
  handleBasePriceInput(this: ProductEditorPageInstance, event: { detail?: { value?: string } }) {
    const draft = { ...this.data.draft, pricing: { ...this.data.draft.pricing, basePrice: Number(event.detail?.value ?? 0) } };
    refreshEditorView(this, draft, this.data.activeStep);
  },
  handleAddSpec(this: ProductEditorPageInstance) {
    const draft = {
      ...this.data.draft,
      pricing: {
        ...this.data.draft.pricing,
        specs: [
          ...this.data.draft.pricing.specs,
          { id: `spec-${Date.now()}`, label: '', surcharge: 0 }
        ]
      }
    };
    refreshEditorView(this, draft, this.data.activeStep);
  },
  handleSpecInput(
    this: ProductEditorPageInstance,
    event: { currentTarget?: { dataset?: { index?: string; field?: 'label' | 'surcharge' } }; detail?: { value?: string } }
  ) {
    const index = Number(event.currentTarget?.dataset?.index ?? -1);
    const field = event.currentTarget?.dataset?.field;

    if (index < 0 || !field) {
      return;
    }

    const draft = {
      ...this.data.draft,
      pricing: {
        ...this.data.draft.pricing,
        specs: [...this.data.draft.pricing.specs]
      }
    };
    updateSpecRow(draft, index, field, event.detail?.value ?? '');
    refreshEditorView(this, draft, this.data.activeStep);
  },
  handleRemoveSpec(this: ProductEditorPageInstance, event: { currentTarget?: { dataset?: { index?: string } } }) {
    const index = Number(event.currentTarget?.dataset?.index ?? -1);
    const draft = {
      ...this.data.draft,
      pricing: {
        ...this.data.draft.pricing,
        specs: this.data.draft.pricing.specs.filter((_, itemIndex) => itemIndex !== index)
      }
    };
    refreshEditorView(this, draft, this.data.activeStep);
  },
  handleAddFormula(this: ProductEditorPageInstance) {
    const draft = {
      ...this.data.draft,
      pricing: {
        ...this.data.draft.pricing,
        formulas: [
          ...this.data.draft.pricing.formulas,
          { id: `formula-${Date.now()}`, label: '', surcharge: 0 }
        ]
      }
    };
    refreshEditorView(this, draft, this.data.activeStep);
  },
  handleFormulaInput(
    this: ProductEditorPageInstance,
    event: { currentTarget?: { dataset?: { index?: string; field?: 'label' | 'surcharge' } }; detail?: { value?: string } }
  ) {
    const index = Number(event.currentTarget?.dataset?.index ?? -1);
    const field = event.currentTarget?.dataset?.field;

    if (index < 0 || !field) {
      return;
    }

    const draft = {
      ...this.data.draft,
      pricing: {
        ...this.data.draft.pricing,
        formulas: [...this.data.draft.pricing.formulas]
      }
    };
    updateFormulaRow(draft, index, field, event.detail?.value ?? '');
    refreshEditorView(this, draft, this.data.activeStep);
  },
  handleRemoveFormula(this: ProductEditorPageInstance, event: { currentTarget?: { dataset?: { index?: string } } }) {
    const index = Number(event.currentTarget?.dataset?.index ?? -1);
    const draft = {
      ...this.data.draft,
      pricing: {
        ...this.data.draft.pricing,
        formulas: this.data.draft.pricing.formulas.filter((_, itemIndex) => itemIndex !== index)
      }
    };
    refreshEditorView(this, draft, this.data.activeStep);
  },
  handlePurchaseLimitToggle(this: ProductEditorPageInstance) {
    const enabled = !this.data.draft.pricing.purchaseLimit.enabled;
    const draft = {
      ...this.data.draft,
      pricing: {
        ...this.data.draft.pricing,
        purchaseLimit: {
          enabled,
          maxQuantity: enabled ? this.data.draft.pricing.purchaseLimit.maxQuantity ?? 1 : null
        }
      }
    };
    refreshEditorView(this, draft, this.data.activeStep);
  },
  handlePurchaseLimitInput(this: ProductEditorPageInstance, event: { detail?: { value?: string } }) {
    const draft = {
      ...this.data.draft,
      pricing: {
        ...this.data.draft.pricing,
        purchaseLimit: {
          ...this.data.draft.pricing.purchaseLimit,
          maxQuantity: Number(event.detail?.value ?? 0)
        }
      }
    };
    refreshEditorView(this, draft, this.data.activeStep);
  },
  handleDetailContentInput(this: ProductEditorPageInstance, event: { detail?: { value?: string } }) {
    const draft = {
      ...this.data.draft,
      pricing: {
        ...this.data.draft.pricing,
        detailContent: event.detail?.value ?? ''
      }
    };
    refreshEditorView(this, draft, this.data.activeStep);
  },
  handleStatusTap(this: ProductEditorPageInstance, event: { currentTarget?: { dataset?: { status?: CatalogProductAdminRecord['status'] } } }) {
    const status = event.currentTarget?.dataset?.status;

    if (!status) {
      return;
    }

    const draft = {
      ...this.data.draft,
      publishSettings: {
        ...this.data.draft.publishSettings,
        status
      }
    };
    refreshEditorView(this, draft, this.data.activeStep);
  },
  handleFulfillmentTap(
    this: ProductEditorPageInstance,
    event: { currentTarget?: { dataset?: { mode?: OrderFulfillmentMode } } }
  ) {
    const mode = event.currentTarget?.dataset?.mode;

    if (!mode) {
      return;
    }

    const modes = this.data.draft.publishSettings.fulfillmentModes.includes(mode)
      ? this.data.draft.publishSettings.fulfillmentModes.filter((item) => item !== mode)
      : [...this.data.draft.publishSettings.fulfillmentModes, mode];
    const draft = {
      ...this.data.draft,
      publishSettings: {
        ...this.data.draft.publishSettings,
        fulfillmentModes: modes
      }
    };
    refreshEditorView(this, draft, this.data.activeStep);
  },
  handleTrackInventoryToggle(this: ProductEditorPageInstance) {
    const draft = {
      ...this.data.draft,
      publishSettings: {
        ...this.data.draft.publishSettings,
        trackInventory: !this.data.draft.publishSettings.trackInventory
      }
    };
    refreshEditorView(this, draft, this.data.activeStep);
  },
  async handleStepSubmit(this: ProductEditorPageInstance) {
    if (this.data.activeStep === 'basicInfo') {
      if (!this.data.draft.basicInfo.name.trim() || !this.data.draft.basicInfo.categoryId || !this.data.draft.basicInfo.imageFileId) {
        wx.showToast({
          title: '请完善基础信息',
          icon: 'none'
        });
        return;
      }

      refreshEditorView(this, this.data.draft, 'pricing');
      return;
    }

    if (this.data.activeStep === 'pricing') {
      refreshEditorView(this, this.data.draft, 'publishSettings');
      return;
    }

    if (!this.data.draft.publishSettings.fulfillmentModes.length) {
      wx.showToast({
        title: '至少选择一种履约方式',
        icon: 'none'
      });
      return;
    }

    this.setData({ saving: true });
    await saveProduct(this.data.draft);
    this.setData({ saving: false });
    wx.showToast({
      title: '商品已保存',
      icon: 'success'
    });
    wx.navigateBack();
  }
});
