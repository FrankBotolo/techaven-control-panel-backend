import db from '../models/index.js';
import { Op } from 'sequelize';
import moment from 'moment';

const {
  Shop,
  Product,
  Category,
  User,
  ShopInvitation,
  AuditLog,
  Banner,
  Notification,
  Order,
  OrderItem,
  MalipoTransaction
} = db;

const PAID_ORDER_BASE = {
  payment_status: 'paid',
  status: { [Op.ne]: 'cancelled' }
};

function malipoSubscriptionPaidWhere() {
  const states = ['success', 'successful', 'succeeded', 'completed', 'complete', 'paid'];
  return {
    [Op.or]: states.map((s) =>
      db.sequelize.where(db.sequelize.fn('LOWER', db.sequelize.col('status')), s)
    )
  };
}

async function aggregatePaidLineRevenue(fromDate, toDate) {
  const orderWhere = { ...PAID_ORDER_BASE };
  if (fromDate && toDate) {
    orderWhere.createdAt = { [Op.between]: [fromDate, toDate] };
  }
  const row = await OrderItem.findOne({
    attributes: [
      [db.sequelize.fn('SUM', db.sequelize.col('OrderItem.subtotal')), 'revenue'],
      [db.sequelize.fn('COUNT', db.sequelize.fn('DISTINCT', db.sequelize.col('OrderItem.order_id'))), 'order_count']
    ],
    include: [
      {
        model: Order,
        as: 'order',
        attributes: [],
        where: orderWhere,
        required: true
      }
    ],
    raw: true
  });
  return {
    revenue_mwk: parseFloat(row?.revenue) || 0,
    order_count: parseInt(row?.order_count, 10) || 0
  };
}

async function aggregatePaidLineRevenueByShop(fromDate, toDate) {
  const orderWhere = { ...PAID_ORDER_BASE };
  if (fromDate && toDate) {
    orderWhere.createdAt = { [Op.between]: [fromDate, toDate] };
  }
  const rows = await OrderItem.findAll({
    attributes: [
      [db.sequelize.col('product.shop_id'), 'shop_id'],
      [db.sequelize.fn('SUM', db.sequelize.col('OrderItem.subtotal')), 'revenue_mwk'],
      [db.sequelize.fn('COUNT', db.sequelize.fn('DISTINCT', db.sequelize.col('OrderItem.order_id'))), 'order_count']
    ],
    include: [
      {
        model: Product,
        as: 'product',
        attributes: [],
        required: true
      },
      {
        model: Order,
        as: 'order',
        attributes: [],
        where: orderWhere,
        required: true
      }
    ],
    group: ['product.shop_id'],
    raw: true
  });
  const map = new Map();
  for (const r of rows) {
    const sid = r.shop_id;
    map.set(sid, {
      revenue_mwk: parseFloat(r.revenue_mwk) || 0,
      order_count: parseInt(r.order_count, 10) || 0
    });
  }
  return map;
}

function mergeShopSalesRows(allShops, byShopMap) {
  return allShops.map((s) => {
    const st = byShopMap.get(s.id) || { revenue_mwk: 0, order_count: 0 };
    return {
      shop_id: s.id,
      shop_name: s.name,
      shop_logo: s.logo,
      revenue_mwk: st.revenue_mwk,
      order_count: st.order_count
    };
  });
}

