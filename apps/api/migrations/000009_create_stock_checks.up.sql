CREATE TABLE stock_checks (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    check_date DATE         NOT NULL,
    note       TEXT         NULL,
    created_by BIGINT       NOT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME     NULL
);

CREATE TABLE stock_check_items (
    id                        BIGINT       AUTO_INCREMENT PRIMARY KEY,
    stock_check_id            BIGINT       NOT NULL,
    material_id               BIGINT       NOT NULL,
    current_stock             INT          NOT NULL DEFAULT 0,
    material_name             VARCHAR(255) NOT NULL DEFAULT '',
    price_snapshot            FLOAT        NOT NULL DEFAULT 0,
    purchase_unit_snapshot    VARCHAR(64)  NOT NULL DEFAULT '',
    purchase_unit_size_snapshot FLOAT      NOT NULL DEFAULT 1,
    minimum_stock_snapshot    INT          NOT NULL DEFAULT 0,
    normal_stock_snapshot     INT          NOT NULL DEFAULT 0,
    created_at                DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_stock_check_items_stock_check FOREIGN KEY (stock_check_id) REFERENCES stock_checks(id) ON DELETE CASCADE,
    CONSTRAINT fk_stock_check_items_material    FOREIGN KEY (material_id)    REFERENCES materials(id)
);
