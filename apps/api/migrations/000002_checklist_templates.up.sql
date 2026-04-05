CREATE TABLE IF NOT EXISTS `checklist_templates` (
    `id`          BIGINT       NOT NULL AUTO_INCREMENT,
    `name`        VARCHAR(255) NOT NULL,
    `description` TEXT         NULL,
    `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at`  DATETIME     NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_checklist_templates_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `checklist_template_items` (
    `id`                      BIGINT       NOT NULL AUTO_INCREMENT,
    `checklist_template_id`   BIGINT       NOT NULL,
    `name`                    VARCHAR(255) NOT NULL,
    `description`             TEXT         NULL,
    `display_order`           INT          NOT NULL DEFAULT 0,
    `created_at`              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at`              DATETIME     NULL,
    PRIMARY KEY (`id`),
    KEY `idx_checklist_template_items_template_id` (`checklist_template_id`),
    CONSTRAINT `fk_checklist_template_items_template` FOREIGN KEY (`checklist_template_id`) REFERENCES `checklist_templates` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `checklist_template_sub_items` (
    `id`                          BIGINT       NOT NULL AUTO_INCREMENT,
    `checklist_template_item_id`  BIGINT       NOT NULL,
    `name`                        VARCHAR(255) NOT NULL,
    `display_order`               INT          NOT NULL DEFAULT 0,
    `created_at`                  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`                  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at`                  DATETIME     NULL,
    PRIMARY KEY (`id`),
    KEY `idx_checklist_template_sub_items_item_id` (`checklist_template_item_id`),
    CONSTRAINT `fk_checklist_template_sub_items_item` FOREIGN KEY (`checklist_template_item_id`) REFERENCES `checklist_template_items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
