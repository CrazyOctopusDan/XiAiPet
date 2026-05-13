"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMerchantWorkspaceCards = getMerchantWorkspaceCards;
const WORKSPACE_CARDS = [
    {
        id: 'orders',
        title: '订单',
        subtitle: '履约看板',
        description: '处理预约、制作、交付',
        badge: '履约',
        accent: '#F3B56F',
        iconToken: '单',
        actions: [
            {
                label: '查看订单',
                url: '/pages/orders/index',
                tone: 'primary'
            },
            {
                label: '打印机设置',
                url: '/pages/printer-settings/index',
                tone: 'secondary'
            }
        ]
    },
    {
        id: 'staff-accounts',
        title: '员工',
        subtitle: '账号权限',
        description: '创建、停用、重置密码',
        badge: '管理员',
        accent: '#E98F78',
        iconToken: '员',
        actions: [
            {
                label: '管理员工',
                url: '/pages/staff-accounts/index',
                tone: 'primary'
            }
        ]
    },
    {
        id: 'catalog',
        title: '商品',
        subtitle: '品类与商品',
        description: '维护分类、价格、上下架',
        badge: '双入口',
        accent: '#9BCFBC',
        iconToken: '品',
        actions: [
            {
                label: '品类管理',
                url: '/pages/categories/index',
                tone: 'primary'
            },
            {
                label: '商品',
                url: '/pages/products/index',
                tone: 'secondary'
            }
        ]
    },
    {
        id: 'users',
        title: '用户',
        subtitle: '会员余额',
        description: '搜索会员、调整余额',
        badge: '审计',
        accent: '#8EB8D6',
        iconToken: '客',
        actions: [
            {
                label: '搜索用户',
                url: '/pages/users/index',
                tone: 'primary'
            }
        ]
    },
    {
        id: 'runtime-config',
        title: '配置',
        subtitle: '店务规则',
        description: '配送费、等级、Banner',
        badge: '店务',
        accent: '#D8BE8A',
        iconToken: '配',
        actions: [
            {
                label: '编辑配置',
                url: '/pages/runtime-config/index',
                tone: 'primary'
            }
        ]
    }
];
function getMerchantWorkspaceCards(role = 'admin') {
    const allowedIds = role === 'staff'
        ? new Set(['orders', 'catalog'])
        : new Set(['orders', 'catalog', 'users', 'runtime-config', 'staff-accounts']);
    return WORKSPACE_CARDS.filter((card) => allowedIds.has(card.id)).map((card) => {
        var _a, _b;
        return ({
            ...card,
            primaryUrl: (_b = (_a = card.actions[0]) === null || _a === void 0 ? void 0 : _a.url) !== null && _b !== void 0 ? _b : '',
            actions: card.actions.map((action) => ({ ...action }))
        });
    });
}
