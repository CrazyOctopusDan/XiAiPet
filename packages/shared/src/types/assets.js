"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OSS_ASSET_VARIANTS = exports.OSS_ASSET_ROLES = void 0;
exports.normalizeImageUrlForDisplay = normalizeImageUrlForDisplay;
exports.OSS_ASSET_ROLES = [
    'product-cover',
    'product-introduction',
    'product-detail',
    'runtime-banner'
];
exports.OSS_ASSET_VARIANTS = ['thumbnail', 'display', 'detail', 'banner'];
function normalizeImageUrlForDisplay(value) {
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
    if (trimmed.startsWith('/') ||
        trimmed.startsWith('cloud://') ||
        trimmed.startsWith('oss://') ||
        /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
        return trimmed;
    }
    return `https://${trimmed.replace(/^\/+/, '')}`;
}
