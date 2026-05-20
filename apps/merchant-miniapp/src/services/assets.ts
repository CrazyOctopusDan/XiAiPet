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

const ASSET_ROLE_UPLOAD_VARIANTS: Record<OssAssetRole, OssAssetVariantName> = {
  'product-cover': 'display',
  'product-introduction': 'display',
  'product-detail': 'detail',
  'runtime-banner': 'banner'
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
  path?: string;
}

interface ReadableFileInfo {
  fileInfo: WxFileInfo;
  readableFilePath: string;
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

export interface MerchantAssetUploadFile {
  filePath: string;
  sizeBytes?: number;
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

function appendOssProcess(url: string, rule: AssetVariantRule) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}x-oss-process=image/resize,m_fill,w_${rule.width},h_${rule.height}/quality,q_${rule.quality}`;
}

function getRuleMaxSizeBytes(role: OssAssetRole, variantName: OssAssetVariantName) {
  return ASSET_ROLE_RULES[role].variants[variantName]?.maxSizeBytes ?? 1;
}

function getUploadSizeBytes(sizeBytes: number | undefined) {
  return Number.isFinite(sizeBytes) && Number(sizeBytes) > 0 ? Number(sizeBytes) : 1;
}

function buildOssProcessedAsset(asset: OssAssetReference, role: OssAssetRole, sourceSizeBytes: number): OssAssetReference {
  const variants = Object.entries(ASSET_ROLE_RULES[role].variants).flatMap(([name, rule]) => {
    if (!rule) {
      return [];
    }

    const variantName = name as OssAssetVariantName;
    return [{
      name: variantName,
      objectKey: asset.objectKey,
      url: appendOssProcess(asset.url, rule),
      width: rule.width,
      height: rule.height,
      sizeBytes: Math.min(sourceSizeBytes, rule.maxSizeBytes),
      contentType: asset.contentType
    }];
  });

  const primaryRule = ASSET_ROLE_RULES[role].variants[ASSET_ROLE_UPLOAD_VARIANTS[role]];
  return {
    ...asset,
    width: primaryRule?.width ?? asset.width,
    height: primaryRule?.height ?? asset.height,
    sizeBytes: Math.min(sourceSizeBytes, primaryRule?.maxSizeBytes ?? sourceSizeBytes),
    variants
  };
}

function logAssetUploadFailure(stage: string, error: unknown) {
  if (typeof console !== 'undefined' && typeof console.error === 'function') {
    console.error('[xiaipet] merchant asset upload failed', {
      stage,
      error
    });
  }
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

export function getImageInfo(filePath: string): Promise<WxImageInfo> {
  return promisifyWx<WxImageInfo>((resolve, reject) => {
    getWxApi().getImageInfo({
      src: filePath,
      success: resolve,
      fail: reject
    });
  });
}

function isHttpTemporaryFilePath(filePath: string) {
  return /^https?:\/\/tmp\//.test(filePath);
}

function toDevToolsTemporaryDiskPath(filePath: string) {
  return filePath.replace(/^https?:\/\/tmp(?=\/)/, '/tmp');
}

function getFileInfoFromManager(fileSystemManager: { getFileInfo?: unknown }, filePath: string): Promise<WxFileInfo> {
  const getInfo = fileSystemManager.getFileInfo;

  if (typeof getInfo !== 'function') {
    throw new MerchantApiError('WX_FILE_INFO_UNAVAILABLE', 'File info API is unavailable');
  }

  return promisifyWx<WxFileInfo>((resolve, reject) => {
    getInfo.call(fileSystemManager, {
      filePath,
      success: resolve,
      fail: reject
    });
  });
}

function normalizeFallbackSizeBytes(sizeBytes: number | undefined, maxSizeBytes?: number) {
  if (!Number.isFinite(sizeBytes) || Number(sizeBytes) <= 0) {
    return maxSizeBytes;
  }

  return maxSizeBytes ? Math.min(Number(sizeBytes), maxSizeBytes) : Number(sizeBytes);
}

async function getReadableFileInfo(
  filePath: string,
  imageInfo?: WxImageInfo,
  fallbackSizeBytes?: number
): Promise<ReadableFileInfo> {
  const wxApi = getWxApi();
  const fileSystemManager = typeof wxApi.getFileSystemManager === 'function' ? wxApi.getFileSystemManager() : null;

  if (!fileSystemManager || typeof fileSystemManager.getFileInfo !== 'function') {
    throw new MerchantApiError('WX_FILE_INFO_UNAVAILABLE', 'File info API is unavailable');
  }

  const candidates = [filePath];
  if (isHttpTemporaryFilePath(filePath)) {
    candidates.unshift(toDevToolsTemporaryDiskPath(filePath));
    if (imageInfo?.path && !isHttpTemporaryFilePath(imageInfo.path)) {
      candidates.unshift(imageInfo.path);
    }
  }

  let lastError: unknown;
  for (const candidate of Array.from(new Set(candidates))) {
    try {
      return {
        fileInfo: await getFileInfoFromManager(fileSystemManager, candidate),
        readableFilePath: candidate
      };
    } catch (error) {
      lastError = error;
    }
  }

  const normalizedFallbackSizeBytes = normalizeFallbackSizeBytes(fallbackSizeBytes);
  if (normalizedFallbackSizeBytes) {
    return {
      fileInfo: { size: normalizedFallbackSizeBytes },
      readableFilePath: filePath
    };
  }

  throw lastError;
}

export async function getFileInfo(filePath: string): Promise<WxFileInfo> {
  return (await getReadableFileInfo(filePath)).fileInfo;
}

async function getUploadedVariantFileInfo(
  filePath: string,
  fallbackSizeBytes?: number
): Promise<ReadableFileInfo & { imageInfo: WxImageInfo }> {
  const imageInfo = await getImageInfo(filePath);
  const readable = await getReadableFileInfo(filePath, imageInfo, fallbackSizeBytes);

  return {
    ...readable,
    imageInfo
  };
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
    fileSizeBytes?: number;
    processingMode?: AssetProcessingMode;
    request?: MerchantApiRequester;
  } = {}
): Promise<UploadedMerchantAsset> {
  let uploadStage = 'select-file';
  try {
    const request = options.request ?? merchantApiRequest;
    const selectedFile = options.filePath ?? await chooseAssetImage();
    const variantName = ASSET_ROLE_UPLOAD_VARIANTS[role];
    const rule = ASSET_ROLE_RULES[role].variants[variantName];
    if (!rule) {
      throw new MerchantApiError('INVALID_ASSET_VARIANT', 'Asset variant is not supported for this role', 400);
    }

    const contentType = normalizeImageContentType(selectedFile);
    const uploadSizeBytes = getUploadSizeBytes(options.fileSizeBytes);
    uploadStage = `request-upload-policy:${variantName}`;
    const upload = await requestUploadPolicy({
      role,
      variantName,
      extension: extensionFromContentType(contentType),
      contentType,
      sizeBytes: uploadSizeBytes
    }, request);
    uploadStage = `upload-oss:${variantName}`;
    await uploadFileToOss(selectedFile, upload);
    uploadStage = `confirm-upload:${variantName}`;
    const confirmed = await confirmUpload({
      confirmToken: upload.confirmToken,
      role,
      variantName,
      objectKey: upload.objectKey,
      width: rule.width,
      height: rule.height,
      sizeBytes: Math.min(uploadSizeBytes, getRuleMaxSizeBytes(role, variantName)),
      contentType
    }, request);

    const asset = buildOssProcessedAsset(confirmed.asset, role, uploadSizeBytes);

    return {
      asset,
      storageId: confirmed.storageId
    };
  } catch (error) {
    logAssetUploadFailure(uploadStage, error);
    throw error;
  }
}
