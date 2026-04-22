declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import {
  createPet,
  getPetById,
  updatePet,
  type PetGender
} from '../../src/services/pets';

interface PetFormValue {
  id: string;
  name: string;
  gender: PetGender;
  birthday: string;
  allergyNotes: string;
}

interface PetFormPageData {
  mode: 'create' | 'edit';
  form: PetFormValue;
  genderOptions: Array<{ value: PetGender; label: string }>;
}

interface PetFormPageInstance {
  data: PetFormPageData;
  setData(data: Record<string, unknown>): void;
}

function createEmptyForm(): PetFormValue {
  return {
    id: '',
    name: '',
    gender: 'unknown',
    birthday: '',
    allergyNotes: ''
  };
}

Page({
  data: {
    mode: 'create',
    form: createEmptyForm(),
    genderOptions: [
      { value: 'unknown', label: '未设置' },
      { value: 'female', label: '女孩' },
      { value: 'male', label: '男孩' }
    ]
  },
  onLoad(this: PetFormPageInstance, options?: { id?: string }) {
    const pet = options?.id ? getPetById(options.id) : null;

    this.setData({
      mode: pet ? 'edit' : 'create',
      form: pet ? { ...pet } : createEmptyForm()
    });
  },
  handleNameInput(this: PetFormPageInstance, event: { detail?: { value?: string } }) {
    this.setData({
      form: {
        ...this.data.form,
        name: event.detail?.value ?? ''
      }
    });
  },
  handleGenderTap(this: PetFormPageInstance, event: { currentTarget?: { dataset?: { gender?: PetGender } } }) {
    const gender = event.currentTarget?.dataset?.gender;

    if (!gender) {
      return;
    }

    this.setData({
      form: {
        ...this.data.form,
        gender
      }
    });
  },
  handleBirthdayChange(this: PetFormPageInstance, event: { detail?: { value?: string } }) {
    this.setData({
      form: {
        ...this.data.form,
        birthday: event.detail?.value ?? ''
      }
    });
  },
  handleAllergyInput(this: PetFormPageInstance, event: { detail?: { value?: string } }) {
    this.setData({
      form: {
        ...this.data.form,
        allergyNotes: event.detail?.value ?? ''
      }
    });
  },
  handleSubmit(this: PetFormPageInstance) {
    const name = this.data.form.name.trim();
    const birthday = this.data.form.birthday.trim();
    const allergyNotes = this.data.form.allergyNotes.trim();

    if (!name) {
      wx.showToast({ title: '请填写宠物名字', icon: 'none' });
      return;
    }

    if (this.data.mode === 'edit' && this.data.form.id) {
      updatePet(this.data.form.id, {
        name,
        gender: this.data.form.gender,
        birthday,
        allergyNotes
      });
    } else {
      createPet({
        name,
        gender: this.data.form.gender,
        birthday,
        allergyNotes
      });
    }

    wx.showToast({ title: this.data.mode === 'edit' ? '宠物档案已更新' : '宠物档案已新增', icon: 'none' });
    wx.navigateBack();
  }
});
