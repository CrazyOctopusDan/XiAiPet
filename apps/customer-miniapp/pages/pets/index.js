"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pets_1 = require("../../src/services/pets");
Page({
    data: {
        pets: []
    },
    onShow() {
        void this.refreshPets();
    },
    async refreshPets() {
        this.setData({
            pets: (0, pets_1.getPets)()
        });
        try {
            await (0, pets_1.hydratePets)();
        }
        catch (_a) {
            // Keep the latest local snapshot visible if the network is unavailable.
        }
        this.setData({
            pets: (0, pets_1.getPets)()
        });
    },
    handleAddPet() {
        wx.navigateTo({
            url: '/pages/pet-form/index'
        });
    },
    handleEditPet(event) {
        var _a, _b;
        const petId = (_b = (_a = event.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.petId;
        if (!petId) {
            return;
        }
        wx.navigateTo({
            url: `/pages/pet-form/index?id=${petId}`
        });
    }
});
