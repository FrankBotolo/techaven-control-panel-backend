import { DataTypes } from "sequelize";
export async function up({ sequelize, transaction }) {
    const q = sequelize.getQueryInterface();
    for (const table of ["shipping_addresses", "orders"]) {
        const columns = await q.describeTable(table);
        const fields =
            table === "shipping_addresses"
                ? {
                      latitude: DataTypes.DECIMAL(10, 7),
                      longitude: DataTypes.DECIMAL(10, 7),
                      location_accuracy: DataTypes.FLOAT,
                      delivery_notes: DataTypes.TEXT,
                  }
                : {
                      delivery_location: DataTypes.JSON,
                      checkout_group_id: DataTypes.UUID,
                      manual_payment_submission_id: DataTypes.UUID,
                  };
        for (const [name, type] of Object.entries(fields))
            if (!columns[name])
                await q.addColumn(
                    table,
                    name,
                    { type, allowNull: true },
                    { transaction },
                );
    }
    await sequelize.query(
        `CREATE TABLE IF NOT EXISTS payment_submissions (
    id CHAR(36) PRIMARY KEY, user_id INT NOT NULL, submission_key VARCHAR(80) NOT NULL,
    order_ids JSON NOT NULL, order_references JSON NOT NULL, amount DECIMAL(12,2) NOT NULL, currency VARCHAR(3) NOT NULL DEFAULT 'MWK',
    payment_reference VARCHAR(160) NOT NULL, payer_name VARCHAR(160) NOT NULL, payment_date DATE NOT NULL,
    receipt_file VARCHAR(80) NOT NULL, receipt_type VARCHAR(32) NOT NULL,
    status ENUM('pending_review','approved','rejected') NOT NULL DEFAULT 'pending_review',
    reviewed_by INT NULL, reviewed_at DATETIME NULL, rejection_reason VARCHAR(1000) NULL,
    createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL,
    UNIQUE KEY payment_submission_retry (user_id,submission_key), INDEX payment_review_queue (status,createdAt),
    FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (reviewed_by) REFERENCES users(id)
  ) ENGINE=InnoDB`,
        { transaction },
    );
}
export async function down() {
    throw new Error(
        "Payment and delivery history must be retained; restore a reviewed backup instead of automatic rollback.",
    );
}
