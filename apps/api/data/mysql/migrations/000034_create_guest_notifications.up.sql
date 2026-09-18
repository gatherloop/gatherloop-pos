CREATE TABLE guest_notifications (
  id             BIGINT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
  transaction_id BIGINT      NOT NULL,
  session_id     CHAR(36)    NOT NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'pending',
  attempt_count  INT         NOT NULL DEFAULT 0,
  detail         TEXT        NULL,
  created_at     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at        TIMESTAMP   NULL,
  UNIQUE KEY uq_guest_notifications_transaction (transaction_id),
  KEY idx_guest_notifications_status (status, created_at)
);
