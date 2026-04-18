"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBalanceRecords = getBalanceRecords;
exports.getMonthlyBalanceGroups = getMonthlyBalanceGroups;
exports.getBalanceOverview = getBalanceOverview;
const records = [
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
function compareDescending(left, right) {
    return right.date.localeCompare(left.date);
}
function getMonthLabel(month) {
    const [year, monthValue] = month.split('-');
    return `${year} 年 ${monthValue} 月`;
}
function getBalanceRecords() {
    return [...records]
        .map((item) => {
        var _a;
        return ({
            id: item.id,
            title: (_a = item.normalizedTitle) !== null && _a !== void 0 ? _a : item.title,
            rawTitle: item.title,
            note: item.shortNote,
            date: item.date,
            type: item.type,
            amount: item.amount
        });
    })
        .sort(compareDescending)
        .map((item) => ({ ...item }));
}
function getMonthlyBalanceGroups() {
    const groupMap = new Map();
    getBalanceRecords().forEach((record) => {
        var _a;
        const month = record.date.slice(0, 7);
        const current = (_a = groupMap.get(month)) !== null && _a !== void 0 ? _a : [];
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
function getBalanceOverview() {
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
