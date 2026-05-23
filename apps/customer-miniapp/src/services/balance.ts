export type BalanceRecordType = 'income' | 'expense';

import { customerApiRequest, type CustomerApiRequestOptions } from './api-client';

export interface BalanceRecord {
  id: string;
  title: string;
  rawTitle: string;
  note?: string;
  date: string;
  type: BalanceRecordType;
  amount: number;
}

export interface MonthlyBalanceGroup {
  month: string;
  monthLabel: string;
  totalIncome: number;
  totalExpense: number;
  items: BalanceRecord[];
}

interface BalanceLedgerFixture {
  id: string;
  title: string;
  normalizedTitle?: string;
  shortNote?: string;
  date: string;
  type: BalanceRecordType;
  amount: number;
}

type BalanceApiRequester = <T>(path: string, options?: CustomerApiRequestOptions) => Promise<T>;

interface BalanceOverview {
  currentBalance: number;
  totalIncome: number;
  totalExpense: number;
}

interface BalanceResponse {
  ok?: boolean;
  overview?: BalanceOverview;
  records?: BalanceRecord[];
  pagination?: BalancePagination;
}

interface BalancePagination {
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
  total: number;
}

const initialRecords: BalanceLedgerFixture[] = [
  {
    id: 'balance-2026-04-1',
    title: '后台人工调整',
    normalizedTitle: '余额纠错',
    shortNote: '余额调整至 ￥180.00',
    date: '2026-04-15',
    type: 'income',
    amount: 300
  },
  {
    id: 'balance-2026-04-2',
    title: '蛋糕订单抵扣',
    date: '2026-04-11',
    type: 'expense',
    amount: 88
  },
  {
    id: 'balance-2026-03-1',
    title: '售后补偿返还',
    date: '2026-03-26',
    type: 'income',
    amount: 138
  },
  {
    id: 'balance-2026-03-2',
    title: '充值礼包',
    date: '2026-03-09',
    type: 'income',
    amount: 300
  },
  {
    id: 'balance-2026-03-3',
    title: '生日蛋糕订单',
    date: '2026-03-14',
    type: 'expense',
    amount: 268
  },
  {
    id: 'balance-2026-03-4',
    title: '冻干零食订单',
    date: '2026-03-03',
    type: 'expense',
    amount: 114
  },
  {
    id: 'balance-2026-02-1',
    title: '会员充值',
    date: '2026-02-20',
    type: 'income',
    amount: 300
  },
  {
    id: 'balance-2026-02-2',
    title: '首单试吃礼包',
    date: '2026-02-22',
    type: 'expense',
    amount: 300
  }
];

let records: BalanceLedgerFixture[] = initialRecords.map((item) => ({ ...item }));
let remoteOverview: BalanceOverview | null = null;
let pagination: BalancePagination = {
  nextCursor: null,
  hasMore: false,
  limit: 20,
  total: initialRecords.length
};

export function resetBalance() {
  records = initialRecords.map((item) => ({ ...item }));
  remoteOverview = null;
  pagination = {
    nextCursor: null,
    hasMore: false,
    limit: 20,
    total: initialRecords.length
  };
}

function compareDescending(left: BalanceRecord, right: BalanceRecord) {
  return right.date.localeCompare(left.date);
}

function getMonthLabel(month: string) {
  const [year, monthValue] = month.split('-');
  return `${year} 年 ${monthValue} 月`;
}

export function getBalanceRecords() {
  return [...records]
    .map((item) => ({
      id: item.id,
      title: item.normalizedTitle ?? item.title,
      rawTitle: item.title,
      note: item.shortNote,
      date: item.date,
      type: item.type,
      amount: item.amount
    }))
    .sort(compareDescending)
    .map((item) => ({ ...item }));
}

function mapApiRecords(apiRecords: BalanceRecord[] = []): BalanceLedgerFixture[] {
  return apiRecords.map((item) => ({
    id: item.id,
    title: item.rawTitle,
    normalizedTitle: item.title,
    shortNote: item.note,
    date: item.date,
    type: item.type,
    amount: item.amount
  }));
}

export async function hydrateBalance(request: BalanceApiRequester = customerApiRequest) {
  const response = await request<BalanceResponse>('/api/v1/customer/balance', {
    method: 'GET',
    query: {
      cursor: '0',
      limit: '20'
    },
    auth: 'customer'
  });
  records = mapApiRecords(response.records);
  remoteOverview = response.overview ?? null;
  pagination = response.pagination ?? {
    nextCursor: null,
    hasMore: false,
    limit: 20,
    total: records.length
  };
  return {
    overview: getBalanceOverview(),
    groups: getMonthlyBalanceGroups(),
    pagination: getBalancePagination()
  };
}

export async function loadMoreBalance(request: BalanceApiRequester = customerApiRequest) {
  if (!pagination.hasMore || !pagination.nextCursor) {
    return {
      overview: getBalanceOverview(),
      groups: getMonthlyBalanceGroups(),
      pagination: getBalancePagination()
    };
  }

  const response = await request<BalanceResponse>('/api/v1/customer/balance', {
    method: 'GET',
    query: {
      cursor: pagination.nextCursor,
      limit: String(pagination.limit || 20)
    },
    auth: 'customer'
  });
  const existingIds = new Set(records.map((item) => item.id));
  records = [
    ...records,
    ...mapApiRecords(response.records).filter((item) => !existingIds.has(item.id))
  ];
  remoteOverview = response.overview ?? remoteOverview;
  pagination = response.pagination ?? {
    nextCursor: null,
    hasMore: false,
    limit: pagination.limit,
    total: records.length
  };
  return {
    overview: getBalanceOverview(),
    groups: getMonthlyBalanceGroups(),
    pagination: getBalancePagination()
  };
}

export function getMonthlyBalanceGroups(): MonthlyBalanceGroup[] {
  const groupMap = new Map<string, BalanceRecord[]>();

  getBalanceRecords().forEach((record) => {
    const month = record.date.slice(0, 7);
    const current = groupMap.get(month) ?? [];
    current.push(record);
    groupMap.set(month, current);
  });

  return [...groupMap.entries()]
    .sort((left, right) => right[0].localeCompare(left[0]))
    .map(([month, items]) => ({
      month,
      monthLabel: getMonthLabel(month),
      totalIncome: items.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0),
      totalExpense: items.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0),
      items: items.map((item) => ({ ...item }))
    }));
}

export function getBalanceOverview() {
  if (remoteOverview) {
    return { ...remoteOverview };
  }

  const allRecords = getBalanceRecords();
  const totalIncome = allRecords
    .filter((item) => item.type === 'income')
    .reduce((sum, item) => sum + item.amount, 0);
  const totalExpense = allRecords
    .filter((item) => item.type === 'expense')
    .reduce((sum, item) => sum + item.amount, 0);

  return {
    currentBalance: totalIncome - totalExpense,
    totalIncome,
    totalExpense
  };
}

export function getBalancePagination() {
  return { ...pagination };
}
