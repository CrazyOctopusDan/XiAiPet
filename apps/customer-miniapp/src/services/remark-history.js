"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeRemark = normalizeRemark;
exports.resetRemarkHistory = resetRemarkHistory;
exports.hydrateRemarkHistory = hydrateRemarkHistory;
exports.getRemarkHistory = getRemarkHistory;
exports.rememberRemark = rememberRemark;
exports.deleteRemarkHistoryEntry = deleteRemarkHistoryEntry;
const MAX_REMARK_HISTORY = 20;
const MAX_REMARK_LENGTH = 100;
const REMARK_HISTORY_STORAGE_KEY = 'xiaipet:checkout:remark-history';
let remarkHistory = [];
function normalizeRemark(value) {
    return value.trim().slice(0, MAX_REMARK_LENGTH);
}
function getStorage() {
    if (typeof wx === 'undefined') {
        return null;
    }
    return wx;
}
function normalizeRemarkList(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    const normalized = [];
    value.forEach((item) => {
        if (typeof item !== 'string') {
            return;
        }
        const remark = normalizeRemark(item);
        if (remark && !normalized.includes(remark)) {
            normalized.push(remark);
        }
    });
    return normalized.slice(0, MAX_REMARK_HISTORY);
}
function persistRemarkHistory() {
    var _a, _b;
    (_b = (_a = getStorage()) === null || _a === void 0 ? void 0 : _a.setStorageSync) === null || _b === void 0 ? void 0 : _b.call(_a, REMARK_HISTORY_STORAGE_KEY, [...remarkHistory]);
}
function resetRemarkHistory() {
    remarkHistory = [];
    persistRemarkHistory();
}
function hydrateRemarkHistory() {
    var _a, _b;
    const storedHistory = (_b = (_a = getStorage()) === null || _a === void 0 ? void 0 : _a.getStorageSync) === null || _b === void 0 ? void 0 : _b.call(_a, REMARK_HISTORY_STORAGE_KEY);
    remarkHistory = normalizeRemarkList(storedHistory);
    return getRemarkHistory();
}
function getRemarkHistory() {
    return [...remarkHistory];
}
function rememberRemark(value) {
    const normalized = normalizeRemark(value);
    if (!normalized) {
        return getRemarkHistory();
    }
    remarkHistory = [normalized, ...remarkHistory.filter((item) => item !== normalized)].slice(0, MAX_REMARK_HISTORY);
    persistRemarkHistory();
    return getRemarkHistory();
}
function deleteRemarkHistoryEntry(value) {
    const normalized = normalizeRemark(value);
    remarkHistory = remarkHistory.filter((item) => item !== normalized);
    persistRemarkHistory();
    return getRemarkHistory();
}
