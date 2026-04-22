"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetRemarkHistory = resetRemarkHistory;
exports.getRemarkHistory = getRemarkHistory;
exports.rememberRemark = rememberRemark;
exports.deleteRemarkHistoryEntry = deleteRemarkHistoryEntry;
const MAX_REMARK_HISTORY = 10;
let remarkHistory = [];
function normalizeRemark(value) {
    return value.trim();
}
function resetRemarkHistory() {
    remarkHistory = [];
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
    return getRemarkHistory();
}
function deleteRemarkHistoryEntry(value) {
    const normalized = normalizeRemark(value);
    remarkHistory = remarkHistory.filter((item) => item !== normalized);
    return getRemarkHistory();
}
