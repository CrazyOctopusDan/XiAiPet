ALTER TABLE `products`
  ADD COLUMN `sortOrder` INT NOT NULL DEFAULT 0;

CREATE INDEX `products_status_sortOrder_id_idx`
  ON `products`(`status`, `sortOrder`, `id`);

CREATE INDEX `products_categoryId_status_sortOrder_id_idx`
  ON `products`(`categoryId`, `status`, `sortOrder`, `id`);
