ALTER TABLE `products`
  ADD COLUMN `is_available` TINYINT(1) NOT NULL DEFAULT 1 AFTER `status`,
  ADD COLUMN `availability_tracking` ENUM('none','product','variant') NOT NULL DEFAULT 'none' AFTER `is_available`,
  ADD COLUMN `available_quantity` INT NULL AFTER `availability_tracking`;

ALTER TABLE `variants`
  ADD COLUMN `is_available` TINYINT(1) NOT NULL DEFAULT 1 AFTER `price`,
  ADD COLUMN `available_quantity` INT NULL AFTER `is_available`;
