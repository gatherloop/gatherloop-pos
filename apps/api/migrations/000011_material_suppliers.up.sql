CREATE TABLE IF NOT EXISTS `material_suppliers` (
    `id`          BIGINT   NOT NULL AUTO_INCREMENT,
    `material_id` BIGINT   NOT NULL,
    `supplier_id` BIGINT   NOT NULL,
    `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_material_suppliers` (`material_id`, `supplier_id`),
    KEY `idx_material_suppliers_material_id` (`material_id`),
    KEY `idx_material_suppliers_supplier_id` (`supplier_id`),
    CONSTRAINT `fk_material_suppliers_material` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`),
    CONSTRAINT `fk_material_suppliers_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
