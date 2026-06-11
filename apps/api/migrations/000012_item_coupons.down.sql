DELETE FROM coupons WHERE code IN ('FREE 1 HOUR','FREE 2 HOUR','STUDENT DISCOUNT');

ALTER TABLE transaction_coupons
  DROP FOREIGN KEY fk_tc_transaction_item,
  DROP KEY idx_tc_transaction_item_id,
  DROP COLUMN transaction_item_id;
