CREATE TABLE IF NOT EXISTS `carts` (
    `id`         BIGINT      NOT NULL AUTO_INCREMENT,
    `session_id` CHAR(36)    NOT NULL,
    `table_id`   BIGINT      NULL,
    `status`     VARCHAR(16) NOT NULL DEFAULT 'active',
    `created_at` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` DATETIME    NULL,
    PRIMARY KEY (`id`),
    KEY `idx_carts_session_id_status` (`session_id`, `status`),
    KEY `idx_carts_table_id` (`table_id`),
    CONSTRAINT `fk_carts_table` FOREIGN KEY (`table_id`) REFERENCES `tables` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `cart_items` (
    `id`         BIGINT       NOT NULL AUTO_INCREMENT,
    `cart_id`    BIGINT       NOT NULL,
    `variant_id` BIGINT       NOT NULL,
    `amount`     FLOAT        NOT NULL DEFAULT 0,
    `note`       VARCHAR(255) NOT NULL DEFAULT '',
    `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` DATETIME     NULL,
    PRIMARY KEY (`id`),
    KEY `idx_cart_items_cart_id` (`cart_id`),
    KEY `idx_cart_items_variant_id` (`variant_id`),
    CONSTRAINT `fk_cart_items_cart`    FOREIGN KEY (`cart_id`)    REFERENCES `carts`    (`id`),
    CONSTRAINT `fk_cart_items_variant` FOREIGN KEY (`variant_id`) REFERENCES `variants` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
