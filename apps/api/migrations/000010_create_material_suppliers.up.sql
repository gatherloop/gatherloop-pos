CREATE TABLE material_suppliers (
  id           BIGINT       PRIMARY KEY AUTO_INCREMENT,
  material_id  BIGINT       NOT NULL,
  supplier_id  BIGINT       NOT NULL,
  purchase_type ENUM('online','offline','delivery') NOT NULL,
  purchase_url VARCHAR(2048) NOT NULL DEFAULT '',
  created_at   DATETIME     NOT NULL,
  deleted_at   DATETIME     NULL,
  INDEX idx_material (material_id),
  INDEX idx_supplier (supplier_id),
  UNIQUE KEY uq_material_supplier_type (material_id, supplier_id, purchase_type, deleted_at)
);
