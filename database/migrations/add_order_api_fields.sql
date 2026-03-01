-- Migration: Add order fields for API doc (shipping_address_id, subtotal, shipping_fee, payment_method as string)
-- Run after add_shipping_addresses.sql so shipping_addresses table exists.

-- MySQL example (adjust if using SQLite):
-- ALTER TABLE orders ADD COLUMN shipping_address_id INT NULL REFERENCES shipping_addresses(id);
-- ALTER TABLE orders ADD COLUMN subtotal DECIMAL(12,2) NULL;
-- ALTER TABLE orders ADD COLUMN shipping_fee DECIMAL(12,2) NULL DEFAULT 0;
-- If payment_method was ENUM, change to VARCHAR: ALTER TABLE orders MODIFY payment_method VARCHAR(50) NULL;

-- SQLite:
-- ALTER TABLE orders ADD COLUMN shipping_address_id INTEGER REFERENCES shipping_addresses(id);
-- ALTER TABLE orders ADD COLUMN subtotal REAL;
-- ALTER TABLE orders ADD COLUMN shipping_fee REAL DEFAULT 0;
