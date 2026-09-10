ALTER TABLE `transactions`
  ADD COLUMN `source`  VARCHAR(16) NOT NULL DEFAULT 'pos' AFTER `name`,
  ADD COLUMN `cart_id` BIGINT      NULL                   AFTER `source`,
  ADD KEY `idx_transactions_source` (`source`),
  ADD KEY `idx_transactions_cart_id` (`cart_id`),
  ADD CONSTRAINT `fk_transactions_cart` FOREIGN KEY (`cart_id`) REFERENCES `carts` (`id`);
