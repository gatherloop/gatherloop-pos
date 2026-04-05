CREATE TABLE IF NOT EXISTS `checklist_sessions` (
    `id`                      BIGINT   NOT NULL AUTO_INCREMENT,
    `checklist_template_id`   BIGINT   NOT NULL,
    `date`                    DATE     NOT NULL,
    `completed_at`            DATETIME NULL,
    `created_at`              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at`              DATETIME NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_checklist_sessions_template_date` (`checklist_template_id`, `date`),
    KEY `idx_checklist_sessions_template_id` (`checklist_template_id`),
    KEY `idx_checklist_sessions_date` (`date`),
    CONSTRAINT `fk_checklist_sessions_template` FOREIGN KEY (`checklist_template_id`) REFERENCES `checklist_templates` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `checklist_session_items` (
    `id`                          BIGINT       NOT NULL AUTO_INCREMENT,
    `checklist_session_id`        BIGINT       NOT NULL,
    `checklist_template_item_id`  BIGINT       NULL,
    `name`                        VARCHAR(255) NOT NULL,
    `description`                 TEXT         NULL,
    `display_order`               INT          NOT NULL DEFAULT 0,
    `completed_at`                DATETIME     NULL,
    `created_at`                  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`                  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_checklist_session_items_session_id` (`checklist_session_id`),
    CONSTRAINT `fk_checklist_session_items_session` FOREIGN KEY (`checklist_session_id`) REFERENCES `checklist_sessions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `checklist_session_sub_items` (
    `id`                              BIGINT       NOT NULL AUTO_INCREMENT,
    `checklist_session_item_id`       BIGINT       NOT NULL,
    `checklist_template_sub_item_id`  BIGINT       NULL,
    `name`                            VARCHAR(255) NOT NULL,
    `display_order`                   INT          NOT NULL DEFAULT 0,
    `completed_at`                    DATETIME     NULL,
    `created_at`                      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`                      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_checklist_session_sub_items_item_id` (`checklist_session_item_id`),
    CONSTRAINT `fk_checklist_session_sub_items_item` FOREIGN KEY (`checklist_session_item_id`) REFERENCES `checklist_session_items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
