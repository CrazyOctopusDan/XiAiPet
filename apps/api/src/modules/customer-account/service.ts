import type { Prisma } from '@prisma/client';

import { getPrismaClient } from '../../db/prisma';
import type { DbClient } from '../../db/types';
import { ApiError } from '../../lib/errors';
import { createUserRepository } from '../users/repository';

type AddressType = 'city' | 'express';
type PetGender = 'female' | 'male' | 'unknown';

interface AddressInput {
  type?: AddressType;
  recipientName?: string;
  phoneNumber?: string;
  regionLabel?: string;
  detailAddress?: string;
  tag?: string;
}

interface PetInput {
  name?: string;
  gender?: PetGender;
  birthday?: string;
  allergyNotes?: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getSnapshotObject(value: unknown) {
  return isObject(value) ? value : {};
}

function parseAddressType(value: unknown): AddressType {
  return value === 'express' ? 'express' : 'city';
}

function validateAddressInput(value: unknown, partial = false): AddressInput {
  if (!isObject(value)) {
    throw new ApiError('INVALID_ADDRESS', 'Invalid address payload', 400);
  }
  const candidate = value as AddressInput;
  const required = ['recipientName', 'phoneNumber', 'regionLabel', 'detailAddress'] as const;
  const requiredMissing = !partial && required.some((key) => typeof candidate[key] !== 'string' || !candidate[key]?.trim());
  if (
    requiredMissing ||
    (candidate.type !== undefined && candidate.type !== 'city' && candidate.type !== 'express') ||
    (candidate.recipientName !== undefined && typeof candidate.recipientName !== 'string') ||
    (candidate.phoneNumber !== undefined && typeof candidate.phoneNumber !== 'string') ||
    (candidate.regionLabel !== undefined && typeof candidate.regionLabel !== 'string') ||
    (candidate.detailAddress !== undefined && typeof candidate.detailAddress !== 'string') ||
    (candidate.tag !== undefined && typeof candidate.tag !== 'string')
  ) {
    throw new ApiError('INVALID_ADDRESS', 'Invalid address payload', 400);
  }
  return candidate;
}

function validatePetInput(value: unknown, partial = false): PetInput {
  if (!isObject(value)) {
    throw new ApiError('INVALID_PET', 'Invalid pet payload', 400);
  }
  const candidate = value as PetInput;
  if (
    (!partial && (typeof candidate.name !== 'string' || !candidate.name.trim())) ||
    (candidate.name !== undefined && typeof candidate.name !== 'string') ||
    (candidate.gender !== undefined && candidate.gender !== 'female' && candidate.gender !== 'male' && candidate.gender !== 'unknown') ||
    (candidate.birthday !== undefined && typeof candidate.birthday !== 'string') ||
    (candidate.allergyNotes !== undefined && typeof candidate.allergyNotes !== 'string')
  ) {
    throw new ApiError('INVALID_PET', 'Invalid pet payload', 400);
  }
  return candidate;
}

function toDate(value?: string) {
  if (!value) {
    return null;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateLabel(value: Date | string | null | undefined) {
  if (!value) {
    return '';
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function mapAddress(row: {
  id: string;
  recipientName: string;
  phoneMasked: string;
  regionLabel: string;
  detailAddress: string;
  tag: string;
  isDefault: boolean;
  snapshot: unknown;
}) {
  const snapshot = getSnapshotObject(row.snapshot);
  return {
    id: row.id,
    type: parseAddressType(snapshot.type),
    recipientName: row.recipientName,
    phoneNumber: typeof snapshot.phoneNumber === 'string' ? snapshot.phoneNumber : row.phoneMasked,
    regionLabel: row.regionLabel,
    detailAddress: row.detailAddress,
    tag: row.tag,
    isDefault: row.isDefault
  };
}

function mapPet(row: {
  id: string;
  name: string;
  birthday: Date | null;
  profile: unknown;
}) {
  const profile = getSnapshotObject(row.profile);
  return {
    id: row.id,
    name: row.name,
    gender: profile.gender === 'female' || profile.gender === 'male' ? profile.gender : 'unknown',
    birthday: toDateLabel(row.birthday),
    allergyNotes: typeof profile.allergyNotes === 'string' ? profile.allergyNotes : ''
  };
}

function ledgerTitle(type: string) {
  if (type === 'RECHARGE') return '会员充值';
  if (type === 'ORDER_PAYMENT') return '订单抵扣';
  if (type === 'REFUND') return '售后补偿返还';
  return '后台人工调整';
}

function mapLedger(row: {
  id: string;
  type: string;
  amountDelta: { toNumber(): number };
  reason: string | null;
  createdAt: Date;
}) {
  const amount = row.amountDelta.toNumber();
  const [reasonType, note] = (row.reason ?? '').split(/:\s*/, 2);
  const rawTitle = ledgerTitle(row.type);
  return {
    id: row.id,
    title: reasonType || rawTitle,
    rawTitle,
    note: note || undefined,
    date: toDateLabel(row.createdAt),
    type: amount >= 0 ? 'income' as const : 'expense' as const,
    amount: Math.abs(amount)
  };
}

function normalizePagination(input: { cursor?: string | number; limit?: string | number } = {}) {
  const parsedLimit = Number(input.limit ?? 20);
  const parsedCursor = Number(input.cursor ?? 0);
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(Math.trunc(parsedLimit), 1), 50) : 20;
  const cursor = Number.isFinite(parsedCursor) ? Math.max(Math.trunc(parsedCursor), 0) : 0;
  return { cursor, limit };
}

function decimalToNumber(value: { toNumber(): number } | null | undefined) {
  return value?.toNumber() ?? 0;
}

export function createCustomerAccountService(
  client: DbClient = getPrismaClient(),
  userRepository = createUserRepository(client)
) {
  return {
    async listAddresses(openid: string, filters: { type?: AddressType } = {}) {
      await userRepository.bootstrap(openid);
      const rows = await client.address.findMany({
        where: { openid },
        orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }]
      });
      const addresses = rows.map(mapAddress).filter((address) => !filters.type || address.type === filters.type);
      return { ok: true as const, addresses };
    },

    async createAddress(openid: string, payload: unknown) {
      const input = validateAddressInput(payload);
      await userRepository.bootstrap(openid);
      const type = input.type ?? 'city';
      const address = await client.address.create({
        data: {
          openid,
          recipientName: input.recipientName!.trim(),
          phoneMasked: input.phoneNumber!.trim(),
          regionLabel: input.regionLabel!.trim(),
          detailAddress: input.detailAddress!.trim(),
          tag: input.tag?.trim() || '常用',
          snapshot: {
            type,
            phoneNumber: input.phoneNumber!.trim()
          } as Prisma.InputJsonValue
        }
      });
      return { ok: true as const, address: mapAddress(address) };
    },

    async updateAddress(openid: string, addressId: string, payload: unknown) {
      const input = validateAddressInput(payload, true);
      const existing = await client.address.findFirst({ where: { id: addressId, openid } });
      if (!existing) {
        throw new ApiError('ADDRESS_NOT_FOUND', 'Address not found', 404);
      }
      const snapshot = {
        ...getSnapshotObject(existing.snapshot),
        ...(input.type ? { type: input.type } : {}),
        ...(input.phoneNumber ? { phoneNumber: input.phoneNumber.trim() } : {})
      };
      const address = await client.address.update({
        where: { id: addressId },
        data: {
          recipientName: input.recipientName?.trim(),
          phoneMasked: input.phoneNumber?.trim(),
          regionLabel: input.regionLabel?.trim(),
          detailAddress: input.detailAddress?.trim(),
          tag: input.tag?.trim(),
          snapshot: snapshot as Prisma.InputJsonValue
        }
      });
      return { ok: true as const, address: mapAddress(address) };
    },

    async setDefaultAddress(openid: string, addressId: string) {
      const existing = await client.address.findFirst({ where: { id: addressId, openid } });
      if (!existing) {
        throw new ApiError('ADDRESS_NOT_FOUND', 'Address not found', 404);
      }
      const targetType = parseAddressType(getSnapshotObject(existing.snapshot).type);
      const addresses = await client.address.findMany({ where: { openid } });
      await Promise.all(
        addresses
          .filter((address) => parseAddressType(getSnapshotObject(address.snapshot).type) === targetType)
          .map((address) => client.address.update({ where: { id: address.id }, data: { isDefault: address.id === addressId } }))
      );
      const address = await client.address.findUniqueOrThrow({ where: { id: addressId } });
      return { ok: true as const, address: mapAddress(address) };
    },

    async listPets(openid: string) {
      await userRepository.bootstrap(openid);
      const rows = await client.pet.findMany({
        where: { openid },
        orderBy: { updatedAt: 'desc' }
      });
      return { ok: true as const, pets: rows.map(mapPet) };
    },

    async createPet(openid: string, payload: unknown) {
      const input = validatePetInput(payload);
      await userRepository.bootstrap(openid);
      const pet = await client.pet.create({
        data: {
          openid,
          name: input.name!.trim(),
          birthday: toDate(input.birthday),
          profile: {
            gender: input.gender ?? 'unknown',
            allergyNotes: input.allergyNotes ?? ''
          } as Prisma.InputJsonValue
        }
      });
      return { ok: true as const, pet: mapPet(pet) };
    },

    async updatePet(openid: string, petId: string, payload: unknown) {
      const input = validatePetInput(payload, true);
      const existing = await client.pet.findFirst({ where: { id: petId, openid } });
      if (!existing) {
        throw new ApiError('PET_NOT_FOUND', 'Pet not found', 404);
      }
      const profile = {
        ...getSnapshotObject(existing.profile),
        ...(input.gender ? { gender: input.gender } : {}),
        ...(input.allergyNotes !== undefined ? { allergyNotes: input.allergyNotes } : {})
      };
      const pet = await client.pet.update({
        where: { id: petId },
        data: {
          name: input.name?.trim(),
          birthday: input.birthday !== undefined ? toDate(input.birthday) : undefined,
          profile: profile as Prisma.InputJsonValue
        }
      });
      return { ok: true as const, pet: mapPet(pet) };
    },

    async getBalance(openid: string, paginationInput: { cursor?: string | number; limit?: string | number } = {}) {
      await userRepository.bootstrap(openid);
      const pagination = normalizePagination(paginationInput);
      const [account, incomeTotals, expenseTotals, total, ledgers] = await Promise.all([
        client.balanceAccount.findUnique({ where: { openid } }),
        client.balanceLedger.aggregate({
          where: {
            openid,
            amountDelta: { gt: 0 }
          },
          _sum: { amountDelta: true }
        }),
        client.balanceLedger.aggregate({
          where: {
            openid,
            amountDelta: { lt: 0 }
          },
          _sum: { amountDelta: true }
        }),
        client.balanceLedger.count({ where: { openid } }),
        client.balanceLedger.findMany({
          where: { openid },
          orderBy: { createdAt: 'desc' },
          skip: pagination.cursor,
          take: pagination.limit
        })
      ]);
      const records = ledgers.map(mapLedger);
      const totalIncome = decimalToNumber(incomeTotals._sum.amountDelta);
      const totalExpense = Math.abs(decimalToNumber(expenseTotals._sum.amountDelta));
      const nextOffset = pagination.cursor + records.length;
      const hasMore = nextOffset < total;
      return {
        ok: true as const,
        overview: {
          currentBalance: account?.balance.toNumber() ?? 0,
          totalIncome,
          totalExpense
        },
        records,
        pagination: {
          nextCursor: hasMore ? String(nextOffset) : null,
          hasMore,
          limit: pagination.limit,
          total
        }
      };
    }
  };
}
