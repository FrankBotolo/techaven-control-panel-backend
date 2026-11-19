export async function up({ sequelize, transaction }) {
  const statements = [
    `CREATE TABLE brands (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(160) NOT NULL, slug VARCHAR(180) NOT NULL UNIQUE, is_active BOOLEAN NOT NULL DEFAULT TRUE, source_metadata JSON NULL, createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL) ENGINE=InnoDB`,
    `CREATE TABLE devices (
      id INT AUTO_INCREMENT PRIMARY KEY, brand_id INT NOT NULL, category_id INT NOT NULL,
      slug VARCHAR(220) NOT NULL UNIQUE, name VARCHAR(220) NOT NULL, release_date DATE NULL,
      soc VARCHAR(180) NULL, battery_mah INT UNSIGNED NULL, os_family VARCHAR(80) NULL,
      verification_status ENUM('unverified','verified','rejected') NOT NULL DEFAULT 'unverified',
      specs JSON NULL, source_metadata JSON NULL, primary_image_url TEXT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE, createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL,
      CONSTRAINT fk_devices_brand FOREIGN KEY (brand_id) REFERENCES brands(id),
      CONSTRAINT fk_devices_category FOREIGN KEY (category_id) REFERENCES categories(id),
      INDEX idx_devices_brand (brand_id), INDEX idx_devices_category (category_id), INDEX idx_devices_active (is_active)
    ) ENGINE=InnoDB`,
    `CREATE TABLE device_variants (
      id INT AUTO_INCREMENT PRIMARY KEY, device_id INT NOT NULL, canonical_key VARCHAR(500) NOT NULL UNIQUE,
      model_number VARCHAR(160) NULL, ram_gb DECIMAL(8,2) NULL, storage_gb INT UNSIGNED NULL,
      network_generation VARCHAR(40) NULL, region VARCHAR(100) NULL, sim_type VARCHAR(160) NULL,
      attributes JSON NULL, source_metadata JSON NULL,
      verification_status ENUM('unverified','verified','rejected') NOT NULL DEFAULT 'unverified',
      is_active BOOLEAN NOT NULL DEFAULT TRUE, createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL,
      CONSTRAINT fk_variants_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
      CONSTRAINT chk_variants_ram CHECK (ram_gb IS NULL OR ram_gb > 0),
      CONSTRAINT chk_variants_storage CHECK (storage_gb IS NULL OR storage_gb > 0),
      INDEX idx_variants_device (device_id), INDEX idx_variants_ram (ram_gb),
      INDEX idx_variants_storage (storage_gb), INDEX idx_variants_network (network_generation),
      INDEX idx_variants_model (model_number)
    ) ENGINE=InnoDB`,
    `CREATE TABLE colors (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL, slug VARCHAR(120) NOT NULL UNIQUE, default_hex VARCHAR(9) NULL, createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL) ENGINE=InnoDB`,
    `CREATE TABLE device_variant_colors (
      id INT AUTO_INCREMENT PRIMARY KEY, device_variant_id INT NOT NULL, color_id INT NOT NULL,
      manufacturer_name VARCHAR(160) NOT NULL, slug VARCHAR(180) NOT NULL, hex_override VARCHAR(9) NULL,
      verified BOOLEAN NOT NULL DEFAULT FALSE, createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL,
      CONSTRAINT fk_variant_colors_variant FOREIGN KEY (device_variant_id) REFERENCES device_variants(id) ON DELETE CASCADE,
      CONSTRAINT fk_variant_colors_color FOREIGN KEY (color_id) REFERENCES colors(id),
      UNIQUE KEY uq_variant_color_slug (device_variant_id, slug), INDEX idx_variant_colors_color (color_id)
    ) ENGINE=InnoDB`,
    `CREATE TABLE device_media (
      id INT AUTO_INCREMENT PRIMARY KEY, device_id INT NOT NULL, device_variant_id INT NULL,
      device_variant_color_id INT NULL, url TEXT NOT NULL, storage_key VARCHAR(500) NULL,
      media_type ENUM('image','video') NOT NULL DEFAULT 'image', sort_order INT UNSIGNED NOT NULL DEFAULT 0,
      is_primary BOOLEAN NOT NULL DEFAULT FALSE, source VARCHAR(180) NULL,
      createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL,
      CONSTRAINT fk_device_media_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
      CONSTRAINT fk_device_media_variant FOREIGN KEY (device_variant_id) REFERENCES device_variants(id) ON DELETE CASCADE,
      CONSTRAINT fk_device_media_color FOREIGN KEY (device_variant_color_id) REFERENCES device_variant_colors(id) ON DELETE SET NULL,
      INDEX idx_device_media_device (device_id), INDEX idx_device_media_variant (device_variant_id),
      INDEX idx_device_media_color (device_variant_color_id)
    ) ENGINE=InnoDB`
  ];
  for (const statement of statements) await sequelize.query(statement, { transaction });
}

export async function down({ sequelize, transaction }) {
  for (const table of ['device_media', 'device_variant_colors', 'colors', 'device_variants', 'devices', 'brands']) {
    await sequelize.query(`DROP TABLE IF EXISTS ${table}`, { transaction });
  }
}
