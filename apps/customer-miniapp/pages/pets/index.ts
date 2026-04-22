declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import { getPets, type PetProfile } from '../../src/services/pets';

interface PetsPageData {
  pets: PetProfile[];
}

interface PetsPageInstance {
  data: PetsPageData;
  setData(data: Record<string, unknown>): void;
  refreshPets(): void;
}

Page({
  data: {
    pets: []
  },
  onShow(this: PetsPageInstance) {
    this.refreshPets();
  },
  refreshPets(this: PetsPageInstance) {
    this.setData({
      pets: getPets()
    });
  },
  handleAddPet() {
    wx.navigateTo({
      url: '/pages/pet-form/index'
    });
  },
  handleEditPet(event: { currentTarget?: { dataset?: { petId?: string } } }) {
    const petId = event.currentTarget?.dataset?.petId;

    if (!petId) {
      return;
    }

    wx.navigateTo({
      url: `/pages/pet-form/index?id=${petId}`
    });
  }
});
