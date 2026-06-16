"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ASSET_ROLE_RULES = void 0;
exports.chooseAssetImage = chooseAssetImage;
exports.getImageInfo = getImageInfo;
exports.getFileInfo = getFileInfo;
exports.requestUploadPolicy = requestUploadPolicy;
exports.uploadFileToOss = uploadFileToOss;
exports.confirmUpload = confirmUpload;
exports.uploadMerchantAsset = uploadMerchantAsset;
const api_client_1 = require("./api-client");
exports.ASSET_ROLE_RULES = {
    'product-cover': {
        cropScale: '1:1',
        variants: {
            thumbnail: { width: 360, height: 360, maxSizeBytes: 122880, quality: 76 },
            display: { width: 720, height: 720, maxSizeBytes: 307200, quality: 80 }
        }
    },
    'product-introduction': {
        cropScale: '4:3',
        variants: {
            display: { width: 750, height: 670, maxSizeBytes: 409600, quality: 80 }
        }
    },
    'product-detail': {
        cropScale: '3:4',
        variants: {
            detail: { width: 720, height: 1280, maxSizeBytes: 512000, quality: 78, mode: 'm_lfit', includeHeight: false }
        }
    },
    'runtime-banner': {
        cropScale: '16:9',
        variants: {
            banner: { width: 750, height: 750, maxSizeBytes: 409600, quality: 80, mode: 'm_lfit', includeHeight: false }
        }
    }
};
const ASSET_ROLE_UPLOAD_VARIANTS = {
    'product-cover': 'display',
    'product-introduction': 'display',
    'product-detail': 'detail',
    'runtime-banner': 'banner'
};
function getWxApi() {
    if (typeof wx === 'undefined') {
        throw new api_client_1.MerchantApiError('WX_UNAVAILABLE', 'WeChat API is unavailable');
    }
    return wx;
}
function promisifyWx(invoke) {
    return new Promise((resolve, reject) => invoke(resolve, reject));
}
function extensionFromContentType(contentType) {
    if (contentType === 'image/png') {
        return 'png';
    }
    if (contentType === 'image/webp') {
        return 'webp';
    }
    return 'jpg';
}
function normalizeImageContentType(path) {
    const lower = path.toLowerCase();
    if (lower.endsWith('.png')) {
        return 'image/png';
    }
    if (lower.endsWith('.webp')) {
        return 'image/webp';
    }
    return 'image/jpeg';
}
function appendOssProcess(url, rule) {
    var _a;
    const separator = url.includes('?') ? '&' : '?';
    const mode = (_a = rule.mode) !== null && _a !== void 0 ? _a : 'm_fill';
    const height = rule.includeHeight === false ? '' : `,h_${rule.height}`;
    return `${url}${separator}x-oss-process=image/resize,${mode},w_${rule.width}${height}/format,webp/quality,q_${rule.quality}`;
}
function getRuleMaxSizeBytes(role, variantName) {
    var _a, _b;
    return (_b = (_a = exports.ASSET_ROLE_RULES[role].variants[variantName]) === null || _a === void 0 ? void 0 : _a.maxSizeBytes) !== null && _b !== void 0 ? _b : 1;
}
function getUploadSizeBytes(sizeBytes) {
    return Number.isFinite(sizeBytes) && Number(sizeBytes) > 0 ? Number(sizeBytes) : 1;
}
function buildOssProcessedAsset(asset, role, sourceSizeBytes) {
    const variants = Object.entries(exports.ASSET_ROLE_RULES[role].variants).flatMap(([name, rule]) => {
        if (!rule) {
            return [];
        }
        const variantName = name;
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
    return {
        ...asset,
        sizeBytes: Math.min(sourceSizeBytes, asset.sizeBytes),
        variants
    };
}
function logAssetUploadFailure(stage, error) {
    if (typeof console !== 'undefined' && typeof console.error === 'function') {
        console.error('[xiaipet] merchant asset upload failed', {
            stage,
            error
        });
    }
}
async function chooseAssetImage() {
    var _a, _b, _c, _d, _e, _f, _g;
    const result = await promisifyWx((resolve, reject) => {
        getWxApi().chooseImage({
            count: 1,
            sizeType: ['compressed', 'original'],
            sourceType: ['album', 'camera'],
            success: resolve,
            fail: reject
        });
    });
    const file = (_e = (_b = (_a = result.tempFilePaths) === null || _a === void 0 ? void 0 : _a[0]) !== null && _b !== void 0 ? _b : (_d = (_c = result.tempFiles) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.path) !== null && _e !== void 0 ? _e : (_g = (_f = result.tempFiles) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.tempFilePath;
    if (!file) {
        throw new api_client_1.MerchantApiError('ASSET_FILE_MISSING', 'No image was selected');
    }
    return file;
}
function getImageInfo(filePath) {
    return promisifyWx((resolve, reject) => {
        getWxApi().getImageInfo({
            src: filePath,
            success: resolve,
            fail: reject
        });
    });
}
function isHttpTemporaryFilePath(filePath) {
    return /^https?:\/\/tmp\//.test(filePath);
}
function toDevToolsTemporaryDiskPath(filePath) {
    return filePath.replace(/^https?:\/\/tmp(?=\/)/, '/tmp');
}
function getFileInfoFromManager(fileSystemManager, filePath) {
    const getInfo = fileSystemManager.getFileInfo;
    if (typeof getInfo !== 'function') {
        throw new api_client_1.MerchantApiError('WX_FILE_INFO_UNAVAILABLE', 'File info API is unavailable');
    }
    return promisifyWx((resolve, reject) => {
        getInfo.call(fileSystemManager, {
            filePath,
            success: resolve,
            fail: reject
        });
    });
}
function normalizeFallbackSizeBytes(sizeBytes, maxSizeBytes) {
    if (!Number.isFinite(sizeBytes) || Number(sizeBytes) <= 0) {
        return maxSizeBytes;
    }
    return maxSizeBytes ? Math.min(Number(sizeBytes), maxSizeBytes) : Number(sizeBytes);
}
async function getReadableFileInfo(filePath, imageInfo, fallbackSizeBytes) {
    const wxApi = getWxApi();
    const fileSystemManager = typeof wxApi.getFileSystemManager === 'function' ? wxApi.getFileSystemManager() : null;
    if (!fileSystemManager || typeof fileSystemManager.getFileInfo !== 'function') {
        throw new api_client_1.MerchantApiError('WX_FILE_INFO_UNAVAILABLE', 'File info API is unavailable');
    }
    const candidates = [filePath];
    if (isHttpTemporaryFilePath(filePath)) {
        candidates.unshift(toDevToolsTemporaryDiskPath(filePath));
        if ((imageInfo === null || imageInfo === void 0 ? void 0 : imageInfo.path) && !isHttpTemporaryFilePath(imageInfo.path)) {
            candidates.unshift(imageInfo.path);
        }
    }
    let lastError;
    for (const candidate of Array.from(new Set(candidates))) {
        try {
            return {
                fileInfo: await getFileInfoFromManager(fileSystemManager, candidate),
                readableFilePath: candidate
            };
        }
        catch (error) {
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
async function getFileInfo(filePath) {
    return (await getReadableFileInfo(filePath)).fileInfo;
}
async function getUploadedVariantFileInfo(filePath, fallbackSizeBytes) {
    const imageInfo = await getImageInfo(filePath);
    const readable = await getReadableFileInfo(filePath, imageInfo, fallbackSizeBytes);
    return {
        ...readable,
        imageInfo
    };
}
async function getOptionalImageInfo(filePath) {
    const wxApi = getWxApi();
    if (typeof wxApi.getImageInfo !== 'function') {
        return undefined;
    }
    try {
        return await getImageInfo(filePath);
    }
    catch (_a) {
        return undefined;
    }
}
async function requestUploadPolicy(input, request = api_client_1.merchantApiRequest) {
    const response = await request('/api/v1/merchant/assets/upload-policies', {
        method: 'POST',
        body: input,
        auth: 'merchant'
    });
    return response.upload;
}
async function uploadFileToOss(filePath, upload) {
    await promisifyWx((resolve, reject) => {
        getWxApi().uploadFile({
            url: upload.url,
            filePath,
            name: upload.fileFieldName,
            formData: upload.formData,
            success: resolve,
            fail: reject
        });
    }).then((result) => {
        var _a;
        const statusCode = (_a = result.statusCode) !== null && _a !== void 0 ? _a : 0;
        if (statusCode < 200 || statusCode >= 300) {
            throw new api_client_1.MerchantApiError('OSS_UPLOAD_FAILED', 'OSS upload failed', statusCode, result.data);
        }
    });
}
async function confirmUpload(input, request = api_client_1.merchantApiRequest) {
    const response = await request('/api/v1/merchant/assets/uploads/confirm', {
        method: 'POST',
        body: input,
        auth: 'merchant'
    });
    return response;
}
async function uploadMerchantAsset(role, options = {}) {
    var _a, _b, _c, _d;
    let uploadStage = 'select-file';
    try {
        const request = (_a = options.request) !== null && _a !== void 0 ? _a : api_client_1.merchantApiRequest;
        const selectedFile = (_b = options.filePath) !== null && _b !== void 0 ? _b : await chooseAssetImage();
        const variantName = ASSET_ROLE_UPLOAD_VARIANTS[role];
        const rule = exports.ASSET_ROLE_RULES[role].variants[variantName];
        if (!rule) {
            throw new api_client_1.MerchantApiError('INVALID_ASSET_VARIANT', 'Asset variant is not supported for this role', 400);
        }
        const contentType = normalizeImageContentType(selectedFile);
        const uploadSizeBytes = getUploadSizeBytes(options.fileSizeBytes);
        const sourceImageInfo = await getOptionalImageInfo(selectedFile);
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
            width: (_c = sourceImageInfo === null || sourceImageInfo === void 0 ? void 0 : sourceImageInfo.width) !== null && _c !== void 0 ? _c : rule.width,
            height: (_d = sourceImageInfo === null || sourceImageInfo === void 0 ? void 0 : sourceImageInfo.height) !== null && _d !== void 0 ? _d : rule.height,
            sizeBytes: uploadSizeBytes,
            contentType
        }, request);
        const asset = buildOssProcessedAsset(confirmed.asset, role, uploadSizeBytes);
        return {
            asset,
            storageId: confirmed.storageId
        };
    }
    catch (error) {
        logAssetUploadFailure(uploadStage, error);
        throw error;
    }
}
