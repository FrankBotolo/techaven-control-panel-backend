import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
export default sequelize.define(
    "PaymentSubmission",
    {
        id: { type: DataTypes.UUID, primaryKey: true },
        user_id: { type: DataTypes.INTEGER, allowNull: false },
        submission_key: { type: DataTypes.STRING(80), allowNull: false },
        order_ids: { type: DataTypes.JSON, allowNull: false },
        order_references: { type: DataTypes.JSON, allowNull: false },
        amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
        currency: { type: DataTypes.STRING(3), defaultValue: "MWK" },
        payment_reference: { type: DataTypes.STRING(160), allowNull: true },
        payer_name: { type: DataTypes.STRING(160), allowNull: false },
        payer_bank: { type: DataTypes.STRING(120), allowNull: true },
        declared_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
        payment_date: { type: DataTypes.DATEONLY, allowNull: false },
        receipt_file: { type: DataTypes.STRING(80), allowNull: true },
        receipt_key: { type: DataTypes.STRING(255), allowNull: true },
        receipt_url: { type: DataTypes.STRING(500), allowNull: true },
        receipt_type: { type: DataTypes.STRING(32), allowNull: false },
        status: {
            type: DataTypes.ENUM("pending_review", "approved", "rejected"),
            defaultValue: "pending_review",
        },
        reviewed_by: { type: DataTypes.INTEGER, allowNull: true },
        reviewed_at: { type: DataTypes.DATE, allowNull: true },
        rejection_reason: { type: DataTypes.STRING(1000), allowNull: true },
    },
    {
        tableName: "payment_submissions",
        timestamps: true,
        indexes: [{ unique: true, fields: ["user_id", "submission_key"] }],
    },
);
