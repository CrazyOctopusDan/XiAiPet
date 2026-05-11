import type { OssAssetReference, OssAssetRole, OssAssetVariantName } from '@xiaipet/shared/types/assets';
import { merchantApiRequest, MerchantApiError, type MerchantApiRequester } from './api-client';

declare const wx: any;

export type AssetProcessingMode = 'miniapp' | 'manual';

export interface AssetVariantRule {
  width: number;
  height: number;
  maxSizeBytes: number;
  quality: number;
}

export interface AssetRoleRule {
  cropScale: string;
  variants: Partial<Record<OssAssetVariantName, AssetVariantRule>>;
}

export const ASSET_ROLE_RULES: Record<OssAssetRole, AssetRoleRule> = {
  'product-cover': {
    cropScale: '1:1',
    variants: {
      thumbnail: { width: 480, height: 480, maxSizeBytes: 184_320, quality: 80 },
      display: { width: 960, height: 960, maxSizeBytes: 460_800, quality: 82 }
    }
  },
  'product-introduction': {
    cropScale: '4:3',
    variants: {
      display: { width: 960, height: 720, maxSizeBytes: 512_000, quality: 82 }
    }
  },
  'product-detail': {
    cropScale: '3:4',
    variants: {
      detail: { width: 960, height: 1280, maxSizeBytes: 716_800, quality: 82 }
    }
  },
  'runtime-banner': {
    cropScale: '16:9',
    variants: {
      banner: { width: 1280, height: 720, maxSizeBytes: 665_600, quality: 82 }
    }
  }
};

interface WxChooseImageResponse {
  tempFilePaths?: string[];
  tempFiles?: Array<{ path?: string; tempFilePath?: string; size?: number }>;
}

interface WxFileInfo {
  size: number;
}

interface WxImageInfo {
  width: number;
  height: number;
}

interface UploadPolicyResponse {
  ok?: boolean;
  upload: {
    method: 'POST';
    url: string;
    fileFieldName: string;
    formData: Record<string, string>;
    objectKey: string;
    expiresAt: string;
    confirmToken: string;
  };
}

interface ConfirmUploadResponse {
  ok?: boolean;
  asset: OssAssetReference;
  storageId: string;
}

export interface UploadedMerchantAsset {
  asset: OssAssetReference;
  storageId: string;
}

function getWxApi() {
  if (typeof wx === 'undefined') {
    throw new MerchantApiError('WX_UNAVAILABLE', 'WeChat API is unavailable');
  }
  return wx;
}

function promisifyWx<T>(invoke: (resolve: (value: T) => void, reject: (reason: unknown) => void) => void): Promise<T> {
  return new Promise((resolve, reject) => invoke(resolve, reject));
}

function extensionFromContentType(contentType: string) {
  if (contentType === 'image/png') {
    return 'png';
  }

  if (contentType === 'image/webp') {
    return 'webp';
  }

  return 'jpg';
}

function normalizeImageContentType(path: string) {
  const lower = path.toLowerCase();
  if (lower.endsWith('.png')) {
    return 'image/png';
  }

  if (lower.endsWith('.webp')) {
    return 'image/webp';
  }

  return 'image/jpeg';
}

export async function chooseAssetImage(): Promise<string> {
  const result = await promisifyWx<WxChooseImageResponse>((resolve, reject) => {
    getWxApi().chooseImage({
      count: 1,
      sizeType: ['compressed', 'original'],
      sourceType: ['album', 'camera'],
      success: resolve,
      fail: reject
    });
  });

  const file = result.tempFilePaths?.[0] ?? result.tempFiles?.[0]?.path ?? result.tempFiles?.[0]?.tempFilePath;
  if (!file) {
    throw new MerchantApiError('ASSET_FILE_MISSING', 'No image was selected');
  }
  return file;
}

export async function cropAssetImage(filePath: string, role: OssAssetRole): Promise<string> {
  const wxApi = getWxApi();
  if (typeof wxApi.cropImage !== 'function') {
    return filePath;
  }

  return promisifyWx<{ tempFilePath?: string }>((resolve, reject) => {
    wxApi.cropImage({
      src: filePath,
      cropScale: ASSET_ROLE_RULES[role].cropScale,
      success: resolve,
      fail: reject
    });
  }).then((result) => result.tempFilePath ?? filePath);
}

export async function compressAssetImage(
  filePath: string,
  rule: AssetVariantRule,
  processingMode: AssetProcessingMode
): Promise<string> {
  const wxApi = getWxApi();
  if (processingMode === 'manual' || typeof wxApi.compressImage !== 'function') {
    return filePath;
  }

  return promisifyWx<{ tempFilePath?: string }>((resolve, reject) => {
    wxApi.compressImage({
      src: filePath,
      quality: rule.quality,
      success: resolve,
      fail: reject
    });
  }).then((result) => result.tempFilePath ?? filePath);
}

