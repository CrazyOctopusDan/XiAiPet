import { beforeEach, describe, expect, it } from 'vitest';

import {
  createPet,
  createPetRemote,
  getPetById,
  getPets,
  hydratePets,
  resetPets,
  updatePet,
  updatePetRemote
} from './pets';

describe('pets service', () => {
  beforeEach(() => {
    resetPets();
  });

  it('starts new users with no local pet fixtures', () => {
    expect(getPets()).toEqual([]);
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
    const existing = createPet({
      name: '布丁',
      gender: 'female',
      birthday: '2023-04-12',
      allergyNotes: ''
    });

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

  it('hydrates pet profiles from the customer pets API', async () => {
    const request = async <T>(path: string, options?: { method?: string; auth?: string }) => {
      expect(path).toBe('/api/v1/customer/pets');
      expect(options).toMatchObject({ method: 'GET', auth: 'customer' });
      return {
        ok: true,
        pets: [
          {
            id: 'pet-api-lucky',
            name: 'Lucky',
            gender: 'female',
            birthday: '2024-05-09',
            allergyNotes: '不吃鸡肉'
          }
        ]
      } as T;
    };

    await hydratePets(request);

    expect(getPets()).toEqual([
      expect.objectContaining({
        id: 'pet-api-lucky',
        name: 'Lucky'
      })
    ]);
  });

  it('persists pet create and update through the customer pets API', async () => {
    const calls: Array<{ path: string; options?: { method?: string; body?: unknown; auth?: string } }> = [];
    const request = async <T>(path: string, options?: { method?: string; body?: unknown; auth?: string }) => {
      calls.push({ path, options });
      return {
        ok: true,
        pet: {
          id: 'pet-api-created',
          name: 'Lucky',
          gender: 'female',
          birthday: '2024-05-09',
          allergyNotes: options?.method === 'PUT' ? '不吃鸡肉' : ''
        }
      } as T;
    };

    await createPetRemote({ name: 'Lucky', gender: 'female', birthday: '2024-05-09', allergyNotes: '' }, request);
    await updatePetRemote('pet-api-created', { allergyNotes: '不吃鸡肉' }, request);

    expect(calls.map((call) => [call.path, call.options?.method])).toEqual([
      ['/api/v1/customer/pets', 'POST'],
      ['/api/v1/customer/pets/pet-api-created', 'PUT']
    ]);
    expect(getPetById('pet-api-created')).toMatchObject({ allergyNotes: '不吃鸡肉' });
  });
});
