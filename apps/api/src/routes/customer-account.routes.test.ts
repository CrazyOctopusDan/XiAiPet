import { describe, expect, it, vi } from 'vitest';

import { buildApp } from '../app';
import { authHeader, testConfig } from './test-helpers';

describe('customer account data routes', () => {
  it('routes customer address CRUD through the session openid', async () => {
    const listAddresses = vi.fn(async () => ({ ok: true, addresses: [] }));
    const createAddress = vi.fn(async () => ({ ok: true, address: { id: 'addr-1' } }));
    const updateAddress = vi.fn(async () => ({ ok: true, address: { id: 'addr-1' } }));
    const setDefaultAddress = vi.fn(async () => ({ ok: true, address: { id: 'addr-1' } }));
    const app = buildApp({
      config: testConfig,
      dependencies: {
        customerAccountService: {
          listAddresses,
          createAddress,
          updateAddress,
          setDefaultAddress,
          listPets: async () => ({ ok: true, pets: [] }),
          createPet: async () => ({ ok: true }),
          updatePet: async () => ({ ok: true }),
          getBalance: async () => ({ ok: true })
        }
      }
    });

    await app.inject({ method: 'GET', url: '/api/v1/customer/addresses?type=city', headers: authHeader('openid-a') });
    await app.inject({ method: 'POST', url: '/api/v1/customer/addresses', headers: authHeader('openid-a'), payload: { type: 'city' } });
    await app.inject({ method: 'PUT', url: '/api/v1/customer/addresses/addr-1', headers: authHeader('openid-a'), payload: { tag: '家' } });
    await app.inject({ method: 'PUT', url: '/api/v1/customer/addresses/addr-1/default', headers: authHeader('openid-a') });

    expect(listAddresses).toHaveBeenCalledWith('openid-a', { type: 'city' });
    expect(createAddress).toHaveBeenCalledWith('openid-a', { type: 'city' });
    expect(updateAddress).toHaveBeenCalledWith('openid-a', 'addr-1', { tag: '家' });
    expect(setDefaultAddress).toHaveBeenCalledWith('openid-a', 'addr-1');
  });

  it('routes customer pets and balance through the session openid', async () => {
    const listPets = vi.fn(async () => ({ ok: true, pets: [] }));
    const createPet = vi.fn(async () => ({ ok: true, pet: { id: 'pet-1' } }));
    const updatePet = vi.fn(async () => ({ ok: true, pet: { id: 'pet-1' } }));
    const getBalance = vi.fn(async () => ({ ok: true, overview: {}, records: [] }));
    const app = buildApp({
      config: testConfig,
      dependencies: {
        customerAccountService: {
          listAddresses: async () => ({ ok: true, addresses: [] }),
          createAddress: async () => ({ ok: true }),
          updateAddress: async () => ({ ok: true }),
          setDefaultAddress: async () => ({ ok: true }),
          listPets,
          createPet,
          updatePet,
          getBalance
        }
      }
    });

    await app.inject({ method: 'GET', url: '/api/v1/customer/pets', headers: authHeader('openid-p') });
    await app.inject({ method: 'POST', url: '/api/v1/customer/pets', headers: authHeader('openid-p'), payload: { name: 'Lucky' } });
    await app.inject({ method: 'PUT', url: '/api/v1/customer/pets/pet-1', headers: authHeader('openid-p'), payload: { allergyNotes: '不吃鸡肉' } });
    await app.inject({ method: 'GET', url: '/api/v1/customer/balance', headers: authHeader('openid-p') });

    expect(listPets).toHaveBeenCalledWith('openid-p');
    expect(createPet).toHaveBeenCalledWith('openid-p', { name: 'Lucky' });
    expect(updatePet).toHaveBeenCalledWith('openid-p', 'pet-1', { allergyNotes: '不吃鸡肉' });
    expect(getBalance).toHaveBeenCalledWith('openid-p');
  });
});
