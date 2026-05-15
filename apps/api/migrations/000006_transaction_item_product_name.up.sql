ALTER TABLE transaction_items ADD COLUMN product_name VARCHAR(191) NOT NULL DEFAULT '';

UPDATE transaction_items ti
JOIN variants v ON ti.variant_id = v.id
JOIN products p ON v.product_id = p.id
SET ti.product_name = p.name
WHERE ti.product_name = '';
