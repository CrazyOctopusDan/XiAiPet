-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `legacyId` VARCHAR(191) NULL,
    `openid` VARCHAR(191) NOT NULL,
    `status` ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
    `phoneBindingState` ENUM('unbound', 'bound') NOT NULL DEFAULT 'unbound',
    `contactPhoneEncrypted` VARCHAR(512) NULL,
    `contactPhoneMasked` VARCHAR(64) NOT NULL DEFAULT '',
    `contactPhoneCountryCode` VARCHAR(16) NOT NULL DEFAULT '+86',
    `profile` JSON NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_legacyId_key`(`legacyId`),
    UNIQUE INDEX `users_openid_key`(`openid`),
    INDEX `users_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `merchant_users` (
    `id` VARCHAR(191) NOT NULL,
    `legacyId` VARCHAR(191) NULL,
    `openid` VARCHAR(191) NOT NULL,
    `merchantId` VARCHAR(191) NOT NULL,
    `storeName` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `grantedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `merchant_users_legacyId_key`(`legacyId`),
    UNIQUE INDEX `merchant_users_openid_key`(`openid`),
    INDEX `merchant_users_merchantId_enabled_idx`(`merchantId`, `enabled`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `runtime_config_sections` (
    `id` VARCHAR(191) NOT NULL,
    `value` JSON NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `addresses` (
    `id` VARCHAR(191) NOT NULL,
    `legacyId` VARCHAR(191) NULL,
    `openid` VARCHAR(191) NOT NULL,
    `recipientName` VARCHAR(128) NOT NULL,
    `phoneMasked` VARCHAR(64) NOT NULL,
    `phoneEncrypted` VARCHAR(512) NULL,
    `regionLabel` VARCHAR(255) NOT NULL,
    `detailAddress` VARCHAR(512) NOT NULL,
    `tag` VARCHAR(64) NOT NULL DEFAULT '',
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `snapshot` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `addresses_legacyId_key`(`legacyId`),
    INDEX `addresses_openid_isDefault_idx`(`openid`, `isDefault`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pets` (
    `id` VARCHAR(191) NOT NULL,
    `legacyId` VARCHAR(191) NULL,
    `openid` VARCHAR(191) NOT NULL,
    `name` VARCHAR(128) NOT NULL,
    `species` VARCHAR(64) NOT NULL DEFAULT '',
    `breed` VARCHAR(128) NOT NULL DEFAULT '',
    `birthday` DATETIME(3) NULL,
    `profile` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pets_legacyId_key`(`legacyId`),
    INDEX `pets_openid_idx`(`openid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` VARCHAR(191) NOT NULL,
    `legacyId` VARCHAR(191) NULL,
    `name` VARCHAR(128) NOT NULL,
    `iconToken` VARCHAR(16) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `categories_legacyId_key`(`legacyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` VARCHAR(191) NOT NULL,
    `legacyId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(1024) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `imageFileId` VARCHAR(512) NOT NULL,
    `imagePreviewUrl` VARCHAR(1024) NULL,
    `memberLevelId` VARCHAR(191) NULL,
    `status` ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
    `stock` INTEGER NOT NULL DEFAULT 0,
    `trackInventory` BOOLEAN NOT NULL DEFAULT true,
    `fulfillmentModes` JSON NOT NULL,
    `basePrice` DECIMAL(10, 2) NOT NULL,
    `specs` JSON NOT NULL,
    `formulas` JSON NOT NULL,
    `priceOverrides` JSON NOT NULL,
    `purchaseLimit` JSON NOT NULL,
    `detailContent` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `products_legacyId_key`(`legacyId`),
    INDEX `products_categoryId_status_idx`(`categoryId`, `status`),
    INDEX `products_status_updatedAt_idx`(`status`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orders` (
    `id` VARCHAR(191) NOT NULL,
    `legacyId` VARCHAR(191) NULL,
    `openid` VARCHAR(191) NOT NULL,
    `status` ENUM('pending_payment', 'payment_processing', 'paid', 'payment_failed', 'cancelled') NOT NULL DEFAULT 'pending_payment',
    `idempotencyKey` VARCHAR(191) NULL,
    `paymentMethod` ENUM('wechat', 'balance') NOT NULL,
    `paymentStatus` ENUM('pending', 'processing', 'paid', 'failed') NOT NULL DEFAULT 'pending',
    `fulfillmentMode` ENUM('delivery', 'pickup', 'express') NOT NULL,
    `fulfillmentStatus` ENUM('pending', 'in_production', 'out_for_delivery', 'ready_for_pickup', 'ready_to_ship', 'completed', 'cancelled') NULL DEFAULT 'pending',
    `itemsSubtotal` DECIMAL(10, 2) NOT NULL,
    `deliveryFee` DECIMAL(10, 2) NOT NULL,
    `payableTotal` DECIMAL(10, 2) NOT NULL,
    `snapshot` JSON NOT NULL,
    `merchantOverride` JSON NULL,
    `receiptPrint` JSON NULL,
    `paidAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `orders_legacyId_key`(`legacyId`),
    INDEX `orders_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `orders_paymentStatus_createdAt_idx`(`paymentStatus`, `createdAt`),
    INDEX `orders_fulfillmentStatus_createdAt_idx`(`fulfillmentStatus`, `createdAt`),
    UNIQUE INDEX `orders_openid_idempotencyKey_key`(`openid`, `idempotencyKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_items` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `specId` VARCHAR(191) NOT NULL DEFAULT '',
    `name` VARCHAR(191) NOT NULL,
    `specLabel` VARCHAR(191) NOT NULL DEFAULT '',
    `unitPrice` DECIMAL(10, 2) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `lineTotal` DECIMAL(10, 2) NOT NULL,
    `snapshot` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `order_items_orderId_idx`(`orderId`),
    INDEX `order_items_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `method` ENUM('wechat', 'balance') NOT NULL,
    `status` ENUM('pending', 'processing', 'paid', 'failed') NOT NULL DEFAULT 'pending',
    `outTradeNo` VARCHAR(191) NULL,
    `prepayId` VARCHAR(191) NULL,
    `transactionId` VARCHAR(191) NULL,
    `failureCode` VARCHAR(128) NULL,
    `failureMessage` VARCHAR(512) NULL,
    `paidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payments_orderId_key`(`orderId`),
    UNIQUE INDEX `payments_outTradeNo_key`(`outTradeNo`),
    UNIQUE INDEX `payments_transactionId_key`(`transactionId`),
    INDEX `payments_method_status_idx`(`method`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `balance_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `openid` VARCHAR(191) NOT NULL,
    `balance` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `version` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `balance_accounts_openid_key`(`openid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `balance_ledgers` (
    `id` VARCHAR(191) NOT NULL,
    `legacyId` VARCHAR(191) NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `openid` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NULL,
    `type` ENUM('recharge', 'order_payment', 'refund', 'manual_adjustment') NOT NULL,
    `amountDelta` DECIMAL(10, 2) NOT NULL,
    `balanceBefore` DECIMAL(10, 2) NOT NULL,
    `balanceAfter` DECIMAL(10, 2) NOT NULL,
    `operatorId` VARCHAR(191) NULL,
    `operatorName` VARCHAR(191) NULL,
    `reason` VARCHAR(512) NULL,
    `idempotencyKey` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `balance_ledgers_legacyId_key`(`legacyId`),
    INDEX `balance_ledgers_openid_createdAt_idx`(`openid`, `createdAt`),
    INDEX `balance_ledgers_orderId_idx`(`orderId`),
    UNIQUE INDEX `balance_ledgers_openid_idempotencyKey_key`(`openid`, `idempotencyKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `receipt_print_audits` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `operatorId` VARCHAR(191) NOT NULL,
    `operatorName` VARCHAR(191) NOT NULL,
    `printedAt` DATETIME(3) NOT NULL,
    `printerDeviceId` VARCHAR(191) NOT NULL,
    `printerDeviceLabel` VARCHAR(191) NOT NULL,
    `receiptTemplateVersion` VARCHAR(64) NOT NULL,
    `result` ENUM('success', 'failed') NOT NULL,
    `failureReason` VARCHAR(512) NULL,
    `isReprint` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `receipt_print_audits_orderId_printedAt_idx`(`orderId`, `printedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `merchant_users` ADD CONSTRAINT `merchant_users_openid_fkey` FOREIGN KEY (`openid`) REFERENCES `users`(`openid`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `addresses` ADD CONSTRAINT `addresses_openid_fkey` FOREIGN KEY (`openid`) REFERENCES `users`(`openid`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pets` ADD CONSTRAINT `pets_openid_fkey` FOREIGN KEY (`openid`) REFERENCES `users`(`openid`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_openid_fkey` FOREIGN KEY (`openid`) REFERENCES `users`(`openid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `balance_accounts` ADD CONSTRAINT `balance_accounts_openid_fkey` FOREIGN KEY (`openid`) REFERENCES `users`(`openid`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `balance_ledgers` ADD CONSTRAINT `balance_ledgers_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `balance_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `balance_ledgers` ADD CONSTRAINT `balance_ledgers_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receipt_print_audits` ADD CONSTRAINT `receipt_print_audits_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
