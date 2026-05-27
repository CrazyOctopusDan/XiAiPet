import { LEDGER_TYPE, ORDER_STATUS, PHONE_BINDING_STATE, USER_STATUS, toSharedEnum } from '../../db/enums';
import { getPrismaClient } from '../../db/prisma';
import type { DbClient } from '../../db/types';

export interface UserRecord {
  openid: string;
  status: 'active' | 'disabled';
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
  phoneBindingState: 'unbound' | 'bound';
  contactPhoneMasked: string;
  contactPhoneCountryCode: string;
  profile?: CustomerProfileRecord;
}

export interface CustomerProfileRecord {
  nickname?: string;
  avatarText?: string;
  avatarUrl?: string;
  gender?: 'unknown' | 'female' | 'male';
  birthday?: string;
  birthdayLocked?: boolean;
  contactPhone?: string;
  contactPhoneMasked?: string;
}

export interface MerchantUserSearchItem {
  openid: string;
  avatarUrl: string;
  nickname: string;
  contactPhoneMasked: string;
  contactPhone?: string;
  membershipTierLabel: string;
  currentBalance: number;
}

export interface MerchantLatestAdjustment {
  normalizedTitle: string;
  shortNote: string;
  operatedAt: string;
  operatorName: string;
}

export interface MerchantBalanceLedgerEntry extends MerchantLatestAdjustment {
  id: string;
  amountDelta: number;
  balanceBefore: number;
  balanceAfter: number;
}

export interface MerchantUserAddressItem {
  id: string;
  type: 'city' | 'express';
  recipientName: string;
  phoneNumber: string;
  regionLabel: string;
  detailAddress: string;
  tag: string;
  isDefault: boolean;
}

export interface MerchantUserDetailItem extends MerchantUserSearchItem {
  latestAdjustment: MerchantLatestAdjustment | null;
  addressCount?: number;
  balanceLedgerCount?: number;
  balanceLedgers: MerchantBalanceLedgerEntry[];
  addresses: MerchantUserAddressItem[];
}

export interface PaginationInput {
  cursor?: string | number;
  limit?: string | number;
}

export interface MerchantBalanceLedgerPage {
  records: MerchantBalanceLedgerEntry[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
    total: number;
  };
}

interface UserRow {
  openid: string;
  status: string;
  phoneBindingState: string;
  contactPhoneEncrypted?: string | null;
  contactPhoneMasked: string;
  contactPhoneCountryCode: string;
  lastLoginAt: Date | null;
  profile: unknown | null;
  createdAt: Date;
  updatedAt: Date;
}

interface MerchantUserSearchRow extends UserRow {
  balanceAccount?: {
    balance: {
      toNumber(): number;
    };
  } | null;
}

interface CustomerProfileRow extends UserRow {
  balanceAccount?: {
    balance: {
      toNumber(): number;
    };
  } | null;
}

interface BalanceLedgerRow {
  id: string;
  amountDelta: {
    toNumber(): number;
  };
  balanceBefore: {
    toNumber(): number;
  };
  balanceAfter: {
    toNumber(): number;
  };
  reason: string | null;
  operatorName: string | null;
  createdAt: Date;
}

interface AddressRow {
  id: string;
  recipientName: string;
  phoneMasked: string;
  regionLabel: string;
  detailAddress: string;
  tag: string;
  isDefault: boolean;
  snapshot: unknown | null;
}

