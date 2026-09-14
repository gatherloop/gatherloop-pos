ALTER TABLE `transactions`
  DROP KEY `uq_transactions_date_number`;

DROP TABLE `transaction_number_counters`;

ALTER TABLE `transactions`
  DROP COLUMN `transaction_number`;
