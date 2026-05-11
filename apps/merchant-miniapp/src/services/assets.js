"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ASSET_ROLE_RULES = void 0;
exports.chooseAssetImage = chooseAssetImage;
exports.cropAssetImage = cropAssetImage;
exports.compressAssetImage = compressAssetImage;
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
            thumbnail: { width: 480, height: 480, maxSizeBytes: 184320, quality: 80 },
            display: { width: 960, height: 960, maxSizeBytes: 460800, quality: 82 }
        }
    },
    'product-introduction': {
        cropScale: '4:3',
        variants: {
            display: { width: 960, height: 720, maxSizeBytes: 512000, quality: 82 }
        }
    },
    'product-detail': {
        cropScale: '3:4',
        variants: {
            detail: { width: 960, height: 1280, maxSizeBytes: 716800, quality: 82 }
        }
    },
    'runtime-banner': {
        cropScale: '16:9',
        variants: {
            banner: { width: 1280, height: 720, maxSizeBytes: 665600, quality: 82 }
        }
    }
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
async function cropAssetImage(filePath, role) {
    const wxApi = getWxApi();
    if (typeof wxApi.cropImage !== 'function') {
        return filePath;
    }
    return promisifyWx((resolve, reject) => {
        wxApi.cropImage({
            src: filePath,
            cropScale: exports.ASSET_ROLE_RULES[role].cropScale,
            success: resolve,
            fail: reject
        });
    }).then((result) => { var _a; return (_a = result.tempFilePath) !== null && _a !== void 0 ? _a : filePath; });
}
async function compressAssetImage(filePath, rule, processingMode) {
    const wxApi = getWxApi();
    if (processingMode === 'manual' || typeof wxApi.compressImage !== 'function') {
        return filePath;
    }
    return promisifyWx((resolve, reject) => {
        wxApi.compressImage({
            src: filePath,
            quality: rule.quality,
            success: resolve,
            fail: reject
        });
    }).then((result) => { var _a; return (_a = result.tempFilePath) !== null && _a !== void 0 ? _a : filePath; });
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
function getFileInfo(filePath) {
    return promisifyWx((resolve, reject) => {
        getWxApi().getFileInfo({
            filePath,
            success: resolve,
            fail: reject
        });
    });
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
    const processingMode = (_a = options.processingMode) !== null && _a !== void 0 ? _a : 'miniapp';
    const request = (_b = options.request) !== null && _b !== void 0 ? _b : api_client_1.merchantApiRequest;
    const selectedFile = (_c = options.filePath) !== null && _c !== void 0 ? _c : await chooseAssetImage();
    const croppedFile = processingMode === 'miniapp' ? await cropAssetImage(selectedFile, role) : selectedFile;
    const confirmations = [];
    for (const [variantName, rule] of Object.entries(exports.ASSET_ROLE_RULES[role].variants)) {
        if (!rule) {
            continue;
        }
        const variantFile = await compressAssetImage(croppedFile, rule, processingMode);
        const [fileInfo, imageInfo] = await Promise.all([
            getFileInfo(variantFile),
            getImageInfo(variantFile)
        ]);
        if (fileInfo.size > rule.maxSizeBytes) {
            throw new api_client_1.MerchantApiError('ASSET_FILE_TOO_LARGE', 'Image exceeds the upload size limit', 400, {
                maxSizeBytes: rule.maxSizeBytes,
                sizeBytes: fileInfo.size
            });
        }
        const contentType = normalizeImageContentType(variantFile);
        const upload = await requestUploadPolicy({
            role,
            variantName: variantName,
            extension: extensionFromContentType(contentType),
            contentType,
            sizeBytes: fileInfo.size
        }, request);
        await uploadFileToOss(variantFile, upload);
        confirmations.push(await confirmUpload({
            confirmToken: upload.confirmToken,
            role,
            variantName: variantName,
            objectKey: upload.objectKey,
            width: imageInfo.width,
            height: imageInfo.height,
            sizeBytes: fileInfo.size,
            contentType
        }, request));
    }
    const primary = (_d = confirmations.find((item) => item.asset.variants.some((variant) => variant.name === 'display'))) !== null && _d !== void 0 ? _d : confirmations[0];
    const variants = confirmations.flatMap((item) => item.asset.variants);
    const asset = {
        ...primary.asset,
        variants
    };
    return {
        asset,
        storageId: primary.storageId
    };
}
