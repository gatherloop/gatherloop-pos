UPDATE `products` SET `description` = `recipe` WHERE `description` IS NULL;
UPDATE `variants` SET `description` = `recipe` WHERE `description` IS NULL;
ALTER TABLE `products` DROP COLUMN `recipe`;
ALTER TABLE `variants` DROP COLUMN `recipe`;
