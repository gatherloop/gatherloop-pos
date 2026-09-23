CREATE TABLE web_push_subscriptions (
  id           BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_id   CHAR(36)     NOT NULL,
  endpoint     VARCHAR(512) NOT NULL,
  p256dh_key   VARCHAR(255) NOT NULL,
  auth_key     VARCHAR(255) NOT NULL,
  user_agent   VARCHAR(255) NOT NULL DEFAULT '',
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP    NULL,
  deleted_at   TIMESTAMP    NULL,
  UNIQUE KEY uq_web_push_subscriptions_endpoint (endpoint),
  KEY idx_web_push_subscriptions_session (session_id, deleted_at)
);
