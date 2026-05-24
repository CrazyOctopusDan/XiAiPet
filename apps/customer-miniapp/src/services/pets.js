"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPets = resetPets;
exports.getPets = getPets;
exports.getPetById = getPetById;
exports.hydratePets = hydratePets;
exports.createPet = createPet;
exports.createPetRemote = createPetRemote;
exports.updatePet = updatePet;
exports.updatePetRemote = updatePetRemote;
const api_client_1 = require("./api-client");
const initialPets = [];
let pets = initialPets.map((item) => ({ ...item }));
let nextPetId = 1;
function clonePet(pet) {
    return { ...pet };
}
function replacePet(pet) {
    const index = pets.findIndex((item) => item.id === pet.id);
    pets = index >= 0
        ? pets.map((item) => (item.id === pet.id ? { ...pet } : item))
        : [{ ...pet }, ...pets];
    return clonePet(pet);
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
async function hydratePets(request = api_client_1.customerApiRequest) {
    var _a;
    const response = await request('/api/v1/customer/pets', {
        method: 'GET',
        auth: 'customer'
    });
    pets = ((_a = response.pets) !== null && _a !== void 0 ? _a : []).map((item) => ({ ...item }));
    return getPets();
}
function createPet(input) {
    const created = {
        id: `pet-${nextPetId++}`,
        ...input
    };
    pets = [created, ...pets];
    return clonePet(created);
}
async function createPetRemote(input, request = api_client_1.customerApiRequest) {
    var _a;
    const response = await request('/api/v1/customer/pets', {
        method: 'POST',
        auth: 'customer',
        body: input
    });
    return replacePet((_a = response.pet) !== null && _a !== void 0 ? _a : createPet(input));
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
async function updatePetRemote(petId, updates, request = api_client_1.customerApiRequest) {
    var _a;
    const response = await request(`/api/v1/customer/pets/${petId}`, {
        method: 'PUT',
        auth: 'customer',
        body: updates
    });
    return replacePet((_a = response.pet) !== null && _a !== void 0 ? _a : updatePet(petId, updates));
}
