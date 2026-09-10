CREATE TABLE IF NOT EXISTS `customers` (
    `id`         BIGINT      NOT NULL AUTO_INCREMENT,
    `session_id` CHAR(36)    NOT NULL,
    `name`       VARCHAR(60) NOT NULL,
    `created_at` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` DATETIME    NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_customers_session_id` (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
