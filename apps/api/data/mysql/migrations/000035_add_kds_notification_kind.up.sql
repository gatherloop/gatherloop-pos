ALTER TABLE kds_notifications
  ADD COLUMN kind VARCHAR(20) NOT NULL DEFAULT 'order_paid' AFTER transaction_id;

ALTER TABLE kds_notifications
  DROP INDEX uq_kds_notifications_transaction,
  ADD UNIQUE KEY uq_kds_notifications_transaction_kind (transaction_id, kind);
