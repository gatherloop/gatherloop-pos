CREATE TABLE IF NOT EXISTS `tables` (
    `id`         BIGINT      NOT NULL AUTO_INCREMENT,
    `code`       VARCHAR(16) NOT NULL,
    `label`      VARCHAR(64) NOT NULL,
    `created_at` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `deleted_at` DATETIME    NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_tables_code` (`code`),
    UNIQUE KEY `uq_tables_label` (`label`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
