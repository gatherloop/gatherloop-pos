CREATE TABLE IF NOT EXISTS `transaction_item_values` (
    `id`                  BIGINT       NOT NULL AUTO_INCREMENT,
    `transaction_item_id` BIGINT       NOT NULL,
    `option_name`         VARCHAR(255) NOT NULL,
    `option_value_name`   VARCHAR(255) NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_transaction_item_values_transaction_item_id` (`transaction_item_id`),
    CONSTRAINT `fk_transaction_item_values_transaction_item`
        FOREIGN KEY (`transaction_item_id`) REFERENCES `transaction_items` (`id`)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Backfill snapshots for existing transaction items from the current
-- variant_values graph so historical receipts keep showing their options.
INSERT INTO `transaction_item_values` (`transaction_item_id`, `option_name`, `option_value_name`)
SELECT ti.`id`, o.`name`, ov.`name`
FROM `transaction_items` ti
JOIN `variant_values`  vv ON vv.`variant_id`      = ti.`variant_id`
JOIN `option_values`   ov ON ov.`id`              = vv.`option_value_id`
JOIN `options`         o  ON o.`id`               = ov.`option_id`;
