import db from '../models/index.js';
import { Sequelize } from 'sequelize';

const { Shop, Product, Category, User, ShopInvitation, AuditLog, Banner, Notification } = db;

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
      approvedCategories,
      rejectedCategories,
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
      
      // Categories
      Category.count(),
      Category.count({ where: { status: 'pending' } }),
      Category.count({ where: { status: 'approved' } }),
      Category.count({ where: { status: 'rejected' } }),
      
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
      attributes: ['id', 'name', 'image', 'price', 'stock', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    // Calculate total sales from shops using aggregation
    const totalSalesResult = await Shop.sum('total_sales');
    const totalSales = parseInt(totalSalesResult) || 0;

    // Calculate total products value using aggregation
    const totalProductsValueResult = await Product.sum('price');
    const totalProductsValue = parseFloat(totalProductsValueResult) || 0;

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
          total: totalCategories,
          pending: pendingCategories,
          approved: approvedCategories,
          rejected: rejectedCategories
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
          total: totalSales
        },
        products_value: {
          total: parseFloat(totalProductsValue) || 0
        }
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
          created_at: activity.createdAt
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
          created_at: product.createdAt
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

