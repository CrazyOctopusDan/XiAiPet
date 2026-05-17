export type PetGender = 'female' | 'male' | 'unknown';

import { customerApiRequest, type CustomerApiRequestOptions } from './api-client';

export interface PetProfile {
  id: string;
  name: string;
  gender: PetGender;
  birthday: string;
  allergyNotes: string;
}

interface CreatePetInput {
  name: string;
  gender: PetGender;
  birthday: string;
  allergyNotes: string;
}

interface UpdatePetInput {
  name?: string;
  gender?: PetGender;
  birthday?: string;
  allergyNotes?: string;
}

type PetApiRequester = <T>(path: string, options?: CustomerApiRequestOptions) => Promise<T>;

interface PetListResponse {
  ok?: boolean;
  pets?: PetProfile[];
}

interface PetMutationResponse {
  ok?: boolean;
  pet?: PetProfile;
}

const initialPets: PetProfile[] = [
  {
    id: 'pet-pudding',
    name: '布丁',
    gender: 'female',
    birthday: '2023-04-12',
    allergyNotes: '乳制品要减量'
  },
  {
    id: 'pet-sesame',
    name: '芝麻',
    gender: 'male',
    birthday: '2022-11-08',
    allergyNotes: '对鸡肉冻干敏感'
  }
];

let pets = initialPets.map((item) => ({ ...item }));
let nextPetId = 1;

function clonePet(pet: PetProfile) {
  return { ...pet };
}

function replacePet(pet: PetProfile) {
  const index = pets.findIndex((item) => item.id === pet.id);
  pets = index >= 0
    ? pets.map((item) => (item.id === pet.id ? { ...pet } : item))
    : [{ ...pet }, ...pets];
  return clonePet(pet);
}

export function resetPets() {
  pets = initialPets.map((item) => ({ ...item }));
  nextPetId = 1;
}

export function getPets() {
  return pets.map(clonePet);
}

export function getPetById(petId: string) {
  const pet = pets.find((item) => item.id === petId);
  return pet ? clonePet(pet) : null;
}

export async function hydratePets(request: PetApiRequester = customerApiRequest) {
  const response = await request<PetListResponse>('/api/v1/customer/pets', {
    method: 'GET',
    auth: 'customer'
  });
  pets = (response.pets ?? []).map((item) => ({ ...item }));
  return getPets();
}

export function createPet(input: CreatePetInput) {
  const created: PetProfile = {
    id: `pet-${nextPetId++}`,
    ...input
  };

  pets = [created, ...pets];
  return clonePet(created);
}

export async function createPetRemote(input: CreatePetInput, request: PetApiRequester = customerApiRequest) {
  const response = await request<PetMutationResponse>('/api/v1/customer/pets', {
    method: 'POST',
    auth: 'customer',
    body: input
  });
  return replacePet(response.pet ?? createPet(input));
}

export function updatePet(petId: string, updates: UpdatePetInput) {
  const pet = pets.find((item) => item.id === petId);

  if (!pet) {
    throw new Error(`pet_not_found:${petId}`);
  }

  const updated: PetProfile = {
    ...pet,
    ...updates,
    id: pet.id
  };

  pets = pets.map((item) => (item.id === petId ? updated : item));
  return clonePet(updated);
}

export async function updatePetRemote(
  petId: string,
  updates: UpdatePetInput,
  request: PetApiRequester = customerApiRequest
) {
  const response = await request<PetMutationResponse>(`/api/v1/customer/pets/${petId}`, {
    method: 'PUT',
    auth: 'customer',
    body: updates
  });
  return replacePet(response.pet ?? updatePet(petId, updates));
}