interface MembershipTierRow {
  threshold: number;
  name: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeProfile(value: unknown): CustomerProfileRecord | undefined {
  if (!isObject(value)) {
    return undefined;
  }

  return {
    nickname: typeof value.nickname === 'string' ? value.nickname : undefined,
    avatarText: typeof value.avatarText === 'string' ? value.avatarText : undefined,
    avatarUrl: typeof value.avatarUrl === 'string' ? value.avatarUrl : undefined,
    gender:
      value.gender === 'unknown' || value.gender === 'female' || value.gender === 'male'
        ? value.gender
        : undefined,
    birthday: typeof value.birthday === 'string' ? value.birthday : undefined,
    birthdayLocked: typeof value.birthdayLocked === 'boolean' ? value.birthdayLocked : undefined,
    contactPhone: typeof value.contactPhone === 'string' ? value.contactPhone : undefined,
    contactPhoneMasked: typeof value.contactPhoneMasked === 'string' ? value.contactPhoneMasked : undefined
  };
}

function toMaskedPhoneSearchQuery(query: string) {
  const digits = query.replace(/\D/g, '');
  if (digits.length < 7) {
    return null;
  }
  const localDigits = digits.length > 11 ? digits.slice(-11) : digits;
  return `${localDigits.slice(0, 3)}****${localDigits.slice(-4)}`;
}

function formatMoney(value: number) {
  return `￥${Math.abs(value).toFixed(2)}`;
}

function getBalanceAdjustmentShortNote(delta: number) {
  if (delta > 0) {
    return `增加 ${formatMoney(delta)}`;
  }
  if (delta < 0) {
    return `扣减 ${formatMoney(delta)}`;
  }
  return '余额未变化';
}

function getFullContactPhone(user: UserRow, profile?: CustomerProfileRecord) {
  const profilePhone = profile?.contactPhone?.trim();
  const storedPhone = user.contactPhoneEncrypted?.trim();

  if (profilePhone) {
    return profilePhone;
  }

  if (storedPhone) {
    return storedPhone;
  }

  return user.contactPhoneMasked.includes('*') ? undefined : user.contactPhoneMasked;
}

function toNumber(value: unknown): number {
  if (value && typeof value === 'object' && 'toNumber' in value && typeof value.toNumber === 'function') {
    return value.toNumber();
  }

  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeMembershipTiers(value: unknown): MembershipTierRow[] {
  if (!isObject(value) || !Array.isArray(value.tiers)) {
    return [];
  }

  return value.tiers
    .filter((tier): tier is Record<string, unknown> => isObject(tier))
    .map((tier) => ({
      threshold: toNumber(tier.threshold),
      name: typeof tier.name === 'string' ? tier.name.trim() : ''
    }))
    .filter((tier) => tier.name && tier.threshold >= 0)
    .sort((left, right) => left.threshold - right.threshold);
}

async function getMembershipTiers(client: DbClient): Promise<MembershipTierRow[]> {
  const runtimeConfigSection = (client as unknown as {
    runtimeConfigSection?: {
      findUnique?: (input: { where: { id: string } }) => Promise<{ value: unknown } | null>;
    };
  }).runtimeConfigSection;

  if (!runtimeConfigSection?.findUnique) {
    return [];
  }

  const section = await runtimeConfigSection.findUnique({
    where: {
      id: 'membership-tiers'
    }
  });
  return normalizeMembershipTiers(section?.value);
}

async function getRechargeTotal(client: DbClient, openid: string): Promise<number> {
  const balanceLedger = (client as unknown as {
    balanceLedger?: {
      aggregate?: (input: unknown) => Promise<{ _sum?: { amountDelta?: unknown } }>;
    };
  }).balanceLedger;

  if (!balanceLedger?.aggregate) {
    return 0;
  }

  const result = await balanceLedger.aggregate({
    where: {
      openid,
      OR: [
        { type: LEDGER_TYPE.recharge },
        {
          type: LEDGER_TYPE.manual_adjustment,
          reason: {
            startsWith: '充值'
          }
        },
        {
          type: LEDGER_TYPE.manual_adjustment,
          reason: {
            startsWith: '线下收款'
          }
        },
        {
          type: LEDGER_TYPE.manual_adjustment,
          reason: {
            startsWith: '退款'
          }
        }
      ]
    },
    _sum: {
      amountDelta: true
    }
  });
  return toNumber(result._sum?.amountDelta);
}

function getMembershipTierLabel(tiers: MembershipTierRow[], rechargeTotal: number) {
  return tiers.reduce((matched, tier) => (rechargeTotal >= tier.threshold ? tier.name : matched), '普通会员');
}

function mapMerchantUser(user: MerchantUserSearchRow, membershipTierLabel = '普通会员'): MerchantUserSearchItem {
  const profile = normalizeProfile(user.profile);
  return {
    openid: user.openid,
    avatarUrl: profile?.avatarUrl ?? profile?.avatarText ?? '',
    nickname: profile?.nickname || user.openid,
    contactPhoneMasked: profile?.contactPhoneMasked || user.contactPhoneMasked,
    contactPhone: getFullContactPhone(user, profile),
    membershipTierLabel,
    currentBalance: user.balanceAccount?.balance.toNumber() ?? 0
  };
}

function mapBalanceLedger(row: BalanceLedgerRow): MerchantBalanceLedgerEntry {
  const amountDelta = row.amountDelta.toNumber();
  const [reasonType] = (row.reason ?? '').split(/:\s*/, 2);
  return {
    id: row.id,
    normalizedTitle: reasonType || '余额调整',
    shortNote: getBalanceAdjustmentShortNote(amountDelta),
    amountDelta,
    balanceBefore: row.balanceBefore.toNumber(),
    balanceAfter: row.balanceAfter.toNumber(),
    operatedAt: row.createdAt.toISOString(),
    operatorName: row.operatorName || '商户后台'
  };
}

function mapMerchantUserAddress(row: AddressRow): MerchantUserAddressItem {
  const snapshot = isObject(row.snapshot) ? row.snapshot : {};
  const snapshotType = snapshot.type === 'express' ? 'express' : 'city';
  return {
    id: row.id,
    type: snapshotType,
    recipientName: row.recipientName,
    phoneNumber: typeof snapshot.phoneNumber === 'string' ? snapshot.phoneNumber : row.phoneMasked,
    regionLabel: row.regionLabel,
    detailAddress: row.detailAddress,
    tag: row.tag,
    isDefault: row.isDefault
  };
}

function mapLatestAdjustment(row: BalanceLedgerRow | null): MerchantLatestAdjustment | null {
  if (!row) {
    return null;
  }
  const ledger = mapBalanceLedger(row);
  return {
    normalizedTitle: ledger.normalizedTitle,
    shortNote: ledger.shortNote,
    operatedAt: ledger.operatedAt,
    operatorName: ledger.operatorName
  };
}

function normalizePagination(input: PaginationInput = {}) {
  const parsedLimit = Number(input.limit ?? 20);
  const parsedCursor = Number(input.cursor ?? 0);
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(Math.trunc(parsedLimit), 1), 50) : 20;
  const cursor = Number.isFinite(parsedCursor) ? Math.max(Math.trunc(parsedCursor), 0) : 0;
  return { cursor, limit };
}

export function mapUser(row: UserRow): UserRecord {
  return {
    openid: row.openid,
    status: toSharedEnum(row.status, USER_STATUS),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastLoginAt: (row.lastLoginAt ?? row.updatedAt).toISOString(),
    phoneBindingState: toSharedEnum(row.phoneBindingState, PHONE_BINDING_STATE),
    contactPhoneMasked: row.contactPhoneMasked,
    contactPhoneCountryCode: row.contactPhoneCountryCode,
    profile: normalizeProfile(row.profile)
  };
}

export function createUserRepository(client: DbClient = getPrismaClient()) {
  return {
    async getByOpenid(openid: string): Promise<UserRecord | null> {
      const user = await client.user.findUnique({ where: { openid } });
      return user ? mapUser(user) : null;
    },

    async bootstrap(openid: string, at: Date = new Date()): Promise<UserRecord> {
      const user = await client.user.upsert({
        where: { openid },
        update: {
          lastLoginAt: at
        },
        create: {
          openid,
          status: USER_STATUS.active,
          phoneBindingState: PHONE_BINDING_STATE.unbound,
          contactPhoneMasked: '',
          contactPhoneCountryCode: '+86',
          lastLoginAt: at
        }
      });
      return mapUser(user);
    },

    async bindPhone(
      openid: string,
      input: { maskedPhone: string; countryCode: string; phoneNumber?: string },
      at: Date = new Date()
    ): Promise<UserRecord> {
      await this.bootstrap(openid, at);
      const user = await client.user.update({
        where: { openid },
        data: {
          phoneBindingState: PHONE_BINDING_STATE.bound,
          contactPhoneEncrypted: input.phoneNumber,
          contactPhoneMasked: input.maskedPhone,
          contactPhoneCountryCode: input.countryCode,
          updatedAt: at
        }
      });
      return mapUser(user);
    },

    async updateProfile(
      openid: string,
      input: CustomerProfileRecord,
      at: Date = new Date()
    ): Promise<UserRecord> {
      await this.bootstrap(openid, at);
      const existing = await client.user.findUnique({ where: { openid } });
      const profile = {
        ...(normalizeProfile(existing?.profile) ?? {}),
        ...input,
        updatedAt: at.toISOString()
      };
      const user = await client.user.update({
        where: { openid },
        data: {
          profile,
          updatedAt: at
        }
      });
      return mapUser(user);
    },

    async getCustomerProfile(openid: string) {
      await this.bootstrap(openid);
      const [user, paidOrderTotals, membershipTiers, rechargeTotal] = await Promise.all([
        client.user.findUnique({
          where: { openid },
          include: { balanceAccount: true }
        }) as Promise<CustomerProfileRow | null>,
        client.order.aggregate({
          where: {
            openid,
            status: ORDER_STATUS.paid
          },
          _sum: {
            payableTotal: true
          }
        }),
        getMembershipTiers(client),
        getRechargeTotal(client, openid)
      ]);
      const profile = normalizeProfile(user?.profile);
      return {
        avatarText: profile?.avatarText ?? '喜',
        nickname: profile?.nickname ?? '喜爱宠家长',
        gender: profile?.gender ?? 'unknown',
        memberLevel: getMembershipTierLabel(membershipTiers, rechargeTotal),
        balance: user?.balanceAccount?.balance.toNumber() ?? 0,
        totalSpent: paidOrderTotals._sum.payableTotal?.toNumber() ?? 0,
        totalRecharge: rechargeTotal,
        birthday: profile?.birthday ?? '',
        birthdayLocked: profile?.birthdayLocked ?? false,
        contactPhoneMasked: profile?.contactPhoneMasked || user?.contactPhoneMasked || ''
      };
    },

    async getMerchantUserDetail(openid: string): Promise<{ ok: true; user: MerchantUserDetailItem | null }> {
      const user = await client.user.findUnique({
        where: { openid },
        include: { balanceAccount: true }
      }) as MerchantUserSearchRow | null;

      if (!user || user.phoneBindingState !== PHONE_BINDING_STATE.bound) {
        return { ok: true as const, user: null };
      }

      const [latestLedger, balanceLedgerCount, addressCount, membershipTiers, rechargeTotal] = await Promise.all([
        client.balanceLedger.findMany({
          where: { openid },
          orderBy: { createdAt: 'desc' },
          take: 1
        }) as Promise<BalanceLedgerRow[]>,
        client.balanceLedger.count({ where: { openid } }),
        client.address.count({ where: { openid } }),
        getMembershipTiers(client),
        getRechargeTotal(client, openid)
      ]);

      return {
        ok: true as const,
        user: {
          ...mapMerchantUser(user, getMembershipTierLabel(membershipTiers, rechargeTotal)),
          latestAdjustment: mapLatestAdjustment(latestLedger[0] ?? null),
          addressCount,
          balanceLedgerCount,
          balanceLedgers: [],
          addresses: []
        }
      };
    },

    async getMerchantUserAddresses(openid: string): Promise<{ ok: true; addresses: MerchantUserAddressItem[] }> {
      const addresses = await client.address.findMany({
        where: { openid },
        orderBy: [
          { isDefault: 'desc' },
          { updatedAt: 'desc' }
        ]
      }) as AddressRow[];

      return {
        ok: true as const,
        addresses: addresses.map(mapMerchantUserAddress)
      };
    },

    async getMerchantUserBalanceLedgers(
      openid: string,
      paginationInput: PaginationInput = {}
    ): Promise<{ ok: true } & MerchantBalanceLedgerPage> {
      const pagination = normalizePagination(paginationInput);
      const [total, ledgers] = await Promise.all([
        client.balanceLedger.count({ where: { openid } }),
        client.balanceLedger.findMany({
          where: { openid },
          orderBy: { createdAt: 'desc' },
          skip: pagination.cursor,
          take: pagination.limit
        }) as Promise<BalanceLedgerRow[]>
      ]);
      const nextOffset = pagination.cursor + ledgers.length;
      const hasMore = nextOffset < total;

      return {
        ok: true as const,
        records: ledgers.map(mapBalanceLedger),
        pagination: {
          nextCursor: hasMore ? String(nextOffset) : null,
          hasMore,
          limit: pagination.limit,
          total
        }
      };
    },

    async searchUsers(query: string, limit = 20): Promise<MerchantUserSearchItem[]> {
      const trimmedQuery = query.trim();
      const maskedPhoneQuery = toMaskedPhoneSearchQuery(trimmedQuery);
      const where = trimmedQuery
        ? {
            phoneBindingState: PHONE_BINDING_STATE.bound,
            OR: [
              { openid: { contains: trimmedQuery } },
              { contactPhoneMasked: { contains: trimmedQuery } },
              ...(maskedPhoneQuery ? [{ contactPhoneMasked: { contains: maskedPhoneQuery } }] : []),
              { profile: { path: '$.nickname', string_contains: trimmedQuery } }
            ]
          }
        : {
            phoneBindingState: PHONE_BINDING_STATE.bound
          };
      const users = await client.user.findMany({
        where,
        include: {
          balanceAccount: true
        },
        orderBy: { updatedAt: 'desc' },
        take: limit
      });

      const rows = users as MerchantUserSearchRow[];
      if (!rows.length) {
        return [];
      }

      const membershipTiers = await getMembershipTiers(client);
      return Promise.all(
        rows.map(async (user) => mapMerchantUser(user, getMembershipTierLabel(membershipTiers, await getRechargeTotal(client, user.openid))))
      );
    }
  };
}
