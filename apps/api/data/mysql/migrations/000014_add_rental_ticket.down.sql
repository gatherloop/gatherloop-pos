ALTER TABLE `rentals`
  DROP FOREIGN KEY `fk_rentals_ticket`,
  DROP KEY `idx_rentals_ticket_id`,
  DROP COLUMN `ticket_name`,
  DROP COLUMN `ticket_id`;
