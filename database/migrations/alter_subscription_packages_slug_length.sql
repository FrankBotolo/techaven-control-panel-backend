-- Widen slug: long alphanumeric slugs exceeded VARCHAR(80).
-- Run after backup if the table already exists.

ALTER TABLE subscription_packages
  MODIFY COLUMN slug VARCHAR(191) NOT NULL;
