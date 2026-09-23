ALTER TABLE customers
  ADD COLUMN whatsapp_number VARCHAR(16) NULL AFTER name;
ALTER TABLE payments
  ADD COLUMN customer_whatsapp_number VARCHAR(16) NULL AFTER session_id;
