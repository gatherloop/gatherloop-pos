ALTER TABLE `transactions`
  DROP FOREIGN KEY `fk_transactions_cart`,
  DROP KEY `idx_transactions_source`,
  DROP KEY `idx_transactions_cart_id`,
  DROP COLUMN `source`,
  DROP COLUMN `cart_id`;
