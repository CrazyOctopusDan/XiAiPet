const MAX_REMARK_HISTORY = 10;

let remarkHistory: string[] = [];

function normalizeRemark(value: string) {
  return value.trim();
}

export function resetRemarkHistory() {
  remarkHistory = [];
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
  return getRemarkHistory();
}

export function deleteRemarkHistoryEntry(value: string) {
  const normalized = normalizeRemark(value);
  remarkHistory = remarkHistory.filter((item) => item !== normalized);
  return getRemarkHistory();
}
