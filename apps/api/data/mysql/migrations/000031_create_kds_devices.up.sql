CREATE TABLE kds_devices (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  push_token  VARCHAR(255) NOT NULL,
  platform    VARCHAR(20)  NOT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP   NULL,
  deleted_at  TIMESTAMP    NULL,
  UNIQUE KEY uq_kds_devices_push_token (push_token)
);
