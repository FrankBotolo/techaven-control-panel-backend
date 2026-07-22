-- Malipo aggregator removed in favor of direct Airtel Money integration (MySQL)
-- Run: mysql -u ... -p your_db < database/migrations/drop_malipo_transactions.sql

DROP TABLE IF EXISTS malipo_transactions;
