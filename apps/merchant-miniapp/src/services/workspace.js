"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMerchantWorkspaceCards = getMerchantWorkspaceCards;
const WORKSPACE_CARDS = [
    {
        id: 'orders',
        title: '订单管理',
        subtitle: '按履约进度推进订单',
        description: '查看待处理、制作中、待履约和历史订单，进入详情后继续人工推进状态。',
        badge: '履约看板',
        accent: 'linear-gradient(135deg, #F6B067 0%, #F18D52 100%)',
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
        title: '员工账号',
        subtitle: '创建、停用和重置员工密码',
        description: '管理员给员工开账号，员工首次登录使用 staff 初始密码后必须修改。',
        badge: '仅管理员',
        accent: 'linear-gradient(135deg, #C4B5FD 0%, #7C3AED 100%)',
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
        title: '品类/商品管理',
        subtitle: '保持分开维护，不合并成 tab',
        description: '先管一级品类，再进入商品列表与三步编辑器，保持 D-11 的分离入口。',
        badge: '双入口',
        accent: 'linear-gradient(135deg, #9FD7C6 0%, #5EA892 100%)',
        iconToken: '品',
        actions: [
            {
                label: '品类管理',
                url: '/pages/categories/index',
                tone: 'primary'
            },
            {
                label: '商品管理',
                url: '/pages/products/index',
                tone: 'secondary'
            }
        ]
    },
    {
        id: 'users',
        title: '用户管理',
        subtitle: '搜索用户并调整余额',
        description: '按手机号或昵称检索会员，进入详情后执行带审计字段的余额操作。',
        badge: '审计必填',
        accent: 'linear-gradient(135deg, #7DB3D7 0%, #456E9A 100%)',
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
        title: '运营配置',
        subtitle: '一个入口，按分区保存',
        description: '统一维护店铺信息、配送费规则、会员等级、Banner 和定制提示。',
        badge: '配置驱动',
        accent: 'linear-gradient(135deg, #D9C7A1 0%, #B69258 100%)',
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
    return WORKSPACE_CARDS.filter((card) => allowedIds.has(card.id)).map((card) => ({
        ...card,
        actions: card.actions.map((action) => ({ ...action }))
    }));
}
