ALTER TABLE materials
    ADD COLUMN purchase_unit VARCHAR(64) NULL,
    ADD COLUMN purchase_unit_size FLOAT NULL,
    ADD COLUMN minimum_stock INT NULL,
    ADD COLUMN normal_stock INT NULL;

UPDATE materials
SET
    purchase_unit = unit,
    purchase_unit_size = 1,
    minimum_stock = 0,
    normal_stock = 0
WHERE purchase_unit IS NULL;

ALTER TABLE materials
    MODIFY COLUMN purchase_unit VARCHAR(64) NOT NULL DEFAULT '',
    MODIFY COLUMN purchase_unit_size FLOAT NOT NULL DEFAULT 1,
    MODIFY COLUMN minimum_stock INT NOT NULL DEFAULT 0,
    MODIFY COLUMN normal_stock INT NOT NULL DEFAULT 0;
