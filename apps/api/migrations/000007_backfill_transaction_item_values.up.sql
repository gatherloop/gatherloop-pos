-- Backfill transaction_item_values for transaction items that are still
-- missing their option / option-value snapshot. Migration 000005 backfilled
-- once at table creation, but transactions created afterwards skipped the
-- snapshot due to a GORM cascade gap on CreateTransaction, leaving a mix of
-- backfilled and empty items. This re-runs the same snapshot only for items
-- that currently have no rows in transaction_item_values, so already-filled
-- items are untouched.
INSERT INTO `transaction_item_values` (`transaction_item_id`, `option_name`, `option_value_name`)
SELECT ti.`id`, o.`name`, ov.`name`
FROM `transaction_items` ti
JOIN `variant_values`  vv ON vv.`variant_id`      = ti.`variant_id`
JOIN `option_values`   ov ON ov.`id`              = vv.`option_value_id`
JOIN `options`         o  ON o.`id`               = ov.`option_id`
WHERE NOT EXISTS (
    SELECT 1 FROM `transaction_item_values` tiv
    WHERE tiv.`transaction_item_id` = ti.`id`
);
