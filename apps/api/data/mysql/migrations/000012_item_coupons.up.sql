ALTER TABLE transaction_coupons
  ADD COLUMN transaction_item_id BIGINT NULL,
  ADD KEY idx_tc_transaction_item_id (transaction_item_id),
  ADD CONSTRAINT fk_tc_transaction_item
      FOREIGN KEY (transaction_item_id) REFERENCES transaction_items(id);

INSERT INTO coupons (code, type, amount)
SELECT * FROM (
  SELECT 'FREE 1 HOUR'      AS code, 'fixed'      AS type, 15000 AS amount UNION ALL
  SELECT 'FREE 2 HOUR',           'fixed',            30000 UNION ALL
  SELECT 'STUDENT DISCOUNT',      'percentage',          40
) seed
WHERE NOT EXISTS (SELECT 1 FROM coupons c WHERE c.code = seed.code);
