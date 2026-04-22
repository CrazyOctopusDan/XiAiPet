import { beforeEach, describe, expect, it } from 'vitest';

import {
  createPet,
  getPetById,
  getPets,
  resetPets,
  updatePet
} from './pets';

describe('pets service', () => {
  beforeEach(() => {
    resetPets();
  });

  it('supports multiple pet profiles with stable fixture ids', () => {
    const pets = getPets();

    expect(pets.length).toBeGreaterThan(1);
    expect(pets.map((item) => item.id)).toEqual(
      expect.arrayContaining(['pet-pudding', 'pet-sesame'])
    );
  });

  it('creates a new pet profile with a generated id', () => {
    const created = createPet({
      name: '芝麻糊',
      gender: 'female',
      birthday: '2024-08-16',
      allergyNotes: '对牛肉和花生敏感'
    });

    expect(created.id).toMatch(/^pet-\d+$/);
    expect(getPetById(created.id)).toMatchObject({
      id: created.id,
      name: '芝麻糊',
      allergyNotes: '对牛肉和花生敏感'
    });
  });

  it('updates an existing pet profile without changing its id', () => {
    const existing = getPets()[0];

    if (!existing) {
      throw new Error('missing pet fixture');
    }

    const updated = updatePet(existing.id, {
      allergyNotes: '不吃鸡胸肉',
      birthday: '2023-05-02'
    });

    expect(updated).toMatchObject({
      id: existing.id,
      birthday: '2023-05-02',
      allergyNotes: '不吃鸡胸肉'
    });
    expect(getPetById(existing.id)).toMatchObject({
      id: existing.id,
      birthday: '2023-05-02'
    });
  });
});