export const getDashboard = async (req, res) => {
  try {
    // Get all counts in parallel for better performance
    const [
      totalShops,
      activeShops,
      inactiveShops,
      verifiedShops,
      totalProducts,
      featuredProducts,
      hotProducts,
      specialProducts,
      totalCategories,
      pendingCategories,
      totalUsers,
      adminUsers,
      sellerUsers,
      customerUsers,
      verifiedUsers,
      pendingInvitations,
      acceptedInvitations,
      totalBanners,
      totalNotifications
    ] = await Promise.all([
      // Shops
      Shop.count(),
      Shop.count({ where: { status: 'active' } }),
      Shop.count({ where: { status: 'inactive' } }),
      Shop.count({ where: { is_verified: true } }),
      
      // Products
      Product.count(),
      Product.count({ where: { is_featured: true } }),
      Product.count({ where: { is_hot: true } }),
      Product.count({ where: { is_special: true } }),
      
      // Categories (all are automatically approved)
      Category.count(),
      
      // Users
      User.count(),
      User.count({ where: { role: 'admin' } }),
      User.count({ where: { role: 'seller' } }),
      User.count({ where: { role: 'customer' } }),
      User.count({ where: { is_verified: true } }),
      
      // Invitations
      ShopInvitation.count({ where: { status: 'pending' } }),
      ShopInvitation.count({ where: { status: 'accepted' } }),
      
      // Banners
      Banner.count(),
      
      // Notifications
      Notification.count()
    ]);

    // Get recent activities (last 10 audit logs)
    const recentActivities = await AuditLog.findAll({
      include: [
        {
          model: User,
          as: 'actor',
          attributes: ['id', 'name', 'email', 'role'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    // Get recent shops (last 5)
    const recentShops = await Shop.findAll({
      attributes: ['id', 'name', 'logo', 'status', 'is_verified', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    // Get recent products (last 5)
    const recentProducts = await Product.findAll({
      include: [
        {
          model: Shop,
          as: 'shop',
          attributes: ['id', 'name', 'logo'],
          required: false
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      attributes: ['id', 'name', 'image', 'price', 'stock', 'specifications', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    // Calculate total sales from shops using aggregation
    const totalSalesResult = await Shop.sum('total_sales');
    const totalSales = parseInt(totalSalesResult) || 0;

    // Calculate total products value using aggregation
    const totalProductsValueResult = await Product.sum('price');
    const totalProductsValue = parseFloat(totalProductsValueResult) || 0;

    const nowUtc = moment.utc();
    const now = nowUtc.toDate();
    const weekStart = nowUtc.clone().startOf('isoWeek').toDate();
    const monthStart = nowUtc.clone().startOf('month').toDate();
    const yearStart = nowUtc.clone().startOf('year').toDate();

    const subscriptionMonthWhere = {
      shop_subscription_id: { [Op.ne]: null },
      createdAt: { [Op.between]: [monthStart, now] },
      ...malipoSubscriptionPaidWhere()
    };

    const [
      paidAllTime,
      paidWeek,
      paidMonth,
      paidYear,
      shopMapAllTime,
      shopMapMonth,
      allShopsList,
      subscriptionIncomeMonth,
      subscriptionTxCountMonth
    ] = await Promise.all([
      aggregatePaidLineRevenue(),
      aggregatePaidLineRevenue(weekStart, now),
      aggregatePaidLineRevenue(monthStart, now),
      aggregatePaidLineRevenue(yearStart, now),
      aggregatePaidLineRevenueByShop(),
      aggregatePaidLineRevenueByShop(monthStart, now),
      Shop.findAll({ attributes: ['id', 'name', 'logo'], order: [['name', 'ASC']] }),
      MalipoTransaction.sum('amount', { where: subscriptionMonthWhere }),
      MalipoTransaction.count({ where: subscriptionMonthWhere })
    ]);

    const byShopAllTime = mergeShopSalesRows(allShopsList, shopMapAllTime).sort(
      (a, b) => b.revenue_mwk - a.revenue_mwk
    );
    const byShopMonthToDate = mergeShopSalesRows(allShopsList, shopMapMonth).sort(
      (a, b) => b.revenue_mwk - a.revenue_mwk
    );

    // Format response
    const dashboardData = {
      overview: {
        shops: {
          total: totalShops,
          active: activeShops,
          inactive: inactiveShops,
          verified: verifiedShops,
          unverified: totalShops - verifiedShops
        },
        products: {
          total: totalProducts,
          featured: featuredProducts,
          hot: hotProducts,
          special: specialProducts
        },
        categories: {
          total: totalCategories
        },
        users: {
          total: totalUsers,
          admins: adminUsers,
          sellers: sellerUsers,
          customers: customerUsers,
          verified: verifiedUsers,
          unverified: totalUsers - verifiedUsers
        },
        invitations: {
          pending: pendingInvitations,
          accepted: acceptedInvitations
        },
        banners: {
          total: totalBanners
        },
        notifications: {
          total: totalNotifications
        },
        sales: {
          total: totalSales,
          paid_orders_revenue_mwk: paidAllTime.revenue_mwk,
          paid_orders_count: paidAllTime.order_count
        },
        products_value: {
          total: parseFloat(totalProductsValue) || 0
        }
      },
      sales_analytics: {
        currency: 'MWK',
        timezone: 'UTC',
        basis:
          'Paid, non-cancelled orders; revenue is sum of order line subtotals (product sales) per shop.',
        periods: {
          week_to_date: {
            start: weekStart.toISOString(),
            end: now.toISOString(),
            label: 'ISO week to date (UTC, week starts Monday)',
            ...paidWeek
          },
          month_to_date: {
            start: monthStart.toISOString(),
            end: now.toISOString(),
            label: 'Calendar month to date (UTC)',
            ...paidMonth
          },
          year_to_date: {
            start: yearStart.toISOString(),
            end: now.toISOString(),
            label: 'Calendar year to date (UTC)',
            ...paidYear
          },
          all_time: {
            ...paidAllTime
          }
        },
        by_shop: {
          all_time: byShopAllTime,
          month_to_date: byShopMonthToDate
        }
      },
      monthly_income: {
        month: nowUtc.format('YYYY-MM'),
        timezone: 'UTC',
        basis:
          'Malipo payments linked to shop subscriptions (successful webhook statuses only), month to date.',
        subscription_payments_mwk: parseFloat(subscriptionIncomeMonth) || 0,
        subscription_transaction_count: subscriptionTxCountMonth
      },
      recent: {
        activities: recentActivities.map(activity => ({
          id: activity.id,
          action: activity.action,
          target_type: activity.target_type,
          target_id: activity.target_id,
          actor: activity.actor ? {
            id: activity.actor.id,
            name: activity.actor.name,
            email: activity.actor.email,
            role: activity.actor.role
          } : null,
          metadata: activity.metadata,
          created_at: activity.createdAt || activity.created_at || new Date()
        })),
        shops: recentShops,
        products: recentProducts.map(product => ({
          id: product.id,
          name: product.name,
          image: product.image,
          price: product.price,
          stock: product.stock,
          shop: product.shop ? {
            id: product.shop.id,
            name: product.shop.name,
            logo: product.shop.logo
          } : null,
          category: product.category ? {
            id: product.category.id,
            name: product.category.name
          } : null,
          created_at: product.createdAt || product.created_at || new Date()
        }))
      }
    };

    return res.json({
      success: true,
      message: 'Dashboard data retrieved successfully',
      data: dashboardData
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message
    });
  }
};

