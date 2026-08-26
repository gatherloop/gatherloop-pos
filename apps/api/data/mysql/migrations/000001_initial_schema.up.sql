-- 000001_initial_schema.up.sql
-- Initial schema for gatherloop-pos, created in FK dependency order

CREATE TABLE IF NOT EXISTS `users` (
    `id`         BIGINT       NOT NULL AUTO_INCREMENT,
    `username`   VARCHAR(255) NOT NULL,
    `password`   VARCHAR(255) NOT NULL,
    `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `deleted_at` DATETIME     NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_users_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `categories` (
    `id`         BIGINT       NOT NULL AUTO_INCREMENT,
    `name`       VARCHAR(255) NOT NULL,
    `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `deleted_at` DATETIME     NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `materials` (
    `id`          BIGINT       NOT NULL AUTO_INCREMENT,
    `name`        VARCHAR(255) NOT NULL,
    `price`       FLOAT        NOT NULL DEFAULT 0,
    `unit`        VARCHAR(255) NOT NULL,
    `description` TEXT         NULL,
    `deleted_at`  DATETIME     NULL,
    `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `suppliers` (
    `id`         BIGINT       NOT NULL AUTO_INCREMENT,
    `name`       VARCHAR(255) NOT NULL,
    `phone`      VARCHAR(255) NULL,
    `address`    VARCHAR(255) NOT NULL DEFAULT '',
    `maps_link`  VARCHAR(255) NOT NULL DEFAULT '',
    `deleted_at` DATETIME     NULL,
    `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `wallets` (
    `id`                      BIGINT       NOT NULL AUTO_INCREMENT,
    `name`                    VARCHAR(255) NOT NULL,
    `balance`                 FLOAT        NOT NULL DEFAULT 0,
    `payment_cost_percentage` FLOAT        NOT NULL DEFAULT 0,
    `is_cashless`             TINYINT(1)   NOT NULL DEFAULT 0,
    `deleted_at`              DATETIME     NULL,
    `created_at`              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `budgets` (
    `id`         BIGINT       NOT NULL AUTO_INCREMENT,
    `name`       VARCHAR(255) NOT NULL,
    `percentage` FLOAT        NOT NULL DEFAULT 0,
    `balance`    FLOAT        NOT NULL DEFAULT 0,
    `deleted_at` DATETIME     NULL,
    `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `coupons` (
    `id`         BIGINT       NOT NULL AUTO_INCREMENT,
    `code`       VARCHAR(255) NOT NULL,
    `type`       VARCHAR(50)  NOT NULL,
    `amount`     BIGINT       NOT NULL DEFAULT 0,
    `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `deleted_at` DATETIME     NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_coupons_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `products` (
    `id`          BIGINT       NOT NULL AUTO_INCREMENT,
    `category_id` BIGINT       NOT NULL,
    `name`        VARCHAR(255) NOT NULL,
    `description` TEXT         NULL,
    `image_url`   VARCHAR(255) NOT NULL DEFAULT '',
    `sale_type`   VARCHAR(50)  NOT NULL DEFAULT '',
    `deleted_at`  DATETIME     NULL,
    `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_products_category_id` (`category_id`),
    CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `options` (
    `id`         BIGINT       NOT NULL AUTO_INCREMENT,
    `product_id` BIGINT       NOT NULL,
    `name`       VARCHAR(255) NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_options_product_id` (`product_id`),
    CONSTRAINT `fk_options_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `option_values` (
    `id`        BIGINT       NOT NULL AUTO_INCREMENT,
    `option_id` BIGINT       NOT NULL,
    `name`      VARCHAR(255) NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_option_values_option_id` (`option_id`),
    CONSTRAINT `fk_option_values_option` FOREIGN KEY (`option_id`) REFERENCES `options` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `variants` (
    `id`          BIGINT       NOT NULL AUTO_INCREMENT,
    `product_id`  BIGINT       NOT NULL,
    `name`        VARCHAR(255) NOT NULL,
    `price`       FLOAT        NOT NULL DEFAULT 0,
    `description` TEXT         NULL,
    `deleted_at`  DATETIME     NULL,
    `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_variants_product_id` (`product_id`),
    CONSTRAINT `fk_variants_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `variant_materials` (
    `id`          BIGINT   NOT NULL AUTO_INCREMENT,
    `variant_id`  BIGINT   NOT NULL,
    `material_id` BIGINT   NOT NULL,
    `amount`      FLOAT    NOT NULL DEFAULT 0,
    `deleted_at`  DATETIME NULL,
    `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_variant_materials_variant_id` (`variant_id`),
    KEY `idx_variant_materials_material_id` (`material_id`),
    CONSTRAINT `fk_variant_materials_variant`  FOREIGN KEY (`variant_id`)  REFERENCES `variants`  (`id`),
    CONSTRAINT `fk_variant_materials_material` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `variant_values` (
    `id`              BIGINT NOT NULL AUTO_INCREMENT,
    `variant_id`      BIGINT NOT NULL,
    `option_value_id` BIGINT NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_variant_values_variant_id`      (`variant_id`),
    KEY `idx_variant_values_option_value_id` (`option_value_id`),
    CONSTRAINT `fk_variant_values_variant`      FOREIGN KEY (`variant_id`)      REFERENCES `variants`      (`id`),
    CONSTRAINT `fk_variant_values_option_value` FOREIGN KEY (`option_value_id`) REFERENCES `option_values` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `wallet_transfers` (
    `id`             BIGINT   NOT NULL AUTO_INCREMENT,
    `created_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `amount`         FLOAT    NOT NULL DEFAULT 0,
    `from_wallet_id` BIGINT   NOT NULL,
    `to_wallet_id`   BIGINT   NOT NULL,
    `deleted_at`     DATETIME NULL,
    PRIMARY KEY (`id`),
    KEY `idx_wallet_transfers_from_wallet_id` (`from_wallet_id`),
    KEY `idx_wallet_transfers_to_wallet_id`   (`to_wallet_id`),
    CONSTRAINT `fk_wallet_transfers_from_wallet` FOREIGN KEY (`from_wallet_id`) REFERENCES `wallets` (`id`),
    CONSTRAINT `fk_wallet_transfers_to_wallet`   FOREIGN KEY (`to_wallet_id`)   REFERENCES `wallets` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `transactions` (
    `id`           BIGINT       NOT NULL AUTO_INCREMENT,
    `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `name`         VARCHAR(255) NOT NULL DEFAULT '',
    `order_number` BIGINT       NOT NULL DEFAULT 0,
    `wallet_id`    BIGINT       NULL,
    `total`        FLOAT        NOT NULL DEFAULT 0,
    `total_income` FLOAT        NOT NULL DEFAULT 0,
    `paid_amount`  FLOAT        NOT NULL DEFAULT 0,
    `paid_at`      DATETIME     NULL,
    `deleted_at`   DATETIME     NULL,
    PRIMARY KEY (`id`),
    KEY `idx_transactions_wallet_id` (`wallet_id`),
    CONSTRAINT `fk_transactions_wallet` FOREIGN KEY (`wallet_id`) REFERENCES `wallets` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `transaction_items` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT,
    `transaction_id`  BIGINT       NOT NULL,
    `variant_id`      BIGINT       NOT NULL,
    `amount`          FLOAT        NOT NULL DEFAULT 0,
    `price`           FLOAT        NOT NULL DEFAULT 0,
    `discount_amount` FLOAT        NOT NULL DEFAULT 0,
    `subtotal`        FLOAT        NOT NULL DEFAULT 0,
    `rental_id`       BIGINT       NULL,
    `note`            VARCHAR(255) NOT NULL DEFAULT '',
    PRIMARY KEY (`id`),
    KEY `idx_transaction_items_transaction_id` (`transaction_id`),
    KEY `idx_transaction_items_variant_id`     (`variant_id`),
    CONSTRAINT `fk_transaction_items_transaction` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`),
    CONSTRAINT `fk_transaction_items_variant`     FOREIGN KEY (`variant_id`)     REFERENCES `variants`     (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `transaction_coupons` (
    `id`             BIGINT      NOT NULL AUTO_INCREMENT,
    `transaction_id` BIGINT      NOT NULL,
    `coupon_id`      BIGINT      NOT NULL,
    `type`           VARCHAR(50) NOT NULL DEFAULT '',
    `amount`         BIGINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_transaction_coupons_transaction_id` (`transaction_id`),
    KEY `idx_transaction_coupons_coupon_id`      (`coupon_id`),
    CONSTRAINT `fk_transaction_coupons_transaction` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`),
    CONSTRAINT `fk_transaction_coupons_coupon`      FOREIGN KEY (`coupon_id`)      REFERENCES `coupons`      (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `expenses` (
    `id`         BIGINT   NOT NULL AUTO_INCREMENT,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `deleted_at` DATETIME NULL,
    `wallet_id`  BIGINT   NOT NULL,
    `budget_id`  BIGINT   NOT NULL,
    `total`      FLOAT    NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_expenses_wallet_id` (`wallet_id`),
    KEY `idx_expenses_budget_id` (`budget_id`),
    CONSTRAINT `fk_expenses_wallet` FOREIGN KEY (`wallet_id`) REFERENCES `wallets` (`id`),
    CONSTRAINT `fk_expenses_budget` FOREIGN KEY (`budget_id`) REFERENCES `budgets` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `expense_items` (
    `id`         BIGINT       NOT NULL AUTO_INCREMENT,
    `name`       VARCHAR(255) NOT NULL,
    `unit`       VARCHAR(255) NOT NULL DEFAULT '',
    `price`      FLOAT        NOT NULL DEFAULT 0,
    `amount`     FLOAT        NOT NULL DEFAULT 0,
    `subtotal`   FLOAT        NOT NULL DEFAULT 0,
    `expense_id` BIGINT       NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_expense_items_expense_id` (`expense_id`),
    CONSTRAINT `fk_expense_items_expense` FOREIGN KEY (`expense_id`) REFERENCES `expenses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `calculations` (
    `id`                BIGINT   NOT NULL AUTO_INCREMENT,
    `created_at`        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at`        DATETIME NULL,
    `completed_at`      DATETIME NULL,
    `wallet_id`         BIGINT   NOT NULL,
    `total_wallet`      FLOAT    NOT NULL DEFAULT 0,
    `total_calculation` FLOAT    NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_calculations_wallet_id` (`wallet_id`),
    CONSTRAINT `fk_calculations_wallet` FOREIGN KEY (`wallet_id`) REFERENCES `wallets` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `calculation_items` (
    `id`             BIGINT NOT NULL AUTO_INCREMENT,
    `calculation_id` BIGINT NOT NULL,
    `price`          FLOAT  NOT NULL DEFAULT 0,
    `amount`         BIGINT NOT NULL DEFAULT 0,
    `subtotal`       FLOAT  NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_calculation_items_calculation_id` (`calculation_id`),
    CONSTRAINT `fk_calculation_items_calculation` FOREIGN KEY (`calculation_id`) REFERENCES `calculations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `rentals` (
    `id`          BIGINT       NOT NULL AUTO_INCREMENT,
    `code`        VARCHAR(255) NOT NULL,
    `name`        VARCHAR(255) NOT NULL,
    `variant_id`  BIGINT       NOT NULL,
    `checkin_at`  DATETIME     NOT NULL,
    `checkout_at` DATETIME     NULL,
    `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `deleted_at`  DATETIME     NULL,
    PRIMARY KEY (`id`),
    KEY `idx_rentals_variant_id` (`variant_id`),
    CONSTRAINT `fk_rentals_variant` FOREIGN KEY (`variant_id`) REFERENCES `variants` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
