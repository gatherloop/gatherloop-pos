-- 000001_initial_schema.down.sql
-- Drop all tables in reverse FK dependency order

DROP TABLE IF EXISTS `rentals`;
DROP TABLE IF EXISTS `calculation_items`;
DROP TABLE IF EXISTS `calculations`;
DROP TABLE IF EXISTS `expense_items`;
DROP TABLE IF EXISTS `expenses`;
DROP TABLE IF EXISTS `transaction_coupons`;
DROP TABLE IF EXISTS `transaction_items`;
DROP TABLE IF EXISTS `transactions`;
DROP TABLE IF EXISTS `wallet_transfers`;
DROP TABLE IF EXISTS `variant_values`;
DROP TABLE IF EXISTS `variant_materials`;
DROP TABLE IF EXISTS `variants`;
DROP TABLE IF EXISTS `option_values`;
DROP TABLE IF EXISTS `options`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `coupons`;
DROP TABLE IF EXISTS `budgets`;
DROP TABLE IF EXISTS `wallets`;
DROP TABLE IF EXISTS `suppliers`;
DROP TABLE IF EXISTS `materials`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `users`;
