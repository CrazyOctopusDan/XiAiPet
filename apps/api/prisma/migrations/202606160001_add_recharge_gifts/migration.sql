-- CreateTable
CREATE TABLE `recharge_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `openid` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `planSnapshot` JSON NOT NULL,
    `paidAmount` DECIMAL(10, 2) NOT NULL,
    `bonusAmount` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('pending', 'processing', 'paid', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
    `outTradeNo` VARCHAR(191) NOT NULL,
    `prepayId` VARCHAR(191) NULL,
    `transactionId` VARCHAR(191) NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `paidAt` DATETIME(3) NULL,
    `settledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `recharge_transactions_outTradeNo_key`(`outTradeNo`),
    UNIQUE INDEX `recharge_transactions_transactionId_key`(`transactionId`),
    INDEX `recharge_transactions_openid_createdAt_idx`(`openid`, `createdAt`),
    INDEX `recharge_transactions_status_createdAt_idx`(`status`, `createdAt`),
    UNIQUE INDEX `recharge_transactions_openid_idempotencyKey_key`(`openid`, `idempotencyKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_gifts` (
    `id` VARCHAR(191) NOT NULL,
    `openid` VARCHAR(191) NOT NULL,
    `sourceRechargeTransactionId` VARCHAR(191) NOT NULL,
    `sourcePlanId` VARCHAR(191) NOT NULL,
    `giftTemplateId` VARCHAR(191) NOT NULL,
    `giftSnapshot` JSON NOT NULL,
    `status` ENUM('available', 'locked', 'redeemed') NOT NULL DEFAULT 'available',
    `expiresAt` DATETIME(3) NOT NULL,
    `lockedOrderId` VARCHAR(191) NULL,
    `redeemedOrderId` VARCHAR(191) NULL,
    `lockedAt` DATETIME(3) NULL,
    `redeemedAt` DATETIME(3) NULL,
    `releasedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `user_gifts_openid_status_expiresAt_idx`(`openid`, `status`, `expiresAt`),
    INDEX `user_gifts_lockedOrderId_idx`(`lockedOrderId`),
    INDEX `user_gifts_redeemedOrderId_idx`(`redeemedOrderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `recharge_transactions` ADD CONSTRAINT `recharge_transactions_openid_fkey` FOREIGN KEY (`openid`) REFERENCES `users`(`openid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_gifts` ADD CONSTRAINT `user_gifts_openid_fkey` FOREIGN KEY (`openid`) REFERENCES `users`(`openid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_gifts` ADD CONSTRAINT `user_gifts_sourceRechargeTransactionId_fkey` FOREIGN KEY (`sourceRechargeTransactionId`) REFERENCES `recharge_transactions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
