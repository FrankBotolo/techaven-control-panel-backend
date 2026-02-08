-- Migration: Add is_new_arrival column to products table
-- Run this script to add new arrival flag to products
-- Note: If column already exists, you can ignore the error

USE chiwaya_db;

-- Add is_new_arrival column to products table
-- This will error if column already exists - that's okay, just ignore it
ALTER TABLE products 
ADD COLUMN is_new_arrival BOOLEAN DEFAULT FALSE AFTER is_special;

-- Add index for better query performance
-- This will error if index already exists - that's okay, just ignore it
ALTER TABLE products 
ADD INDEX idx_new_arrival (is_new_arrival);

