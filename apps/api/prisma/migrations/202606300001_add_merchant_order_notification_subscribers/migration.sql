-- CreateTable
CREATE TABLE `merchant_order_notification_subscribers` (
    `id` VARCHAR(191) NOT NULL,
    `merchantAccountId` VARCHAR(191) NOT NULL,
    `openid` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `lastSubscribedAt` DATETIME(3) NOT NULL,
    `lastNotifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `order_notify_subscriber_unique`(`merchantAccountId`, `openid`, `templateId`),
    INDEX `order_notify_template_enabled_idx`(`templateId`, `enabled`),
    INDEX `order_notify_openid_idx`(`openid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `merchant_order_notification_subscribers` ADD CONSTRAINT `merchant_order_notification_subscribers_merchantAccountId_fkey` FOREIGN KEY (`merchantAccountId`) REFERENCES `merchant_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
