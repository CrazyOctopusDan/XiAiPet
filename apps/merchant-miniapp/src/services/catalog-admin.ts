import type { OrderFulfillmentMode } from '@xiaipet/shared';
import type {
  CatalogCategoryRecord,
  CatalogPageInfo,
  CatalogProductAdminRecord,
  CatalogProductAdminListItem,
  CatalogProductAdminListResponse,
  CatalogProductAdminListSummary,
  CatalogProductEditorPayload,
  CatalogProductEditorStep,
  CatalogProductFormulaOption,
  CatalogProductPriceOverride,
  CatalogProductSpecOption
} from '@xiaipet/shared/types/catalog-admin';
import type { OssAssetReference, OssAssetVariant } from '@xiaipet/shared/types/assets';
import { resolveProductCombinationPrice } from '../shared/product-pricing';
import { merchantApiRequest, type MerchantApiRequester } from './api-client';
import { uploadMerchantAsset, type MerchantAssetUploadFile, type UploadedMerchantAsset } from './assets';

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

export interface CategoryPageSummaryViewModel {
  totalCategories: number;
  linkedProducts: number;
  lockedCategories: number;
}

export interface CategoryPageViewModel {
  isEmpty: boolean;
  summary: CategoryPageSummaryViewModel;
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

export interface ProductPageSummaryViewModel {
  totalProducts: number;
  publishedProducts: number;
  stockWarnings: number;
}

export interface ProductPageViewModel {
  isEmpty: boolean;
  summary: ProductPageSummaryViewModel;
  categoryFilters: ProductCategoryFilterViewModel[];
  cards: ProductCardViewModel[];
}

export interface MerchantProductQueryFilters {
  categoryId?: string;
  status?: string;
  keyword?: string;
  sort?: string;
  limit?: number;
  cursor?: string;
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

export interface ProductFulfillmentModeOptionViewModel {
  value: OrderFulfillmentMode;
  label: string;
  isActive: boolean;
}

export interface ProductBasicImageTileViewModel {
  index: number;
  imageSrc: string;
  isCover: boolean;
}

export interface ProductDetailImageTileViewModel {
  index: number;
  imageSrc: string;
}

export interface ProductEditorViewModel {
  steps: ProductEditorStepViewModel[];
  activeStepLabel: string;
  ctaLabel: string;
  previousStepLabel: string | null;
  basicImageCountLabel: string;
  basicImageTiles: ProductBasicImageTileViewModel[];
  canAddBasicImage: boolean;
  detailImageCountLabel: string;
  detailImageTiles: ProductDetailImageTileViewModel[];
  canAddDetailImage: boolean;
  purchaseLimitLabel: string;
  detailContentLabel: string;
  fulfillmentModeOptions: ProductFulfillmentModeOptionViewModel[];
  fulfillmentModeLabels: string[];
  pricePreviewRows: ProductPricePreviewRowViewModel[];
}

function formatMoney(value: number) {
  return `￥${value.toFixed(2)}`;
}

type ProductListSource = CatalogProductAdminRecord | CatalogProductAdminListItem;

function getStatusLabel(status: ProductListSource['status']) {
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

function getFulfillmentModeOptions(activeModes: OrderFulfillmentMode[]): ProductFulfillmentModeOptionViewModel[] {
  const modes: OrderFulfillmentMode[] = ['delivery', 'pickup', 'express'];

  return modes.map((mode) => ({
    value: mode,
    label: getFulfillmentModeLabel(mode),
    isActive: activeModes.includes(mode)
  }));
}

function hasListPriceRange(product: ProductListSource): product is CatalogProductAdminListItem {
  return 'minPrice' in product && 'maxPrice' in product;
}

function getPriceRangeLabel(product: ProductListSource) {
  if (hasListPriceRange(product)) {
    if (product.minPrice === product.maxPrice) {
      return formatMoney(product.minPrice);
    }

    return `${formatMoney(product.minPrice)} 起`;
  }

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

function getProductImagePreviewUrl(product: ProductListSource) {
  if ('thumbnail' in product && product.thumbnail) {
    return normalizeImageUrlForDisplay(product.thumbnail);
  }

  const fullProduct = product as CatalogProductAdminRecord;
  return normalizeImageUrlForDisplay(fullProduct.imageAsset?.url ?? fullProduct.imagePreviewUrl ?? fullProduct.imageFileId);
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

function getPreviousStepLabel(step: CatalogProductEditorStep) {
  if (step === 'pricing') {
    return '返回基础信息';
  }

  if (step === 'publishSettings') {
    return '返回规格配方与价格';
  }

  return null;
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

function getAssetDisplayUrl(asset: OssAssetReference) {
  const variants = Array.isArray(asset.variants) ? asset.variants : [];
  const displayVariant = variants.find(
    (variant): variant is OssAssetVariant =>
      Boolean(variant) &&
      typeof variant === 'object' &&
      'name' in variant &&
      'url' in variant &&
      variant.name === 'display' &&
      typeof variant.url === 'string'
  );

  return normalizeImageUrlForDisplay(displayVariant?.url ?? asset.url);
}

function getBasicImageTiles(payload: CatalogProductEditorPayload): ProductBasicImageTileViewModel[] {
  const assets = payload.basicInfo.introductionImageAssets ?? [];

  if (assets.length) {
    return assets.slice(0, 3).map((asset, index) => ({
      index,
      imageSrc: getAssetDisplayUrl(asset),
      isCover: index === 0
    }));
  }

  const fallback = payload.basicInfo.imageAsset
    ? getAssetDisplayUrl(payload.basicInfo.imageAsset)
    : normalizeImageUrlForDisplay(payload.basicInfo.imagePreviewUrl || payload.basicInfo.imageFileId);

  return fallback
    ? [
        {
          index: 0,
          imageSrc: fallback,
          isCover: true
        }
      ]
    : [];
}

function getDetailImageTiles(payload: CatalogProductEditorPayload): ProductDetailImageTileViewModel[] {
  return (payload.basicInfo.detailImageAssets ?? []).slice(0, 9).map((asset, index) => ({
    index,
    imageSrc: getAssetDisplayUrl(asset)
  }));
}

export async function queryCategories(request: MerchantApiRequester = merchantApiRequest) {
  const response = await request<{
    ok?: boolean;
    categories?: MerchantCategoryListItem[];
  }>('/api/v1/merchant/categories', {
    method: 'GET',
    auth: 'merchant'
  });

  return (response.categories ?? []).map((category) => {
    const linkedProductCount = category.linkedProductCount ?? 0;
    return {
      ...category,
      linkedProductCount,
      canDelete: category.canDelete ?? linkedProductCount === 0
    };
  });
}

export async function saveCategory(category: CatalogCategoryRecord, request: MerchantApiRequester = merchantApiRequest) {
  const response = await request<{
    ok?: boolean;
    category: CatalogCategoryRecord;
  }>(`/api/v1/merchant/categories/${category.id}`, {
    method: 'PUT',
    body: category,
    auth: 'merchant'
  });

  return response.category;
}

export async function deleteCategory(categoryId: string, request: MerchantApiRequester = merchantApiRequest) {
  await request<{ ok?: boolean }>(`/api/v1/merchant/categories/${categoryId}`, {
    method: 'DELETE',
    auth: 'merchant'
  });

  return categoryId;
}

export function getCategoryPageViewModel(categories: MerchantCategoryListItem[]): CategoryPageViewModel {
  return {
    isEmpty: categories.length === 0,
    summary: {
      totalCategories: categories.length,
      linkedProducts: categories.reduce((sum, category) => sum + category.linkedProductCount, 0),
      lockedCategories: categories.filter((category) => !category.canDelete).length
    },
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

function defaultProductListSummary(): CatalogProductAdminListSummary {
  return {
    totalProducts: 0,
    publishedProducts: 0,
    draftProducts: 0,
    archivedProducts: 0,
    stockWarnings: 0
  };
}

function defaultPageInfo(): CatalogPageInfo {
  return { hasMore: false, nextCursor: null };
}

function cleanProductQuery(filters: MerchantProductQueryFilters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== '')
  );
}

export async function queryProducts(
  filters: MerchantProductQueryFilters = {},
  request: MerchantApiRequester = merchantApiRequest
) {
  const query = cleanProductQuery(filters);
  const response = await request<
    { ok?: boolean; products?: CatalogProductAdminRecord[] } & Partial<CatalogProductAdminListResponse>
  >('/api/v1/merchant/products', {
    method: 'GET',
    query,
    auth: 'merchant'
  });

  const items = response.items ?? response.products ?? [];

  return {
    items,
    summary: response.summary ?? defaultProductListSummary(),
    pageInfo: response.pageInfo ?? defaultPageInfo(),
    snapshotKey: response.snapshotKey ?? ''
  };
}

export function applyProductCountsToCategories(
  categories: MerchantCategoryListItem[],
  products: Pick<CatalogProductAdminRecord, 'categoryId'>[]
): MerchantCategoryListItem[] {
  const productCounts = products.reduce<Record<string, number>>((counts, product) => {
    counts[product.categoryId] = (counts[product.categoryId] ?? 0) + 1;
    return counts;
  }, {});

  return categories.map((category) => {
    const linkedProductCount = productCounts[category.id] ?? 0;

    return {
      ...category,
      linkedProductCount,
      canDelete: linkedProductCount === 0
    };
  });
}

export function getProductPageViewModel(
  products: ProductListSource[],
  categories: MerchantCategoryListItem[],
  activeCategoryId: string,
  keyword: string,
  backendSummary?: CatalogProductAdminListSummary
): ProductPageViewModel {
  const normalizedKeyword = keyword.trim();
  const filteredProducts = products.filter((product) => {
    if (activeCategoryId && product.categoryId !== activeCategoryId) {
      return false;
    }

    if (!normalizedKeyword) {
      return true;
    }

    const detailContent = 'detailContent' in product ? product.detailContent : '';
    return `${product.name} ${product.description} ${detailContent}`.includes(normalizedKeyword);
  });

  return {
    isEmpty: filteredProducts.length === 0,
    summary: backendSummary
      ? {
          totalProducts: backendSummary.totalProducts,
          publishedProducts: backendSummary.publishedProducts,
          stockWarnings: backendSummary.stockWarnings
        }
      : {
          totalProducts: filteredProducts.length,
          publishedProducts: filteredProducts.filter((product) => product.status === 'published').length,
          stockWarnings: filteredProducts.filter((product) => product.trackInventory && product.stock <= 0).length
        },
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
      imagePreviewUrl: getProductImagePreviewUrl(product)
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
      introductionImageAssets: [],
      detailImageAssets: [],
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
      imageAsset: product.imageAsset,
      introductionImageAssets: product.introductionImageAssets ?? [],
      detailImageAssets: product.detailImageAssets ?? [],
      imagePreviewUrl: normalizeImageUrlForDisplay(product.imagePreviewUrl ?? product.imageFileId),
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
  const basicImageTiles = getBasicImageTiles(payload);
  const detailImageTiles = getDetailImageTiles(payload);

  return {
    activeStepLabel: getStepLabel(activeStep),
    steps: steps.map((step, index) => ({
      value: step,
      label: getStepLabel(step),
      isActive: step === activeStep,
      isDone: steps.indexOf(activeStep) > index
    })),
    ctaLabel: getStepCtaLabel(activeStep),
    previousStepLabel: getPreviousStepLabel(activeStep),
    basicImageCountLabel: `${basicImageTiles.length} / 3`,
    basicImageTiles,
    canAddBasicImage: basicImageTiles.length < 3,
    detailImageCountLabel: `${detailImageTiles.length} / 9`,
    detailImageTiles,
    canAddDetailImage: detailImageTiles.length < 9,
    purchaseLimitLabel: payload.pricing.purchaseLimit.enabled
      ? `限购 ${payload.pricing.purchaseLimit.maxQuantity ?? 0} 件`
      : '不限购',
    detailContentLabel: payload.pricing.detailContent ? '详情内容已填写' : '详情内容待填写',
    fulfillmentModeOptions: getFulfillmentModeOptions(payload.publishSettings.fulfillmentModes),
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
  filePath: string | MerchantAssetUploadFile,
  productId: string,
  request?: MerchantApiRequester
): Promise<string> {
  void productId;
  const file = typeof filePath === 'string' ? { filePath } : { filePath: filePath.filePath, fileSizeBytes: filePath.sizeBytes };
  const uploaded = await uploadMerchantAsset('product-cover', {
    ...file,
    processingMode: 'miniapp',
    request
  });
  return uploaded.storageId;
}

export async function uploadProductCoverAsset(
  filePath: string | MerchantAssetUploadFile,
  request?: MerchantApiRequester
): Promise<UploadedMerchantAsset> {
  const file = typeof filePath === 'string' ? { filePath } : { filePath: filePath.filePath, fileSizeBytes: filePath.sizeBytes };
  return uploadMerchantAsset('product-cover', {
    ...file,
    processingMode: 'miniapp',
    request
  });
}

export async function uploadProductDetailAsset(
  filePath: string | MerchantAssetUploadFile,
  request?: MerchantApiRequester
): Promise<UploadedMerchantAsset> {
  const file = typeof filePath === 'string' ? { filePath } : { filePath: filePath.filePath, fileSizeBytes: filePath.sizeBytes };
  return uploadMerchantAsset('product-detail', {
    ...file,
    processingMode: 'miniapp',
    request
  });
}

export async function saveProduct(payload: CatalogProductEditorPayload, request: MerchantApiRequester = merchantApiRequest) {
  const response = await request<{
    ok?: boolean;
    product: CatalogProductAdminRecord;
  }>(`/api/v1/merchant/products/${payload.basicInfo.productId}`, {
    method: 'PUT',
    body: payload,
    auth: 'merchant'
  });

  return response.product;
}

export async function deleteProduct(productId: string, request: MerchantApiRequester = merchantApiRequest) {
  await request<{ ok?: boolean; deletedProductId?: string }>(`/api/v1/merchant/products/${productId}`, {
    method: 'DELETE',
    auth: 'merchant'
  });

  return productId;
}
