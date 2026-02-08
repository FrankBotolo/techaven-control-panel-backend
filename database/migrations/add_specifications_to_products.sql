-- Migration: Add specifications column to products table
-- Run this script to add product specifications functionality

USE chiwaya_db;

-- Add specifications column to products table
ALTER TABLE products
ADD COLUMN specifications JSON NULL AFTER vendor;

-- Note: The specifications column stores product specifications as a JSON object
-- Example: {"brand": "Apple", "model": "iPhone 14 Pro", "storage": "256GB", "color": "Deep Purple"}

