DROP TABLE IF EXISTS `payment_verification_photos`;

ALTER TABLE `payments`
  DROP COLUMN `verified_at`,
  DROP COLUMN `verification_status`;
