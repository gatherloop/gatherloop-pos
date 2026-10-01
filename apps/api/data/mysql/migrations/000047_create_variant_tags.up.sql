CREATE TABLE IF NOT EXISTS `variant_tags` (
    `variant_id` BIGINT   NOT NULL,
    `tag_id`     BIGINT   NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`variant_id`, `tag_id`),
    KEY `idx_variant_tags_tag_id` (`tag_id`),
    CONSTRAINT `fk_variant_tags_variant` FOREIGN KEY (`variant_id`) REFERENCES `variants` (`id`),
    CONSTRAINT `fk_variant_tags_tag` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
