ALTER TABLE payments
  ADD COLUMN access_key CHAR(22) NULL AFTER partner_reference_no;
