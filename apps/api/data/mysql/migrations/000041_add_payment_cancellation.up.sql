ALTER TABLE payments
  ADD COLUMN cancelled_at  DATETIME    NULL AFTER paid_at,
  ADD COLUMN cancel_reason VARCHAR(16) NULL AFTER cancelled_at;
