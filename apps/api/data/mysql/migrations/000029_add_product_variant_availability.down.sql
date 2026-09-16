ALTER TABLE `variants`
  DROP COLUMN `available_quantity`,
  DROP COLUMN `is_available`;

ALTER TABLE `products`
  DROP COLUMN `available_quantity`,
  DROP COLUMN `availability_tracking`,
  DROP COLUMN `is_available`;
