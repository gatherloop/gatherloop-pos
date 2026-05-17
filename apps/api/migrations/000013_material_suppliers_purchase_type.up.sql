ALTER TABLE `material_suppliers`
  ADD COLUMN `purchase_type` ENUM('offline', 'online', 'delivery') NOT NULL DEFAULT 'offline',
  ADD COLUMN `purchase_url` VARCHAR(500) NULL;
