declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import type { OrderFulfillmentMode } from '@xiaipet/shared';
import type {
  CatalogProductAdminRecord,
  CatalogProductEditorPayload,
  CatalogProductEditorStep
} from '@xiaipet/shared/types/catalog-admin';
import type { OssAssetReference } from '@xiaipet/shared/types/assets';
import type { MerchantAssetUploadFile } from '../../src/services/assets';

import {
  createEmptyProductEditorPayload,
  getProductEditorViewModel,
  queryCategories,
  queryProducts,
  saveProduct,
  splitProductEditorPayload,
  uploadProductCoverAsset,
  uploadProductDetailAsset
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

function logProductImageUploadFailure(scope: 'basic' | 'detail' | 'choose-basic' | 'choose-detail', error: unknown) {
  if (typeof console !== 'undefined' && typeof console.error === 'function') {
    console.error('[xiaipet] product editor image upload failed', {
      scope,
      error
    });
  }
}

function getProductImageUploadToastTitle(error: unknown) {
  if (error instanceof Error && error.message === 'Image exceeds the upload size limit') {
    return '图片过大';
  }

  return '上传失败';
}

function shouldIgnoreChooseImageFailure(error: unknown) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'errMsg' in error &&
      typeof error.errMsg === 'string' &&
      error.errMsg.includes('cancel')
  );
}

function getChosenImageFiles(
  result: { tempFilePaths?: string[]; tempFiles?: Array<{ path?: string; tempFilePath?: string; size?: number }> },
  count: number
): MerchantAssetUploadFile[] {
  const tempFiles = result.tempFiles ?? [];
  const paths = result.tempFilePaths ?? [];
  return paths.slice(0, count).map((filePath, index) => ({
    filePath: tempFiles[index]?.path ?? tempFiles[index]?.tempFilePath ?? filePath,
    sizeBytes: tempFiles[index]?.size
  }));
}

function normalizeImageUrlForDisplay(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  if (trimmed.startsWith('https://')) {
    return trimmed;
  }

  if (trimmed.startsWith('http://')) {
    return `https://${trimmed.slice('http://'.length)}`;
  }

  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('cloud://') ||
    trimmed.startsWith('oss://') ||
    /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
  ) {
    return trimmed;
  }

  return `https://${trimmed.replace(/^\/+/, '')}`;
}

function normalizeAssetForDraft(asset: OssAssetReference): OssAssetReference {
  return {
    ...asset,
    url: normalizeImageUrlForDisplay(asset.url),
    variants: asset.variants.map((variant) => ({
      ...variant,
      url: normalizeImageUrlForDisplay(variant.url)
    }))
  };
}

function parseMoneyInput(value: string | number | undefined): number {
  const numeric = Number(value ?? 0);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0;
  }

  return Math.floor(numeric * 100) / 100;
}

function normalizeMoneyInputText(value: string | undefined): string {
  const sanitized = (value ?? '').replace(/[^\d.]/g, '');
  const [integerPart = '', ...decimalParts] = sanitized.split('.');

  if (!sanitized.includes('.')) {
    return integerPart;
  }

  return `${integerPart}.${decimalParts.join('').slice(0, 2)}`;
}

function isPendingMoneyInput(value: string | undefined): boolean {
  return typeof value === 'string' && /^\d*\.$/.test(value);
}

function updateSpecRow(draft: CatalogProductEditorPayload, index: number, key: 'label' | 'surcharge', value: string) {
  draft.pricing.specs[index] = {
    ...draft.pricing.specs[index],
    [key]: key === 'surcharge' ? parseMoneyInput(value) : value
  };
}

function updateFormulaRow(draft: CatalogProductEditorPayload, index: number, key: 'label' | 'surcharge', value: string) {
  draft.pricing.formulas[index] = {
    ...draft.pricing.formulas[index],
    [key]: key === 'surcharge' ? parseMoneyInput(value) : value
  };
}

function assetToStorageId(asset: OssAssetReference) {
  return `oss://${asset.bucket}/${asset.objectKey}`;
}

function getDraftBasicImageAssets(draft: CatalogProductEditorPayload): OssAssetReference[] {
  if (draft.basicInfo.introductionImageAssets?.length) {
    return draft.basicInfo.introductionImageAssets.slice(0, 3);
  }

  return draft.basicInfo.imageAsset ? [draft.basicInfo.imageAsset] : [];
}

