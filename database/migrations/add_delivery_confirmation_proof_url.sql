-- Optional URL (e.g. uploaded image/PDF) when customer confirms delivery — MySQL
-- ALTER only if the column does not exist.

ALTER TABLE orders
  ADD COLUMN delivery_confirmation_proof_url VARCHAR(2048) NULL
  COMMENT 'Optional customer proof file URL when confirming delivery'
  AFTER delivery_confirmed_at;
