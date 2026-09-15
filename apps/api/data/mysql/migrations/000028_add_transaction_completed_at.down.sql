ALTER TABLE `transactions`
  DROP KEY `idx_transactions_source_completed_at`,
  DROP COLUMN `completed_at`;