function applyBasicImageAssets(
  draft: CatalogProductEditorPayload,
  assets: OssAssetReference[]
): CatalogProductEditorPayload {
  const normalizedAssets = assets.slice(0, 3).map(normalizeAssetForDraft);
  const cover = normalizedAssets[0];

  return {
    ...draft,
    basicInfo: {
      ...draft.basicInfo,
      imageFileId: cover ? assetToStorageId(cover) : '',
      imageAsset: cover,
      imagePreviewUrl: cover?.url ?? '',
      introductionImageAssets: normalizedAssets
    }
  };
}

function getDraftDetailImageAssets(draft: CatalogProductEditorPayload): OssAssetReference[] {
  return (draft.basicInfo.detailImageAssets ?? []).slice(0, 9);
}

function applyDetailImageAssets(
  draft: CatalogProductEditorPayload,
  assets: OssAssetReference[]
): CatalogProductEditorPayload {
  const normalizedAssets = assets.slice(0, 9).map(normalizeAssetForDraft);

  return {
    ...draft,
    basicInfo: {
      ...draft.basicInfo,
      detailImageAssets: normalizedAssets
    }
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
    try {
      const categories = await queryCategories();
      let draft = createDraft(categoryId);

      if (productId) {
        const productsResponse = await queryProducts();
        const product = productsResponse.items.find((item) => item.id === productId) as CatalogProductAdminRecord | undefined;

        if (product) {
          draft = splitProductEditorPayload(product);
        }
      }

      this.setData({
        loading: false,
        categories
      });
      refreshEditorView(this, draft, 'basicInfo');
    } catch {
      this.setData({ loading: false });
      wx.showToast({
        title: '商品加载失败',
        icon: 'none'
      });
    }
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
  async handleUploadImage(this: ProductEditorPageInstance, event?: { currentTarget?: { dataset?: { index?: string } } }) {
    const replaceIndexValue = event?.currentTarget?.dataset?.index;
    const replaceIndex = replaceIndexValue === undefined ? -1 : Number(replaceIndexValue);
    const currentAssets = getDraftBasicImageAssets(this.data.draft);
    const remainingSlots = Math.max(0, 3 - currentAssets.length);
    const isReplacing = Number.isInteger(replaceIndex) && replaceIndex >= 0;
    const count = isReplacing ? 1 : remainingSlots;

    if (count <= 0) {
      wx.showToast({
        title: '最多上传 3 张',
        icon: 'none'
      });
      return;
    }

    wx.chooseImage({
      count,
      success: async (result: { tempFilePaths?: string[]; tempFiles?: Array<{ path?: string; tempFilePath?: string; size?: number }> }) => {
        const files = getChosenImageFiles(result, count);

        if (!files.length) {
          return;
        }

        this.setData({ imageUploading: true });
        try {
          const uploadedAssets: OssAssetReference[] = [];
          for (const file of files) {
            const uploaded = await uploadProductCoverAsset(file);
            uploadedAssets.push(uploaded.asset);
          }
          const baseAssets = getDraftBasicImageAssets(this.data.draft);
          const nextAssets = isReplacing
            ? baseAssets.length
              ? baseAssets.map((asset, index) => (index === replaceIndex ? uploadedAssets[0] : asset))
              : uploadedAssets
            : [...baseAssets, ...uploadedAssets].slice(0, 3);
          const draft = applyBasicImageAssets(this.data.draft, nextAssets);
          refreshEditorView(this, draft, this.data.activeStep);
        } catch (error) {
          logProductImageUploadFailure('basic', error);
          wx.showToast?.({
            title: getProductImageUploadToastTitle(error),
            icon: 'none'
          });
        } finally {
          this.setData({ imageUploading: false });
        }
      },
      fail: (error: unknown) => {
        if (shouldIgnoreChooseImageFailure(error)) {
          return;
        }
        logProductImageUploadFailure('choose-basic', error);
        wx.showToast?.({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    });
  },
  handleRemoveImage(this: ProductEditorPageInstance, event: { currentTarget?: { dataset?: { index?: string } } }) {
    const index = Number(event.currentTarget?.dataset?.index ?? -1);
    const assets = getDraftBasicImageAssets(this.data.draft);

    if (index < 0) {
      return;
    }

    const draft = applyBasicImageAssets(
      this.data.draft,
      assets.filter((_, itemIndex) => itemIndex !== index)
    );
    refreshEditorView(this, draft, this.data.activeStep);
  },
  async handleUploadDetailImage(this: ProductEditorPageInstance, event?: { currentTarget?: { dataset?: { index?: string } } }) {
    const replaceIndexValue = event?.currentTarget?.dataset?.index;
    const replaceIndex = replaceIndexValue === undefined ? -1 : Number(replaceIndexValue);
    const currentAssets = getDraftDetailImageAssets(this.data.draft);
    const remainingSlots = Math.max(0, 9 - currentAssets.length);
    const isReplacing = Number.isInteger(replaceIndex) && replaceIndex >= 0;
    const count = isReplacing ? 1 : remainingSlots;

    if (count <= 0) {
      wx.showToast({
        title: '最多上传 9 张',
        icon: 'none'
      });
      return;
    }

    wx.chooseImage({
      count,
      success: async (result: { tempFilePaths?: string[]; tempFiles?: Array<{ path?: string; tempFilePath?: string; size?: number }> }) => {
        const files = getChosenImageFiles(result, count);

        if (!files.length) {
          return;
        }

        this.setData({ imageUploading: true });
        try {
          const uploadedAssets: OssAssetReference[] = [];
          for (const file of files) {
            const uploaded = await uploadProductDetailAsset(file);
            uploadedAssets.push(uploaded.asset);
          }
          const baseAssets = getDraftDetailImageAssets(this.data.draft);
          const nextAssets = isReplacing
            ? baseAssets.length
              ? baseAssets.map((asset, index) => (index === replaceIndex ? uploadedAssets[0] : asset))
              : uploadedAssets
            : [...baseAssets, ...uploadedAssets].slice(0, 9);
          const draft = applyDetailImageAssets(this.data.draft, nextAssets);
          refreshEditorView(this, draft, this.data.activeStep);
        } catch (error) {
          logProductImageUploadFailure('detail', error);
          wx.showToast?.({
            title: getProductImageUploadToastTitle(error),
            icon: 'none'
          });
        } finally {
          this.setData({ imageUploading: false });
        }
      },
      fail: (error: unknown) => {
        if (shouldIgnoreChooseImageFailure(error)) {
          return;
        }
        logProductImageUploadFailure('choose-detail', error);
        wx.showToast?.({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    });
  },
  handleRemoveDetailImage(this: ProductEditorPageInstance, event: { currentTarget?: { dataset?: { index?: string } } }) {
    const index = Number(event.currentTarget?.dataset?.index ?? -1);

    if (index < 0) {
      return;
    }

    const draft = applyDetailImageAssets(
      this.data.draft,
      getDraftDetailImageAssets(this.data.draft).filter((_, itemIndex) => itemIndex !== index)
    );
    refreshEditorView(this, draft, this.data.activeStep);
  },
  handleBasePriceInput(this: ProductEditorPageInstance, event: { detail?: { value?: string } }) {
    const value = normalizeMoneyInputText(event.detail?.value);
    if (isPendingMoneyInput(value)) {
      return value;
    }

    const draft = { ...this.data.draft, pricing: { ...this.data.draft.pricing, basePrice: parseMoneyInput(value) } };
    refreshEditorView(this, draft, this.data.activeStep);
    return value;
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
    const value = field === 'surcharge' ? normalizeMoneyInputText(event.detail?.value) : (event.detail?.value ?? '');

    if (field === 'surcharge' && isPendingMoneyInput(value)) {
      return value;
    }

    const draft = {
      ...this.data.draft,
      pricing: {
        ...this.data.draft.pricing,
        specs: [...this.data.draft.pricing.specs]
      }
    };
    updateSpecRow(draft, index, field, value);
    refreshEditorView(this, draft, this.data.activeStep);
    return value;
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
    const value = field === 'surcharge' ? normalizeMoneyInputText(event.detail?.value) : (event.detail?.value ?? '');

    if (field === 'surcharge' && isPendingMoneyInput(value)) {
      return value;
    }

    const draft = {
      ...this.data.draft,
      pricing: {
        ...this.data.draft.pricing,
        formulas: [...this.data.draft.pricing.formulas]
      }
    };
    updateFormulaRow(draft, index, field, value);
    refreshEditorView(this, draft, this.data.activeStep);
    return value;
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
  handlePreviousStep(this: ProductEditorPageInstance) {
    if (this.data.activeStep === 'pricing') {
      refreshEditorView(this, this.data.draft, 'basicInfo');
      return;
    }

    if (this.data.activeStep === 'publishSettings') {
      refreshEditorView(this, this.data.draft, 'pricing');
    }
  },
  async handleStepSubmit(this: ProductEditorPageInstance) {
    if (this.data.activeStep === 'basicInfo') {
      if (!this.data.draft.basicInfo.name.trim() || !this.data.draft.basicInfo.categoryId || !getDraftBasicImageAssets(this.data.draft).length) {
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
    try {
      await saveProduct(this.data.draft);
      this.setData({ saving: false });
      wx.showToast({
        title: '商品已保存',
        icon: 'success'
      });
      wx.navigateBack();
    } catch {
      this.setData({ saving: false });
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    }
  }
});
