ALTER TABLE `transactions`
  ADD COLUMN `completed_at` TIMESTAMP NULL AFTER `paid_at`,
  ADD KEY `idx_transactions_source_completed_at` (`source`, `completed_at`);
