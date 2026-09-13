ALTER TABLE `transactions`
  ADD COLUMN `transaction_number` BIGINT NOT NULL DEFAULT 0 AFTER `pager_number`;

UPDATE `transactions` t
  JOIN (
    SELECT `id`, ROW_NUMBER() OVER (PARTITION BY DATE(`created_at`) ORDER BY `created_at`, `id`) AS rn
    FROM `transactions`
  ) numbered ON numbered.`id` = t.`id`
  SET t.`transaction_number` = numbered.rn;

CREATE TABLE `transaction_number_counters` (
  `transaction_date` DATE   NOT NULL,
  `last_number`      BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`transaction_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `transaction_number_counters` (`transaction_date`, `last_number`)
  SELECT DATE(`created_at`), MAX(`transaction_number`)
  FROM `transactions`
  GROUP BY DATE(`created_at`);

ALTER TABLE `transactions`
  ADD UNIQUE KEY `uq_transactions_date_number` ((CAST(`created_at` AS DATE)), `transaction_number`);
