import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const now = new Date('2026-01-01T00:00:00.000Z');

export const RUNTIME_CONFIG_SECTION_IDS = [
  'store-profile',
  'delivery-rules',
  'membership-tiers',
  'banner',
  'custom-notice'
] as const;

export function buildSeedRuntimeConfigSections() {
  return [
    {
      id: 'store-profile',
      value: { storeName: 'XiAiPet', storeAddress: 'Shanghai demo store', servicePhone: '13800000000' }
    },
    {
      id: 'delivery-rules',
      value: { deliveryFee: 12, minimumOrderAmount: 98, supportedModes: ['delivery', 'pickup', 'express'] }
    },
    {
      id: 'membership-tiers',
      value: { tiers: [{ id: 'standard', name: 'Standard', minimumBalance: 0 }] }
    },
    {
      id: 'banner',
      value: { imageFileId: 'cloud://dev-placeholder/banner.png', title: 'XiAiPet local banner' }
    },
    {
      id: 'custom-notice',
      value: { content: 'Local development notice' }
    }
  ];
}

export function buildSeedCatalog() {
  return {
    categories: [
      { id: 'cat-cakes', name: 'Pet Cakes', iconToken: 'CAKE', sortOrder: 10 },
      { id: 'cat-snacks', name: 'Pet Snacks', iconToken: 'BONE', sortOrder: 20 }
    ],
    products: [
      {
        id: 'prod-birthday-cake',
        name: 'Birthday Cake',
        categoryId: 'cat-cakes',
        basePrice: '168.00',
        stock: 12
      },
      {
        id: 'prod-paw-cookie',
        name: 'Paw Cookie',
        categoryId: 'cat-snacks',
        basePrice: '38.00',
        stock: 50
      }
    ]
  };
}

async function seedRuntimeConfig(client: PrismaClient) {
  for (const section of buildSeedRuntimeConfigSections()) {
    await client.runtimeConfigSection.upsert({
      where: { id: section.id },
      update: {
        value: section.value,
        version: 1,
        updatedBy: 'seed'
      },
      create: {
        id: section.id,
        value: section.value,
        version: 1,
        updatedBy: 'seed',
        createdAt: now,
        updatedAt: now
      }
    });
  }
}

