CREATE TABLE IF NOT EXISTS `tickets` (
    `id`         BIGINT       NOT NULL AUTO_INCREMENT,
    `code`       VARCHAR(255) NOT NULL,
    `name`       VARCHAR(255) NOT NULL,
    `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `deleted_at` DATETIME     NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_tickets_code` (`code`),
    UNIQUE KEY `uq_tickets_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
