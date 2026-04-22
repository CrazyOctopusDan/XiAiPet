export type PetGender = 'female' | 'male' | 'unknown';

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

export function createPet(input: CreatePetInput) {
  const created: PetProfile = {
    id: `pet-${nextPetId++}`,
    ...input
  };

  pets = [created, ...pets];
  return clonePet(created);
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
