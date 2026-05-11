import { readFile } from 'node:fs/promises';

import type { Prisma, PrismaClient } from '@prisma/client';

import { PRODUCT_STATUS, USER_STATUS } from '../../db/enums';
import { getPrismaClient } from '../../db/prisma';

interface CloudBaseExport {
  users?: Array<Record<string, unknown>>;
  merchantUsers?: Array<Record<string, unknown>>;
  categories?: Array<Record<string, unknown>>;
  products?: Array<Record<string, unknown>>;
  runtimeConfigs?: Array<Record<string, unknown>>;
  orders?: Array<Record<string, unknown>>;
  balanceAccounts?: Array<Record<string, unknown>>;
  balanceLedgers?: Array<Record<string, unknown>>;
  receiptPrintAudits?: Array<Record<string, unknown>>;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function loadCloudBaseExport(filePath: string): Promise<CloudBaseExport> {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw) as CloudBaseExport;
}

export async function importCloudBaseExport(exportData: CloudBaseExport, client: PrismaClient = getPrismaClient()) {
  const users = exportData.users ?? [];
  const merchantUsers = exportData.merchantUsers ?? [];
  const categories = exportData.categories ?? [];
  const products = exportData.products ?? [];
  const runtimeConfigs = exportData.runtimeConfigs ?? [];
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let invalid = 0;

  for (const user of users) {
    const openid = asString(user.openid);
    if (!openid) {
      invalid += 1;
      continue;
    }

    const existing = await client.user.findUnique({ where: { openid } });
    await client.user.upsert({
      where: { openid },
      update: {
        legacyId: asOptionalString(user._id),
        status: USER_STATUS.active,
        profile: asJson(user)
      },
      create: {
        legacyId: asOptionalString(user._id),
        openid,
        status: USER_STATUS.active,
        profile: asJson(user),
        contactPhoneMasked: asString(user.contactPhoneMasked),
        contactPhoneCountryCode: asString(user.contactPhoneCountryCode, '+86')
      }
    });
    existing ? (updated += 1) : (inserted += 1);
  }

  for (const merchantUser of merchantUsers) {
    const openid = asString(merchantUser.openid);
    if (!openid) {
      invalid += 1;
      continue;
    }

    const existing = await client.merchantUser.findUnique({ where: { openid } });
    await client.merchantUser.upsert({
      where: { openid },
      update: {
        merchantId: asString(merchantUser.merchantId, 'merchant-imported'),
        storeName: asString(merchantUser.storeName, 'Imported Store'),
        enabled: merchantUser.enabled !== false
      },
      create: {
        openid,
        merchantId: asString(merchantUser.merchantId, 'merchant-imported'),
        storeName: asString(merchantUser.storeName, 'Imported Store'),
        enabled: merchantUser.enabled !== false
      }
    });
    existing ? (updated += 1) : (inserted += 1);
  }

  for (const category of categories) {
    const id = asString(category.id, asString(category._id));
    if (!id) {
      invalid += 1;
      continue;
    }

    const existing = await client.category.findUnique({ where: { id } });
    await client.category.upsert({
      where: { id },
      update: {
        legacyId: asOptionalString(category._id),
        name: asString(category.name, id),
        iconToken: asString(category.iconToken, '#')
      },
      create: {
        id,
        legacyId: asOptionalString(category._id),
        name: asString(category.name, id),
        iconToken: asString(category.iconToken, '#')
      }
    });
    existing ? (updated += 1) : (inserted += 1);
  }

  for (const product of products) {
    const id = asString(product.id, asString(product._id));
    const categoryId = asString(product.categoryId);
    if (!id || !categoryId) {
      invalid += 1;
      continue;
    }

    const existing = await client.product.findUnique({ where: { id } });
    const pricing = asObject(product.pricing);
    await client.product.upsert({
      where: { id },
      update: {
        legacyId: asOptionalString(product._id),
        name: asString(product.name, id),
        description: asString(product.description),
        status: PRODUCT_STATUS.published,
        stock: asNumber(product.stock),
        fulfillmentModes: asJson(asArray(product.fulfillmentModes))
      },
      create: {
        id,
        legacyId: asOptionalString(product._id),
        name: asString(product.name, id),
        description: asString(product.description),
        categoryId,
        imageFileId: asString(product.imageFileId, 'oss://xiaipet/import-placeholder.png'),
        imagePreviewUrl: asOptionalString(product.imagePreviewUrl),
        memberLevelId: asOptionalString(product.memberLevelId),
        status: PRODUCT_STATUS.published,
        stock: asNumber(product.stock),
        trackInventory: product.trackInventory !== false,
        fulfillmentModes: asJson(asArray(product.fulfillmentModes)),
        basePrice: asNumber(product.basePrice, asNumber(pricing.basePrice)),
        specs: asJson(asArray(product.specs ?? pricing.specs)),
        formulas: asJson(asArray(product.formulas ?? pricing.formulas)),
        priceOverrides: asJson(asArray(product.priceOverrides ?? pricing.overrides)),
        purchaseLimit: asJson(asObject(product.purchaseLimit ?? pricing.purchaseLimit)),
        detailContent: asString(product.detailContent)
      }
    });
    existing ? (updated += 1) : (inserted += 1);
  }

  for (const section of runtimeConfigs) {
    const id = asString(section.id, asString(section.sectionId));
    if (!id) {
      invalid += 1;
      continue;
    }

    const existing = await client.runtimeConfigSection.findUnique({ where: { id } });
    await client.runtimeConfigSection.upsert({
      where: { id },
      update: {
        value: asJson(section.value ?? section)
      },
      create: {
        id,
        value: asJson(section.value ?? section),
        updatedBy: 'cloudbase-import'
      }
    });
    existing ? (updated += 1) : (inserted += 1);
  }

  return {
    users: users.length,
    categories: categories.length,
    products: products.length,
    inserted,
    updated,
    skipped,
    invalid
  };
}
