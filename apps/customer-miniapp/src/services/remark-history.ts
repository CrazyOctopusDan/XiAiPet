declare const wx: any;

const MAX_REMARK_HISTORY = 20;
const MAX_REMARK_LENGTH = 100;
const REMARK_HISTORY_STORAGE_KEY = 'xiaipet:checkout:remark-history';

let remarkHistory: string[] = [];

export function normalizeRemark(value: string) {
  return value.trim().slice(0, MAX_REMARK_LENGTH);
}

function getStorage() {
  if (typeof wx === 'undefined') {
    return null;
  }

  return wx;
}

function normalizeRemarkList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: string[] = [];
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
  getStorage()?.setStorageSync?.(REMARK_HISTORY_STORAGE_KEY, [...remarkHistory]);
}

export function resetRemarkHistory() {
  remarkHistory = [];
  persistRemarkHistory();
}

export function hydrateRemarkHistory() {
  const storedHistory = getStorage()?.getStorageSync?.(REMARK_HISTORY_STORAGE_KEY);
  remarkHistory = normalizeRemarkList(storedHistory);
  return getRemarkHistory();
}

export function getRemarkHistory() {
  return [...remarkHistory];
}

export function rememberRemark(value: string) {
  const normalized = normalizeRemark(value);

  if (!normalized) {
    return getRemarkHistory();
  }

  remarkHistory = [normalized, ...remarkHistory.filter((item) => item !== normalized)].slice(0, MAX_REMARK_HISTORY);
  persistRemarkHistory();
  return getRemarkHistory();
}

export function deleteRemarkHistoryEntry(value: string) {
  const normalized = normalizeRemark(value);
  remarkHistory = remarkHistory.filter((item) => item !== normalized);
  persistRemarkHistory();
  return getRemarkHistory();
}
