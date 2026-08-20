ALTER TABLE `products` ADD COLUMN `recipe` TEXT NULL AFTER `description`;
ALTER TABLE `variants` ADD COLUMN `recipe` TEXT NULL AFTER `description`;

UPDATE `products` SET `recipe` = `description`
  WHERE `description` IS NOT NULL AND `description` <> '';
UPDATE `variants` SET `recipe` = `description`
  WHERE `description` IS NOT NULL AND `description` <> '';

UPDATE `products` SET `description` = NULL;
UPDATE `variants` SET `description` = NULL;