async function seedCatalog(client: PrismaClient) {
  const catalog = buildSeedCatalog();

  for (const category of catalog.categories) {
    await client.category.upsert({
      where: { id: category.id },
      update: {
        name: category.name,
        iconToken: category.iconToken,
        sortOrder: category.sortOrder
      },
      create: {
        id: category.id,
        name: category.name,
        iconToken: category.iconToken,
        sortOrder: category.sortOrder,
        createdAt: now,
        updatedAt: now
      }
    });
  }

  await client.product.upsert({
    where: { id: 'prod-birthday-cake' },
    update: {
      status: 'PUBLISHED',
      stock: 12
    },
    create: {
      id: 'prod-birthday-cake',
      name: 'Birthday Cake',
      description: 'Local birthday cake seed product.',
      categoryId: 'cat-cakes',
      imageFileId: 'cloud://dev-placeholder/prod-birthday-cake.png',
      imagePreviewUrl: 'https://oss.xiaipet.vip/catalog/prod-birthday-cake.png',
      status: 'PUBLISHED',
      stock: 12,
      trackInventory: true,
      fulfillmentModes: ['delivery', 'pickup'],
      basePrice: '168.00',
      specs: [{ id: '4-inch', label: '4 inch', surcharge: 0 }],
      formulas: [{ id: 'chicken', label: 'Chicken', surcharge: 0 }],
      priceOverrides: [],
      purchaseLimit: { enabled: true, maxQuantity: 2 },
      detailContent: 'Local deterministic cake seed.',
      createdAt: now,
      updatedAt: now
    }
  });

  await client.product.upsert({
    where: { id: 'prod-paw-cookie' },
    update: {
      status: 'PUBLISHED',
      stock: 50
    },
    create: {
      id: 'prod-paw-cookie',
      name: 'Paw Cookie',
      description: 'Local snack seed product.',
      categoryId: 'cat-snacks',
      imageFileId: 'cloud://dev-placeholder/prod-paw-cookie.png',
      imagePreviewUrl: 'https://oss.xiaipet.vip/catalog/prod-paw-cookie.png',
      status: 'PUBLISHED',
      stock: 50,
      trackInventory: true,
      fulfillmentModes: ['pickup', 'express'],
      basePrice: '38.00',
      specs: [],
      formulas: [],
      priceOverrides: [],
      purchaseLimit: { enabled: false, maxQuantity: null },
      detailContent: 'Local deterministic cookie seed.',
      createdAt: now,
      updatedAt: now
    }
  });

  await client.category.upsert({
    where: { id: 'cakes' },
    update: {
      name: '宠物蛋糕',
      iconToken: '🎂',
      sortOrder: 10
    },
    create: {
      id: 'cakes',
      name: '宠物蛋糕',
      iconToken: '🎂',
      sortOrder: 10,
      createdAt: now,
      updatedAt: now
    }
  });

  await client.product.upsert({
    where: { id: 'sea-sponge' },
    update: {
      status: 'PUBLISHED',
      stock: 30
    },
    create: {
      id: 'sea-sponge',
      name: '海盐芝士小方',
      description: '适合小型犬猫的低糖烘焙点心。',
      categoryId: 'cakes',
      imageFileId: 'oss://xiaipet-dev/catalog/sea-sponge.png',
      imagePreviewUrl: 'https://oss.xiaipet.vip/catalog/sea-sponge.png',
      status: 'PUBLISHED',
      stock: 30,
      trackInventory: true,
      fulfillmentModes: ['delivery', 'pickup', 'express'],
      basePrice: '68.00',
      specs: [],
      formulas: [],
      priceOverrides: [],
      purchaseLimit: { enabled: false, maxQuantity: null },
      detailContent: '无蔗糖、少油配方，建议冷藏保存。',
      createdAt: now,
      updatedAt: now
    }
  });

  await client.product.upsert({
    where: { id: 'ocean-party' },
    update: {
      status: 'PUBLISHED',
      stock: 12
    },
    create: {
      id: 'ocean-party',
      name: '海洋派对生日蛋糕',
      description: '生日预约款宠物蛋糕。',
      categoryId: 'cakes',
      imageFileId: 'oss://xiaipet-dev/catalog/ocean-party.png',
      imagePreviewUrl: 'https://oss.xiaipet.vip/catalog/ocean-party.png',
      status: 'PUBLISHED',
      stock: 12,
      trackInventory: true,
      fulfillmentModes: ['delivery', 'pickup'],
      basePrice: '168.00',
      specs: [
        { id: '4-inch', label: '4 寸', surcharge: 0 },
        { id: '6-inch', label: '6 寸', surcharge: 60 }
      ],
      formulas: [
        { id: 'chicken', label: '鸡肉南瓜', surcharge: 0 },
        { id: 'salmon', label: '三文鱼土豆', surcharge: 30 }
      ],
      priceOverrides: [{ specId: '6-inch', formulaId: 'salmon', price: 258 }],
      purchaseLimit: { enabled: true, maxQuantity: 2 },
      detailContent: '需提前 24 小时预约，支持门店自取与同城配送。',
      createdAt: now,
      updatedAt: now
    }
  });
}

