CREATE TABLE IF NOT EXISTS `whatsapp_number_verifications` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT,
    `whatsapp_number` VARCHAR(16)  NOT NULL,
    `verified_at`     DATETIME     NOT NULL,
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_whatsapp_number_verifications_number` (`whatsapp_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
