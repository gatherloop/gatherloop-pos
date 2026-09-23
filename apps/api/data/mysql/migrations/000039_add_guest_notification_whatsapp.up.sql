ALTER TABLE guest_notifications
  ADD COLUMN whatsapp_number     VARCHAR(16) NULL AFTER session_id,
  ADD COLUMN provider_message_id VARCHAR(64) NULL AFTER detail;
