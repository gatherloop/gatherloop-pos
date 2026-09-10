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
