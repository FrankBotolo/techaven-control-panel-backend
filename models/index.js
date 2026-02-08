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
import Cart from './Cart.js';
import Order from './Order.js';
import OrderItem from './OrderItem.js';
import Favorite from './Favorite.js';
import Wallet from './Wallet.js';
import WalletTransaction from './WalletTransaction.js';
import Review from './Review.js';

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

// Cart associations
Cart.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Cart.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
User.hasMany(Cart, { foreignKey: 'user_id', as: 'cart' });
Product.hasMany(Cart, { foreignKey: 'product_id', as: 'carts' });

// Order associations
Order.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' });
User.hasMany(Order, { foreignKey: 'user_id', as: 'orders' });

// OrderItem associations
OrderItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Product.hasMany(OrderItem, { foreignKey: 'product_id', as: 'order_items' });

// Favorite associations
Favorite.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Favorite.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
User.hasMany(Favorite, { foreignKey: 'user_id', as: 'favorites' });
Product.hasMany(Favorite, { foreignKey: 'product_id', as: 'favorites' });

// Wallet associations
Wallet.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasOne(Wallet, { foreignKey: 'user_id', as: 'wallet' });
Wallet.hasMany(WalletTransaction, { foreignKey: 'wallet_id', as: 'transactions' });
WalletTransaction.belongsTo(Wallet, { foreignKey: 'wallet_id', as: 'wallet' });
WalletTransaction.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(WalletTransaction, { foreignKey: 'user_id', as: 'wallet_transactions' });

// Review associations
Review.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Review.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Product.hasMany(Review, { foreignKey: 'product_id', as: 'reviews' });
User.hasMany(Review, { foreignKey: 'user_id', as: 'reviews' });

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
  AuditLog,
  Cart,
  Order,
  OrderItem,
  Favorite,
  Wallet,
  WalletTransaction,
  Review
};

export default db;

