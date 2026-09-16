CREATE TABLE IF NOT EXISTS `availability_movements` (
    `id`                  BIGINT      NOT NULL AUTO_INCREMENT,
    `product_id`          BIGINT      NULL,
    `variant_id`          BIGINT      NULL,
    `delta`               INT         NULL,
    `resulting_quantity`  INT         NULL,
    `reason`              ENUM('sale','sale_reversal','manual_set','manual_adjust','switched_off','switched_on') NOT NULL,
    `transaction_id`      BIGINT      NULL,
    `note`                VARCHAR(255) NOT NULL DEFAULT '',
    `created_at`          DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_availability_movements_product_id` (`product_id`, `created_at`),
    KEY `idx_availability_movements_variant_id` (`variant_id`, `created_at`),
    CONSTRAINT `fk_availability_movements_product`     FOREIGN KEY (`product_id`)     REFERENCES `products`     (`id`),
    CONSTRAINT `fk_availability_movements_variant`     FOREIGN KEY (`variant_id`)     REFERENCES `variants`     (`id`),
    CONSTRAINT `fk_availability_movements_transaction`  FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
