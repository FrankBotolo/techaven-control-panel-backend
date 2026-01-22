import sequelize from '../config/database.js';
import User from './User.js';
import Otp from './Otp.js';
import Category from './Category.js';
import Shop from './Shop.js';
import Product from './Product.js';
import Banner from './Banner.js';
import Notification from './Notification.js';
import ShopInvitation from './ShopInvitation.js';
import AuditLog from './AuditLog.js';

// Define associations
Product.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });
Product.belongsTo(Shop, { foreignKey: 'shop_id', as: 'shop' });
Category.hasMany(Product, { foreignKey: 'category_id', as: 'products' });
Shop.hasMany(Product, { foreignKey: 'shop_id', as: 'products' });
Banner.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });

// Shop ownership / seller assignment
User.belongsTo(Shop, { foreignKey: 'shop_id', as: 'shop' });
Shop.hasMany(User, { foreignKey: 'shop_id', as: 'users' });

// Shop categories (optional per-shop)
Category.belongsTo(Shop, { foreignKey: 'shop_id', as: 'shop' });
Shop.hasMany(Category, { foreignKey: 'shop_id', as: 'categories' });

// Invitations
ShopInvitation.belongsTo(Shop, { foreignKey: 'shop_id', as: 'shop' });
Shop.hasMany(ShopInvitation, { foreignKey: 'shop_id', as: 'invitations' });
ShopInvitation.belongsTo(User, { foreignKey: 'invited_by_user_id', as: 'invited_by' });
ShopInvitation.belongsTo(User, { foreignKey: 'accepted_by_user_id', as: 'accepted_by' });
User.hasMany(ShopInvitation, { foreignKey: 'invited_by_user_id', as: 'sent_invitations' });
User.hasMany(ShopInvitation, { foreignKey: 'accepted_by_user_id', as: 'accepted_invitations' });

// Audit logs
AuditLog.belongsTo(User, { foreignKey: 'actor_user_id', as: 'actor' });
User.hasMany(AuditLog, { foreignKey: 'actor_user_id', as: 'audit_logs' });

const db = {
  sequelize,
  Sequelize: sequelize.Sequelize,
  User,
  Otp,
  Category,
  Shop,
  Product,
  Banner,
  Notification,
  ShopInvitation,
  AuditLog
};

export default db;

