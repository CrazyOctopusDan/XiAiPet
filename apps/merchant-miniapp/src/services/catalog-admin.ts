declare const wx: any;

import type { OrderFulfillmentMode } from '@xiaipet/shared';
import type {
  CatalogCategoryRecord,
  CatalogProductAdminRecord,
  CatalogProductEditorPayload,
  CatalogProductEditorStep,
  CatalogProductFormulaOption,
  CatalogProductPriceOverride,
  CatalogProductSpecOption
} from '../../../../packages/shared/src/types/catalog-admin';
import { resolveProductCombinationPrice } from '../../../../packages/shared/src/rules/product-pricing';

export interface MerchantCategoryListItem extends CatalogCategoryRecord {
  linkedProductCount: number;
  canDelete: boolean;
}

export interface CategoryCardViewModel {
  id: string;
  name: string;
  iconToken: string;
  linkedProductCountLabel: string;
  deleteActionLabel: string;
  helperText: string;
}

export interface CategoryPageViewModel {
  isEmpty: boolean;
  cards: CategoryCardViewModel[];
}

export interface ProductCategoryFilterViewModel {
  id: string;
  label: string;
  isActive: boolean;
}

export interface ProductCardViewModel {
  id: string;
  name: string;
  statusLabel: string;
  stockLabel: string;
  priceRangeLabel: string;
  fulfillmentModesLabel: string;
  imagePreviewUrl: string;
}

export interface ProductPageViewModel {
  isEmpty: boolean;
  categoryFilters: ProductCategoryFilterViewModel[];
  cards: ProductCardViewModel[];
}

export interface ProductEditorStepViewModel {
  value: CatalogProductEditorStep;
  label: string;
  isActive: boolean;
  isDone: boolean;
}

export interface ProductPricePreviewRowViewModel {
  label: string;
  computedPriceLabel: string;
  finalPriceLabel: string;
  overrideLabel: string | null;
}

export interface ProductEditorViewModel {
  steps: ProductEditorStepViewModel[];
  ctaLabel: string;
  purchaseLimitLabel: string;
  detailContentLabel: string;
  fulfillmentModeLabels: string[];
  pricePreviewRows: ProductPricePreviewRowViewModel[];
}

function getCloudCaller() {
  return (payload: Record<string, unknown>) => wx.cloud.callFunction(payload);
}

function getUploader() {
  return (payload: Record<string, unknown>) => wx.cloud.uploadFile(payload);
}

function formatMoney(value: number) {
  return `￥${value.toFixed(2)}`;
}

function getStatusLabel(status: CatalogProductAdminRecord['status']) {
  if (status === 'published') {
    return '已上架';
  }

  if (status === 'archived') {
    return '已归档';
  }

  return '草稿';
}

function getFulfillmentModeLabel(mode: OrderFulfillmentMode) {
  if (mode === 'pickup') {
    return '自取';
  }

  if (mode === 'express') {
    return '快递';
  }

  return '配送';
}

function getPriceRangeLabel(product: CatalogProductAdminRecord) {
  const resolvedPrices: number[] = [product.basePrice];

  product.specs.forEach((spec) => {
    product.formulas.forEach((formula) => {
      resolvedPrices.push(
        resolveProductCombinationPrice(product, {
          specId: spec.id,
          formulaId: formula.id
        }).finalPrice
      );
    });
  });

  const min = Math.min(...resolvedPrices);
  const max = Math.max(...resolvedPrices);

  if (min === max) {
    return formatMoney(min);
  }

  return `${formatMoney(min)} 起`;
}

function getStepLabel(step: CatalogProductEditorStep) {
  if (step === 'basicInfo') {
    return '基础信息';
  }

  if (step === 'pricing') {
    return '规格配方与价格';
  }

  return '上架设置';
}

function getStepCtaLabel(step: CatalogProductEditorStep) {
  if (step === 'basicInfo') {
    return '保存基础信息并继续';
  }

  if (step === 'pricing') {
    return '保存规格配方并继续';
  }

  return '保存商品';
}

function createPricePreviewRows(
  basePrice: number,
  specs: CatalogProductSpecOption[],
  formulas: CatalogProductFormulaOption[],
  overrides: CatalogProductPriceOverride[]
) {
  const previewProduct: Pick<
    CatalogProductAdminRecord,
    'basePrice' | 'specs' | 'formulas' | 'priceOverrides'
  > = {
    basePrice,
    specs,
    formulas,
    priceOverrides: overrides
  };

  return specs.flatMap((spec) =>
    formulas.map((formula) => {
      const resolution = resolveProductCombinationPrice(previewProduct, {
        specId: spec.id,
        formulaId: formula.id
      });

      return {
        label: `${spec.label} × ${formula.label}`,
        computedPriceLabel: formatMoney(resolution.computedPrice),
        finalPriceLabel: formatMoney(resolution.finalPrice),
        overrideLabel: resolution.source === 'override' ? '已覆盖自动计算' : null
      };
    })
  );
}

function getDraftProductId() {
  return `product-${Date.now()}`;
}

export async function queryCategories(callFunction = getCloudCaller()) {
  const response = (await callFunction({
    name: 'queryCategories',
    data: {}
  })) as {
    result: {
      ok?: boolean;
      categories?: MerchantCategoryListItem[];
    };
  };

  return response.result.categories ?? [];
}

export async function saveCategory(category: CatalogCategoryRecord, callFunction = getCloudCaller()) {
  const response = (await callFunction({
    name: 'upsertCategory',
    data: {
      action: 'update',
      category
    }
  })) as {
    result: {
      ok?: boolean;
      category: CatalogCategoryRecord;
    };
  };

  return response.result.category;
}