export function getImageInfo(filePath: string): Promise<WxImageInfo> {
  return promisifyWx<WxImageInfo>((resolve, reject) => {
    getWxApi().getImageInfo({
      src: filePath,
      success: resolve,
      fail: reject
    });
  });
}

export function getFileInfo(filePath: string): Promise<WxFileInfo> {
  return promisifyWx<WxFileInfo>((resolve, reject) => {
    getWxApi().getFileInfo({
      filePath,
      success: resolve,
      fail: reject
    });
  });
}

export async function requestUploadPolicy(
  input: {
    role: OssAssetRole;
    variantName: OssAssetVariantName;
    extension: string;
    contentType: string;
    sizeBytes: number;
  },
  request: MerchantApiRequester = merchantApiRequest
) {
  const response = await request<UploadPolicyResponse>('/api/v1/merchant/assets/upload-policies', {
    method: 'POST',
    body: input,
    auth: 'merchant'
  });
  return response.upload;
}

export async function uploadFileToOss(filePath: string, upload: UploadPolicyResponse['upload']): Promise<void> {
  await promisifyWx<{ statusCode?: number; data?: unknown }>((resolve, reject) => {
    getWxApi().uploadFile({
      url: upload.url,
      filePath,
      name: upload.fileFieldName,
      formData: upload.formData,
      success: resolve,
      fail: reject
    });
  }).then((result) => {
    const statusCode = result.statusCode ?? 0;
    if (statusCode < 200 || statusCode >= 300) {
      throw new MerchantApiError('OSS_UPLOAD_FAILED', 'OSS upload failed', statusCode, result.data);
    }
  });
}

export async function confirmUpload(
  input: {
    confirmToken: string;
    role: OssAssetRole;
    variantName: OssAssetVariantName;
    objectKey: string;
    width: number;
    height: number;
    sizeBytes: number;
    contentType: string;
  },
  request: MerchantApiRequester = merchantApiRequest
) {
  const response = await request<ConfirmUploadResponse>('/api/v1/merchant/assets/uploads/confirm', {
    method: 'POST',
    body: input,
    auth: 'merchant'
  });
  return response;
}

export async function uploadMerchantAsset(
  role: OssAssetRole,
  options: {
    filePath?: string;
    processingMode?: AssetProcessingMode;
    request?: MerchantApiRequester;
  } = {}
): Promise<UploadedMerchantAsset> {
  const processingMode = options.processingMode ?? 'miniapp';
  const request = options.request ?? merchantApiRequest;
  const selectedFile = options.filePath ?? await chooseAssetImage();
  const croppedFile = processingMode === 'miniapp' ? await cropAssetImage(selectedFile, role) : selectedFile;
  const confirmations: ConfirmUploadResponse[] = [];

  for (const [variantName, rule] of Object.entries(ASSET_ROLE_RULES[role].variants)) {
    if (!rule) {
      continue;
    }

    const variantFile = await compressAssetImage(croppedFile, rule, processingMode);
    const [fileInfo, imageInfo] = await Promise.all([
      getFileInfo(variantFile),
      getImageInfo(variantFile)
    ]);
    if (fileInfo.size > rule.maxSizeBytes) {
      throw new MerchantApiError('ASSET_FILE_TOO_LARGE', 'Image exceeds the upload size limit', 400, {
        maxSizeBytes: rule.maxSizeBytes,
        sizeBytes: fileInfo.size
      });
    }

    const contentType = normalizeImageContentType(variantFile);
    const upload = await requestUploadPolicy({
      role,
      variantName: variantName as OssAssetVariantName,
      extension: extensionFromContentType(contentType),
      contentType,
      sizeBytes: fileInfo.size
    }, request);
    await uploadFileToOss(variantFile, upload);
    confirmations.push(await confirmUpload({
      confirmToken: upload.confirmToken,
      role,
      variantName: variantName as OssAssetVariantName,
      objectKey: upload.objectKey,
      width: imageInfo.width,
      height: imageInfo.height,
      sizeBytes: fileInfo.size,
      contentType
    }, request));
  }

  const primary = confirmations.find((item) => item.asset.variants.some((variant) => variant.name === 'display')) ?? confirmations[0];
  const variants = confirmations.flatMap((item) => item.asset.variants);
  const asset: OssAssetReference = {
    ...primary.asset,
    variants
  };

  return {
    asset,
    storageId: primary.storageId
  };
}
