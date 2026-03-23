-- Product variants (JSON) and explicit new-arrival flag.
-- If columns already exist, skip the failing line(s).

ALTER TABLE products ADD COLUMN variants JSON NULL COMMENT 'Option groups: color, storage, etc.' AFTER specifications;
ALTER TABLE products ADD COLUMN is_new_arrival TINYINT(1) NOT NULL DEFAULT 0 AFTER is_special;