export async function deleteCategory(categoryId: string, callFunction = getCloudCaller()) {
  const response = (await callFunction({
    name: 'upsertCategory',
    data: {
      action: 'delete',
      categoryId
    }
  })) as {
    result: {
      ok?: boolean;
      deletedCategoryId: string;
    };
  };

  return response.result.deletedCategoryId;
}

export function getCategoryPageViewModel(categories: MerchantCategoryListItem[]): CategoryPageViewModel {
  return {
    isEmpty: categories.length === 0,
    cards: categories.map((category) => ({
      id: category.id,
      name: category.name,
      iconToken: category.iconToken,
      linkedProductCountLabel: `${category.linkedProductCount} 个商品`,
      deleteActionLabel: category.canDelete ? '删除品类' : '先迁移商品',
      helperText: category.canDelete ? '当前可以直接删除' : '删除前请先迁移该品类下商品'
    }))
  };
}

export async function queryProducts(categoryId = '', callFunction = getCloudCaller()) {
  const response = (await callFunction({
    name: 'queryProducts',
    data: categoryId ? { categoryId } : {}
  })) as {
    result: {
      ok?: boolean;
      products?: CatalogProductAdminRecord[];
    };
  };

  return response.result.products ?? [];
}

export function getProductPageViewModel(
  products: CatalogProductAdminRecord[],
  categories: MerchantCategoryListItem[],
  activeCategoryId: string,
  keyword: string
): ProductPageViewModel {
  const normalizedKeyword = keyword.trim();
  const filteredProducts = products.filter((product) => {
    if (activeCategoryId && product.categoryId !== activeCategoryId) {
      return false;
    }

    if (!normalizedKeyword) {
      return true;
    }

    return `${product.name} ${product.description} ${product.detailContent}`.includes(normalizedKeyword);
  });

  return {
    isEmpty: filteredProducts.length === 0,
    categoryFilters: categories.map((category) => ({
      id: category.id,
      label: category.name,
      isActive: category.id === activeCategoryId
    })),
    cards: filteredProducts.map((product) => ({
      id: product.id,
      name: product.name,
      statusLabel: getStatusLabel(product.status),
      stockLabel: product.trackInventory ? `库存 ${product.stock}` : '库存不跟踪',
      priceRangeLabel: getPriceRangeLabel(product),
      fulfillmentModesLabel: product.fulfillmentModes.map(getFulfillmentModeLabel).join(' / '),
      imagePreviewUrl: product.imagePreviewUrl ?? product.imageFileId
    }))
  };
}

export function createEmptyProductEditorPayload(categoryId = ''): CatalogProductEditorPayload {
  return {
    basicInfo: {
      productId: getDraftProductId(),
      name: '',
      description: '',
      categoryId,
      imageFileId: '',
      imagePreviewUrl: '',
      memberLevelId: null,
      stock: 0
    },
    pricing: {
      basePrice: 0,
      specs: [],
      formulas: [],
      overrides: [],
      purchaseLimit: {
        enabled: false,
        maxQuantity: null
      },
      detailContent: ''
    },
    publishSettings: {
      status: 'draft',
      fulfillmentModes: ['delivery'],
      trackInventory: true
    }
  };
}

export function splitProductEditorPayload(product: CatalogProductAdminRecord): CatalogProductEditorPayload {
  return {
    basicInfo: {
      productId: product.id,
      name: product.name,
      description: product.description,
      categoryId: product.categoryId,
      imageFileId: product.imageFileId,
      imagePreviewUrl: product.imagePreviewUrl ?? product.imageFileId,
      memberLevelId: product.memberLevelId,
      stock: product.stock
    },
    pricing: {
      basePrice: product.basePrice,
      specs: product.specs,
      formulas: product.formulas,
      overrides: product.priceOverrides,
      purchaseLimit: product.purchaseLimit,
      detailContent: product.detailContent
    },
    publishSettings: {
      status: product.status,
      fulfillmentModes: product.fulfillmentModes,
      trackInventory: product.trackInventory
    }
  };
}

export function getProductEditorViewModel(
  payload: CatalogProductEditorPayload,
  activeStep: CatalogProductEditorStep
): ProductEditorViewModel {
  const steps: CatalogProductEditorStep[] = ['basicInfo', 'pricing', 'publishSettings'];

  return {
    steps: steps.map((step, index) => ({
      value: step,
      label: getStepLabel(step),
      isActive: step === activeStep,
      isDone: steps.indexOf(activeStep) > index
    })),
    ctaLabel: getStepCtaLabel(activeStep),
    purchaseLimitLabel: payload.pricing.purchaseLimit.enabled
      ? `限购 ${payload.pricing.purchaseLimit.maxQuantity ?? 0} 件`
      : '不限购',
    detailContentLabel: payload.pricing.detailContent ? '详情内容已填写' : '详情内容待填写',
    fulfillmentModeLabels: payload.publishSettings.fulfillmentModes.map(getFulfillmentModeLabel),
    pricePreviewRows: createPricePreviewRows(
      payload.pricing.basePrice,
      payload.pricing.specs,
      payload.pricing.formulas,
      payload.pricing.overrides
    )
  };
}

export async function uploadProductImage(
  filePath: string,
  productId: string,
  uploader = getUploader()
) {
  const response = (await uploader({
    cloudPath: `products/${productId}/${Date.now()}-${filePath.split('/').pop() ?? 'cover.png'}`,
    filePath
  })) as {
    fileID: string;
  };

  return response.fileID;
}

export async function saveProduct(payload: CatalogProductEditorPayload, callFunction = getCloudCaller()) {
  const response = (await callFunction({
    name: 'upsertProduct',
    data: {
      payload
    }
  })) as {
    result: {
      ok?: boolean;
      product: CatalogProductAdminRecord;
    };
  };

  return response.result.product;
}
