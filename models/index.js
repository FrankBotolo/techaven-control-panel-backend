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
import Escrow from './Escrow.js';
import WithdrawalRequest from './WithdrawalRequest.js';
import ShippingAddress from './ShippingAddress.js';
import Dispute from './Dispute.js';
import CourierService from './CourierService.js';
import DeliveryAgent from './DeliveryAgent.js';
import DeliveryJob from './DeliveryJob.js';
import PaymentMethod from './PaymentMethod.js';
import MalipoTransaction from './MalipoTransaction.js';
import OnboardingSlide from './OnboardingSlide.js';
import SubscriptionPackage from './SubscriptionPackage.js';
import ShopSubscription from './ShopSubscription.js';
import SubscriptionPayment from './SubscriptionPayment.js';
import UserSubscription from './UserSubscription.js';
import PlatformSetting from './PlatformSetting.js';

// Define associations
Product.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });
Product.belongsTo(Shop, { foreignKey: 'shop_id', as: 'shop' });
Category.hasMany(Product, { foreignKey: 'category_id', as: 'products' });
Shop.hasMany(Product, { foreignKey: 'shop_id', as: 'products' });
Banner.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Notification.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Order.hasMany(Notification, { foreignKey: 'order_id', as: 'notifications' });

// Shop ownership / seller assignment
User.belongsTo(Shop, { foreignKey: 'shop_id', as: 'shop' });
Shop.hasMany(User, { foreignKey: 'shop_id', as: 'users' });

// Seller subscription packages (admin-defined plans; shops subscribe)
ShopSubscription.belongsTo(Shop, { foreignKey: 'shop_id', as: 'shop' });
ShopSubscription.belongsTo(SubscriptionPackage, { foreignKey: 'package_id', as: 'package' });
Shop.hasMany(ShopSubscription, { foreignKey: 'shop_id', as: 'subscriptions' });
SubscriptionPackage.hasMany(ShopSubscription, {
  foreignKey: 'package_id',
  as: 'shop_subscriptions'
});

// User-centric subscription access (payment → user_subscriptions; plans = subscription_packages)
SubscriptionPayment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
SubscriptionPayment.belongsTo(SubscriptionPackage, { foreignKey: 'plan_id', as: 'plan' });
User.hasMany(SubscriptionPayment, { foreignKey: 'user_id', as: 'subscription_payments' });
SubscriptionPackage.hasMany(SubscriptionPayment, { foreignKey: 'plan_id', as: 'subscription_payments' });

UserSubscription.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
UserSubscription.belongsTo(SubscriptionPackage, { foreignKey: 'plan_id', as: 'plan' });
UserSubscription.belongsTo(SubscriptionPayment, { foreignKey: 'payment_id', as: 'payment' });
User.hasMany(UserSubscription, { foreignKey: 'user_id', as: 'user_subscriptions' });
SubscriptionPackage.hasMany(UserSubscription, { foreignKey: 'plan_id', as: 'user_subscriptions' });
SubscriptionPayment.hasMany(UserSubscription, { foreignKey: 'payment_id', as: 'user_subscriptions' });

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
Order.belongsTo(ShippingAddress, { foreignKey: 'shipping_address_id', as: 'shippingAddress' });
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

// Escrow associations
Escrow.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
Escrow.belongsTo(User, { foreignKey: 'seller_id', as: 'seller' });
Order.hasMany(Escrow, { foreignKey: 'order_id', as: 'escrows' });
User.hasMany(Escrow, { foreignKey: 'seller_id', as: 'escrows' });
Order.belongsTo(User, { foreignKey: 'seller_id', as: 'seller' });

// Withdrawal requests (sellers withdraw available balance only)
WithdrawalRequest.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
WithdrawalRequest.belongsTo(User, { foreignKey: 'processed_by', as: 'processedBy' });
User.hasMany(WithdrawalRequest, { foreignKey: 'user_id', as: 'withdrawal_requests' });

// Shipping addresses (customer)
ShippingAddress.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(ShippingAddress, { foreignKey: 'user_id', as: 'shipping_addresses' });

// Disputes
Dispute.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
Dispute.belongsTo(User, { foreignKey: 'buyer_id', as: 'buyer' });
Dispute.belongsTo(User, { foreignKey: 'seller_id', as: 'seller' });
Dispute.belongsTo(User, { foreignKey: 'resolved_by', as: 'resolver' });
Order.hasMany(Dispute, { foreignKey: 'order_id', as: 'disputes' });
User.hasMany(Dispute, { foreignKey: 'buyer_id', as: 'buyer_disputes' });
User.hasMany(Dispute, { foreignKey: 'seller_id', as: 'seller_disputes' });

// Courier services (admin-managed, customer selects at checkout)
Order.belongsTo(CourierService, { foreignKey: 'courier_service_id', as: 'courierService' });
CourierService.hasMany(Order, { foreignKey: 'courier_service_id', as: 'orders' });

// Payment methods (Malipo: Airtel psp_id=1, TNM psp_id=2)
// No FK - payment_method on Order stores slug (airtel, tnm)

DeliveryAgent.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasOne(DeliveryAgent, { foreignKey: 'user_id', as: 'delivery_agent' });
DeliveryJob.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
DeliveryJob.belongsTo(DeliveryAgent, { foreignKey: 'agent_id', as: 'agent' });
Order.hasOne(DeliveryJob, { foreignKey: 'order_id', as: 'delivery_job' });
DeliveryAgent.hasMany(DeliveryJob, { foreignKey: 'agent_id', as: 'jobs' });

MalipoTransaction.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
Order.hasMany(MalipoTransaction, { foreignKey: 'order_id', as: 'malipo_transactions' });
MalipoTransaction.belongsTo(ShopSubscription, { foreignKey: 'shop_subscription_id', as: 'shop_subscription' });
ShopSubscription.hasMany(MalipoTransaction, {
  foreignKey: 'shop_subscription_id',
  as: 'malipo_transactions'
});

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
  Review,
  Escrow,
  WithdrawalRequest,
  ShippingAddress,
  Dispute,
  CourierService,
  DeliveryAgent,
  DeliveryJob,
  PaymentMethod,
  MalipoTransaction,
  OnboardingSlide,
  SubscriptionPackage,
  ShopSubscription,
  SubscriptionPayment,
  UserSubscription,
  PlatformSetting
};

export default db;

