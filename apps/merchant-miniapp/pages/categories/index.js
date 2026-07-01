"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const catalog_admin_1 = require("../../src/services/catalog-admin");
function createDraftId() {
    return `category-${Date.now()}`;
}
Page({
    data: {
        loading: true,
        isReordering: false,
        isEmpty: true,
        categories: [],
        cards: [],
        summary: {
            totalCategories: 0,
            linkedProducts: 0,
            lockedCategories: 0
        },
        draftId: createDraftId(),
        draftName: '',
        draftIconToken: '',
        isEditorOpen: false,
        editorTitle: '新建品类',
        editorSubtitle: '保存后同步商品筛选'
    },
    async onShow() {
        await this.refreshCategories();
    },
    async refreshCategories() {
        this.setData({ loading: true });
        try {
            const categories = await (0, catalog_admin_1.queryCategories)();
            const view = (0, catalog_admin_1.getCategoryPageViewModel)(categories);
            this.setData({
                loading: false,
                isEmpty: view.isEmpty,
                categories,
                cards: view.cards,
                summary: view.summary
            });
        }
        catch (_a) {
            this.setData({ loading: false });
            wx.showToast({
                title: '品类加载失败',
                icon: 'none'
            });
        }
    },
    handleNameInput(event) {
        var _a, _b;
        this.setData({ draftName: (_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : '' });
    },
    handleIconInput(event) {
        var _a, _b;
        this.setData({ draftIconToken: (_b = (_a = event.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : '' });
    },
    handleEditTap(event) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        this.setData({
            draftId: (_c = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : createDraftId(),
            draftName: (_f = (_e = (_d = event.currentTarget) === null || _d === void 0 ? void 0 : _d.dataset) === null || _e === void 0 ? void 0 : _e.name) !== null && _f !== void 0 ? _f : '',
            draftIconToken: (_j = (_h = (_g = event.currentTarget) === null || _g === void 0 ? void 0 : _g.dataset) === null || _h === void 0 ? void 0 : _h.icon) !== null && _j !== void 0 ? _j : '',
            isEditorOpen: true,
            editorTitle: '编辑品类',
            editorSubtitle: '更新后商品筛选会同步变化'
        });
    },
    handleCreateTap() {
        this.setData({
            draftId: createDraftId(),
            draftName: '',
            draftIconToken: '',
            isEditorOpen: true,
            editorTitle: '新建品类',
            editorSubtitle: '创建一级品类后即可维护商品'
        });
    },
    closeEditor() {
        this.setData({
            isEditorOpen: false,
            draftId: createDraftId(),
            draftName: '',
            draftIconToken: '',
            editorTitle: '新建品类',
            editorSubtitle: '保存后同步商品筛选'
        });
    },
    handleEditorPanelTap() { },
    async handleSaveTap() {
        var _a;
        if (!this.data.draftName.trim() || !this.data.draftIconToken.trim()) {
            wx.showToast({
                title: '请填写名称和 icon',
                icon: 'none'
            });
            return;
        }
        const now = new Date().toISOString();
        const existing = this.data.categories.find((item) => item.id === this.data.draftId);
        const maxSortOrder = this.data.categories.reduce((max, item) => Math.max(max, item.sortOrder), 0);
        const category = {
            id: this.data.draftId,
            name: this.data.draftName.trim(),
            iconToken: this.data.draftIconToken.trim(),
            sortOrder: (_a = existing === null || existing === void 0 ? void 0 : existing.sortOrder) !== null && _a !== void 0 ? _a : maxSortOrder + 1,
            createdAt: existing ? now : now,
            updatedAt: now
        };
        try {
            await (0, catalog_admin_1.saveCategory)(category);
            wx.showToast({
                title: '品类已保存',
                icon: 'success'
            });
            this.closeEditor();
            await this.refreshCategories();
        }
        catch (_b) {
            wx.showToast({
                title: '保存失败',
                icon: 'none'
            });
        }
    },
    handleDeleteTap(event) {
        var _a, _b, _c, _d, _e, _f, _g;
        const categoryId = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id;
        const action = (_d = (_c = event.currentTarget) === null || _c === void 0 ? void 0 : _c.dataset) === null || _d === void 0 ? void 0 : _d.action;
        const name = (_g = (_f = (_e = event.currentTarget) === null || _e === void 0 ? void 0 : _e.dataset) === null || _f === void 0 ? void 0 : _f.name) !== null && _g !== void 0 ? _g : '当前品类';
        if (!categoryId) {
            return;
        }
        if (action === '先迁移商品') {
            wx.showModal({
                title: '先迁移商品',
                content: `删除品类前，请先迁移 ${name} 下全部商品。`,
                showCancel: false
            });
            return;
        }
        wx.showModal({
            title: '删除品类',
            content: `删除品类：请先确认 ${name} 已经没有关联商品。`,
            success: async (result) => {
                if (!result.confirm) {
                    return;
                }
                try {
                    await (0, catalog_admin_1.deleteCategory)(categoryId);
                    wx.showToast({
                        title: '删除成功',
                        icon: 'success'
                    });
                    await this.refreshCategories();
                }
                catch (error) {
                    wx.showToast({
                        title: '请先迁移商品',
                        icon: 'none'
                    });
                }
            }
        });
    },
    async handleMoveCategoryTap(event) {
        var _a, _b, _c, _d;
        if (this.data.isReordering) {
            return;
        }
        const categoryId = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id;
        const direction = (_d = (_c = event.currentTarget) === null || _c === void 0 ? void 0 : _c.dataset) === null || _d === void 0 ? void 0 : _d.direction;
        const currentIndex = this.data.categories.findIndex((category) => category.id === categoryId);
        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (!categoryId || currentIndex < 0 || targetIndex < 0 || targetIndex >= this.data.categories.length) {
            return;
        }
        const nextCategories = [...this.data.categories];
        const [movedCategory] = nextCategories.splice(currentIndex, 1);
        nextCategories.splice(targetIndex, 0, movedCategory);
        this.setData({ isReordering: true });
        try {
            const categories = await (0, catalog_admin_1.reorderCategories)(nextCategories);
            const view = (0, catalog_admin_1.getCategoryPageViewModel)(categories);
            this.setData({
                isReordering: false,
                categories,
                isEmpty: view.isEmpty,
                cards: view.cards,
                summary: view.summary
            });
            wx.showToast({
                title: '排序已保存',
                icon: 'success'
            });
        }
        catch (_e) {
            this.setData({ isReordering: false });
            wx.showToast({
                title: '排序保存失败',
                icon: 'none'
            });
            await this.refreshCategories();
        }
    },
    handleOpenProducts(event) {
        var _a, _b, _c;
        const categoryId = (_c = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : '';
        wx.navigateTo({
            url: `/pages/products/index?categoryId=${categoryId}`
        });
    }
});
