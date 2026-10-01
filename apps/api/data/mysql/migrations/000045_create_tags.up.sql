CREATE TABLE IF NOT EXISTS `tags` (
    `id`             BIGINT       NOT NULL AUTO_INCREMENT,
    `name`           VARCHAR(100) NOT NULL,
    `color`          VARCHAR(20)  NOT NULL DEFAULT 'gray',
    `is_highlighted` TINYINT(1)   NOT NULL DEFAULT 0,
    `sort_order`     INT          NOT NULL DEFAULT 0,
    `created_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_tags_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
