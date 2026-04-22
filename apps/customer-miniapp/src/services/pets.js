"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPets = resetPets;
exports.getPets = getPets;
exports.getPetById = getPetById;
exports.createPet = createPet;
exports.updatePet = updatePet;
const initialPets = [
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
function clonePet(pet) {
    return { ...pet };
}
function resetPets() {
    pets = initialPets.map((item) => ({ ...item }));
    nextPetId = 1;
}
function getPets() {
    return pets.map(clonePet);
}
function getPetById(petId) {
    const pet = pets.find((item) => item.id === petId);
    return pet ? clonePet(pet) : null;
}
function createPet(input) {
    const created = {
        id: `pet-${nextPetId++}`,
        ...input
    };
    pets = [created, ...pets];
    return clonePet(created);
}
function updatePet(petId, updates) {
    const pet = pets.find((item) => item.id === petId);
    if (!pet) {
        throw new Error(`pet_not_found:${petId}`);
    }
    const updated = {
        ...pet,
        ...updates,
        id: pet.id
    };
    pets = pets.map((item) => (item.id === petId ? updated : item));
    return clonePet(updated);
}
