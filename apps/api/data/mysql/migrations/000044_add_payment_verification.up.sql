ALTER TABLE `payments`
  ADD COLUMN `verification_status` VARCHAR(16) NULL AFTER `status`,
  ADD COLUMN `verified_at`         DATETIME    NULL AFTER `verification_status`;

CREATE TABLE `payment_verification_photos` (
  `payment_id`   BIGINT      NOT NULL,
  `content_type` VARCHAR(32) NOT NULL,
  `byte_size`    INT         NOT NULL,
  `data`         MEDIUMBLOB  NOT NULL,
  `created_at`   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`payment_id`),
  CONSTRAINT `fk_payment_verification_photos_payment`
    FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
