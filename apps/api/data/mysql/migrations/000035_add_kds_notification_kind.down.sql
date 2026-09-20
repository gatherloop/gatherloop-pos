ALTER TABLE kds_notifications
  DROP INDEX uq_kds_notifications_transaction_kind,
  ADD UNIQUE KEY uq_kds_notifications_transaction (transaction_id);

ALTER TABLE kds_notifications
  DROP COLUMN kind;
