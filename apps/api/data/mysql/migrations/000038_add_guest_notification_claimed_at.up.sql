ALTER TABLE guest_notifications
  ADD COLUMN claimed_at TIMESTAMP NULL AFTER attempt_count;
