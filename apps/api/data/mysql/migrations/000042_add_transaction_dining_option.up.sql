ALTER TABLE `transactions`
  ADD COLUMN `dining_option` VARCHAR(16) NOT NULL DEFAULT 'dine_in' AFTER `source`;
