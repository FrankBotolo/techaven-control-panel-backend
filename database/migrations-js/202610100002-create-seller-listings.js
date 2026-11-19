export async function up({ sequelize, transaction }) {
  const statements = [
    `CREATE TABLE seller_listings (
      id INT AUTO_INCREMENT PRIMARY KEY, shop_id INT NOT NULL, device_variant_id INT NOT NULL,
      device_variant_color_id INT NULL, merchant_sku VARCHAR(180) NULL,
      \`condition\` ENUM('new','used','refurbished','open_box') NOT NULL,
      currency CHAR(3) NOT NULL DEFAULT 'MWK', price DECIMAL(12,2) NOT NULL, quantity INT UNSIGNED NOT NULL DEFAULT 0,
      warranty_months INT UNSIGNED NULL, status ENUM('draft','active','paused','archived') NOT NULL DEFAULT 'draft',
      active_identity VARCHAR(500) NULL UNIQUE, published_at DATETIME NULL, createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL,
      CONSTRAINT fk_listings_shop FOREIGN KEY (shop_id) REFERENCES shops(id),
      CONSTRAINT fk_listings_variant FOREIGN KEY (device_variant_id) REFERENCES device_variants(id),
      CONSTRAINT fk_listings_color FOREIGN KEY (device_variant_color_id) REFERENCES device_variant_colors(id),
      CONSTRAINT chk_listings_price CHECK (price > 0),
      INDEX idx_listings_shop (shop_id), INDEX idx_listings_variant (device_variant_id),
      INDEX idx_listings_color (device_variant_color_id), INDEX idx_listings_status_price (status, price),
      UNIQUE KEY uq_shop_merchant_sku (shop_id, merchant_sku)
    ) ENGINE=InnoDB`,
    `CREATE TABLE listing_images (
      id INT AUTO_INCREMENT PRIMARY KEY, listing_id INT NOT NULL, storage_key VARCHAR(500) NULL, url TEXT NULL,
      alt_text VARCHAR(255) NULL, sort_order INT UNSIGNED NOT NULL DEFAULT 0, is_primary BOOLEAN NOT NULL DEFAULT FALSE,
      createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL,
      CONSTRAINT fk_listing_images_listing FOREIGN KEY (listing_id) REFERENCES seller_listings(id) ON DELETE CASCADE,
      INDEX idx_listing_images_listing (listing_id)
    ) ENGINE=InnoDB`,
    `CREATE TABLE catalogue_product_requests (
      id INT AUTO_INCREMENT PRIMARY KEY, shop_id INT NOT NULL, requested_by INT NOT NULL,
      brand VARCHAR(160) NOT NULL, model VARCHAR(220) NOT NULL, model_number VARCHAR(160) NULL,
      ram_gb DECIMAL(8,2) NULL, storage_gb INT UNSIGNED NULL, network_generation VARCHAR(40) NULL,
      notes TEXT NULL, proof_url TEXT NULL, status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
      reviewed_by INT NULL, reviewed_at DATETIME NULL, resolution_notes TEXT NULL,
      createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL,
      CONSTRAINT fk_product_requests_shop FOREIGN KEY (shop_id) REFERENCES shops(id),
      CONSTRAINT fk_product_requests_user FOREIGN KEY (requested_by) REFERENCES users(id),
      CONSTRAINT fk_product_requests_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id),
      INDEX idx_product_requests_status (status), INDEX idx_product_requests_shop (shop_id)
    ) ENGINE=InnoDB`
  ];
  for (const statement of statements) await sequelize.query(statement, { transaction });
}

export async function down({ sequelize, transaction }) {
  for (const table of ['catalogue_product_requests', 'listing_images', 'seller_listings']) {
    await sequelize.query(`DROP TABLE IF EXISTS ${table}`, { transaction });
  }
}
