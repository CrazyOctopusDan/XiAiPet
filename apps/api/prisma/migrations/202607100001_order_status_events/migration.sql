CREATE TABLE `order_status_events` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `type` ENUM('created', 'status_changed') NOT NULL,
    `fromOrderStatus` ENUM('pending_payment', 'payment_processing', 'paid', 'payment_failed', 'cancelled') NULL,
    `toOrderStatus` ENUM('pending_payment', 'payment_processing', 'paid', 'payment_failed', 'cancelled') NULL,
    `fromPaymentStatus` ENUM('pending', 'processing', 'paid', 'failed') NULL,
    `toPaymentStatus` ENUM('pending', 'processing', 'paid', 'failed') NULL,
    `fromFulfillmentStatus` ENUM('pending', 'in_production', 'out_for_delivery', 'ready_for_pickup', 'ready_to_ship', 'completed', 'cancelled') NULL,
    `toFulfillmentStatus` ENUM('pending', 'in_production', 'out_for_delivery', 'ready_for_pickup', 'ready_to_ship', 'completed', 'cancelled') NULL,
    `actorType` VARCHAR(32) NOT NULL,
    `actorOpenid` VARCHAR(191) NULL,
    `actorName` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    INDEX `order_status_events_orderId_occurredAt_id_idx` (`orderId`, `occurredAt`, `id`),
    CONSTRAINT `order_status_events_orderId_fkey`
      FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);
