-- Migration: Add 'processing' status to wallet_transactions ENUM
-- This allows transactions to show 'processing' when payment is received but held in escrow

USE chiwaya_db;

-- Modify the ENUM to include 'processing'
ALTER TABLE wallet_transactions 
MODIFY COLUMN status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'pending';
