import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  delivery_location: { type: DataTypes.JSON, allowNull: true },
  checkout_group_id: { type: DataTypes.UUID, allowNull: true },
  manual_payment_submission_id: { type: DataTypes.UUID, allowNull: true },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  order_number: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  shipping_address_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'shipping_addresses', key: 'id' }
  },
  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  shipping_fee: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending'
  },
  total_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  shipping_address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  shipping_city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  shipping_phone: {
    type: DataTypes.STRING,
    allowNull: false
  },
  payment_method: {
    type: DataTypes.STRING,
    allowNull: true
  },
  payment_status: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
    allowNull: false,
    defaultValue: 'pending'
  },
  paid_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  courier_service: {
    type: DataTypes.STRING,
    allowNull: true
  },
  courier_service_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'courier_services', key: 'id' }
  },
  delivery_method: {
    type: DataTypes.ENUM('self_ship', 'platform_agent', 'third_party_courier'),
    allowNull: true
  },
  seller_accepted_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  delivered_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  courier_tracking_number: {
    type: DataTypes.STRING,
    allowNull: true
  },
  seller_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  escrow_status: {
    type: DataTypes.ENUM('pending', 'held', 'frozen', 'released', 'refunded'),
    allowNull: false,
    defaultValue: 'pending'
  },
  delivery_method: {
    type: DataTypes.ENUM('self_ship', 'platform_agent', 'third_party_courier'),
    allowNull: true
  },
  seller_accepted_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  delivered_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  escrow_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  /** Sum of seller line items before platform commission */
  seller_gross_subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  /** Commission % snapshot at checkout */
  platform_commission_percent: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  /** MWK retained by platform from seller gross */
  platform_fee_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  delivery_confirmed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  /** Optional URL to proof file (photo/PDF) when customer confirms delivery; mobile uploads elsewhere and passes URL */
  delivery_confirmation_proof_url: {
    type: DataTypes.STRING(2048),
    allowNull: true
  },
  funds_released_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  /** 'delivery' (courier / Techaven rider) or 'pickup' (buyer collects at the shop). */
  fulfilment_type: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'delivery'
  },
  /** When the seller marked the parcel as sent, or handed over at the shop. */
  dispatched_at: { type: DataTypes.DATE, allowNull: true },
  /** Private storage key of the buyer's proof of delivery (see /api/uploads/delivery-proof). */
  delivery_proof_key: { type: DataTypes.STRING(255), allowNull: true },
  /** null, 'pending_review', 'approved' or 'rejected'. Escrow is released only on approval. */
  delivery_proof_status: { type: DataTypes.STRING(20), allowNull: true },
  delivery_proof_submitted_at: { type: DataTypes.DATE, allowNull: true },
  delivery_proof_reviewed_at: { type: DataTypes.DATE, allowNull: true },
  delivery_proof_reviewed_by: { type: DataTypes.INTEGER, allowNull: true },
  delivery_proof_rejection_reason: { type: DataTypes.STRING(1000), allowNull: true },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'orders',
  timestamps: true,
  indexes: [
    {
      fields: ['status']
    }
  ]
});

export default Order;










