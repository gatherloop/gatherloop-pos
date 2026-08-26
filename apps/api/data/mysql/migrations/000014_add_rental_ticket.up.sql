ALTER TABLE `rentals`
  ADD COLUMN `ticket_id`   BIGINT       NULL,
  ADD COLUMN `ticket_name` VARCHAR(255) NULL,
  ADD KEY `idx_rentals_ticket_id` (`ticket_id`),
  ADD CONSTRAINT `fk_rentals_ticket`
      FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`);