async function seedUserAndOrder(client: PrismaClient) {
  const openid = 'customer-openid-dev';
  const merchantOpenid = 'merchant-openid-dev';

  await client.user.upsert({
    where: { openid },
    update: {
      status: 'ACTIVE',
      lastLoginAt: now
    },
    create: {
      openid,
      status: 'ACTIVE',
      phoneBindingState: 'BOUND',
      contactPhoneMasked: '138****0001',
      contactPhoneCountryCode: '+86',
      profile: { nickname: '本地开发用户' },
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now
    }
  });

  await client.user.upsert({
    where: { openid: merchantOpenid },
    update: {
      status: 'ACTIVE',
      lastLoginAt: now
    },
    create: {
      openid: merchantOpenid,
      status: 'ACTIVE',
      phoneBindingState: 'BOUND',
      contactPhoneMasked: '139****0001',
      contactPhoneCountryCode: '+86',
      profile: { role: 'merchant' },
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now
    }
  });

  await client.merchantUser.upsert({
    where: { openid: merchantOpenid },
    update: {
      merchantId: 'merchant-dev',
      storeName: 'XiAiPet Local Store',
      enabled: true
    },
    create: {
      openid: merchantOpenid,
      merchantId: 'merchant-dev',
      storeName: 'XiAiPet Local Store',
      enabled: true,
      grantedAt: now,
      createdAt: now,
      updatedAt: now
    }
  });

  await client.address.upsert({
    where: { legacyId: 'seed-address-001' },
    update: {
      recipientName: '张三',
      isDefault: true
    },
    create: {
      legacyId: 'seed-address-001',
      openid,
      recipientName: '张三',
      phoneMasked: '138****0001',
      regionLabel: '上海市 徐汇区',
      detailAddress: '永嘉路 88 号',
      tag: '家',
      isDefault: true,
      snapshot: { source: 'seed' },
      createdAt: now,
      updatedAt: now
    }
  });

  await client.pet.upsert({
    where: { legacyId: 'seed-pet-001' },
    update: {
      name: '奶油'
    },
    create: {
      legacyId: 'seed-pet-001',
      openid,
      name: '奶油',
      species: 'dog',
      breed: '柯基',
      profile: { allergyNotes: '无' },
      createdAt: now,
      updatedAt: now
    }
  });

  const account = await client.balanceAccount.upsert({
    where: { openid },
    update: {},
    create: {
      openid,
      balance: '200.00',
      createdAt: now,
      updatedAt: now
    }
  });

  await client.order.upsert({
    where: { id: 'seed-order-001' },
    update: {
      status: 'PAID',
      paymentStatus: 'PAID'
    },
    create: {
      id: 'seed-order-001',
      openid,
      status: 'PAID',
      idempotencyKey: 'seed-order-001',
      paymentMethod: 'WECHAT',
      paymentStatus: 'PAID',
      fulfillmentMode: 'DELIVERY',
      fulfillmentStatus: 'IN_PRODUCTION',
      itemsSubtotal: '68.00',
      deliveryFee: '12.00',
      payableTotal: '80.00',
      snapshot: {
        fulfillment: {
          mode: 'delivery',
          address: {
            recipientName: '张三',
            phoneNumber: '138****0001',
            regionLabel: '上海市 徐汇区',
            detailAddress: '永嘉路 88 号',
            tag: '家'
          },
          store: { name: 'XiAiPet', address: '上海市徐汇区永嘉路 88 号' }
        },
        items: [{ productId: 'sea-sponge', name: '海盐芝士小方', quantity: 1, unitPrice: 68, specId: '', specLabel: '', lineTotal: 68 }],
        pets: [{ id: 'seed-pet-001', name: '奶油' }],
        remark: '种子订单'
      },
      paidAt: now,
      createdAt: now,
      updatedAt: now,
      items: {
        create: [
          {
            productId: 'sea-sponge',
            name: '海盐芝士小方',
            quantity: 1,
            unitPrice: '68.00',
            lineTotal: '68.00'
          }
        ]
      },
      payment: {
        create: {
          method: 'WECHAT',
          status: 'PAID',
          outTradeNo: 'seed-out-trade-no-001',
          transactionId: 'seed-transaction-001',
          paidAt: now,
          createdAt: now,
          updatedAt: now
        }
      }
    }
  });

  await client.balanceLedger.upsert({
    where: { openid_idempotencyKey: { openid, idempotencyKey: 'seed-ledger-recharge-001' } },
    update: {},
    create: {
      accountId: account.id,
      openid,
      type: 'RECHARGE',
      amountDelta: '200.00',
      balanceBefore: '0.00',
      balanceAfter: '200.00',
      reason: '本地种子余额',
      idempotencyKey: 'seed-ledger-recharge-001',
      createdAt: now
    }
  });

  await client.receiptPrintAudit.upsert({
    where: { id: 'seed-print-audit-001' },
    update: {},
    create: {
      id: 'seed-print-audit-001',
      orderId: 'seed-order-001',
      operatorId: 'seed-merchant-001',
      operatorName: '店主',
      printedAt: now,
      printerDeviceId: 'seed-printer-001',
      printerDeviceLabel: '前台小票机',
      receiptTemplateVersion: 'v1',
      result: 'SUCCESS',
      createdAt: now
    }
  });
}

export async function seedDatabase(client: PrismaClient = prisma) {
  await seedRuntimeConfig(client);
  await seedCatalog(client);
  await seedUserAndOrder(client);
}

async function main() {
  await seedDatabase();
}

if (require.main === module) {
  main()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (error) => {
      console.error(error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
