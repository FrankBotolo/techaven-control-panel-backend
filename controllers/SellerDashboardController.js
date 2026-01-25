import db from '../models/index.js';
import { Op } from 'sequelize';

const { Shop, Product, Category, User, Notification, sequelize } = db;

export const getDashboard = async (req, res) => {
  try {
    const seller = req.user;

    // Verify seller has a shop
    if (!seller.shop_id) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to any shop'
      });
    }

    // Get shop details
    const shop = await Shop.findByPk(seller.shop_id, {
      include: [
        {
          model: User,
          as: 'users',
          attributes: ['id', 'name', 'email', 'phone_number', 'role', 'avatar_url', 'is_verified'],
          where: { role: 'seller' },
          required: false
        }
      ]
    });

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found'
      });
    }

    // Get counts for seller's shop
    const [
      totalProducts,
      featuredProducts,
      hotProducts,
      specialProducts,
      lowStockProducts,
      totalCategories,
      pendingCategories,
      approvedCategories,
      rejectedCategories,
      totalNotifications,
      unreadNotifications
    ] = await Promise.all([
      // Products
      Product.count({ where: { shop_id: seller.shop_id } }),
      Product.count({ where: { shop_id: seller.shop_id, is_featured: true } }),
      Product.count({ where: { shop_id: seller.shop_id, is_hot: true } }),
      Product.count({ where: { shop_id: seller.shop_id, is_special: true } }),
      Product.count({ where: { shop_id: seller.shop_id, stock: { [Op.lt]: 10 } } }),
      
      // Categories
      Category.count({ where: { shop_id: seller.shop_id } }),
      Category.count({ where: { shop_id: seller.shop_id, status: 'pending' } }),
      Category.count({ where: { shop_id: seller.shop_id, status: 'approved' } }),
      Category.count({ where: { shop_id: seller.shop_id, status: 'rejected' } }),
      
      // Notifications
      Notification.count({ where: { user_id: seller.id } }),
      Notification.count({ where: { user_id: seller.id, read: false } })
    ]);

    // Calculate total products value
    const totalProductsValueResult = await Product.sum('price', {
      where: { shop_id: seller.shop_id }
    });
    const totalProductsValue = parseFloat(totalProductsValueResult) || 0;

    // Get recent products (last 5)
    const recentProducts = await Product.findAll({
      where: { shop_id: seller.shop_id },
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'status'],
          required: false
        }
      ],
      attributes: ['id', 'name', 'image', 'price', 'stock', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    // Get recent categories (last 5)
    const recentCategories = await Category.findAll({
      where: { shop_id: seller.shop_id },
      attributes: ['id', 'name', 'status', 'image', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    // Get low stock products
    const lowStockProductsList = await Product.findAll({
      where: {
        shop_id: seller.shop_id,
        stock: { [Op.lt]: 10 }
      },
      attributes: ['id', 'name', 'image', 'stock', 'price'],
      order: [['stock', 'ASC']],
      limit: 10
    });

    // Get recent notifications (last 5)
    const recentNotifications = await Notification.findAll({
      where: { user_id: seller.id },
      attributes: ['id', 'title', 'message', 'type', 'read'],
      order: [[sequelize.literal('Notification.created_at'), 'DESC']],
      limit: 5
    });

    // Format shop data
    const shopData = shop.toJSON();
    if (shopData.users) {
      shopData.owners = shopData.users;
      delete shopData.users;
    }

    // Format response
    const dashboardData = {
      shop: shopData,
      overview: {
        products: {
          total: totalProducts,
          featured: featuredProducts,
          hot: hotProducts,
          special: specialProducts,
          low_stock: lowStockProducts,
          total_value: totalProductsValue
        },
        categories: {
          total: totalCategories,
          pending: pendingCategories,
          approved: approvedCategories,
          rejected: rejectedCategories
        },
        notifications: {
          total: totalNotifications,
          unread: unreadNotifications
        },
        sales: {
          total: shop.total_sales || 0
        }
      },
      recent: {
        products: recentProducts.map(product => ({
          id: product.id,
          name: product.name,
          image: product.image,
          price: product.price,
          stock: product.stock,
          category: product.category ? {
            id: product.category.id,
            name: product.category.name,
            status: product.category.status
          } : null,
          created_at: product.createdAt
        })),
        categories: recentCategories,
        notifications: recentNotifications
      },
      alerts: {
        low_stock_products: lowStockProductsList.map(product => ({
          id: product.id,
          name: product.name,
          image: product.image,
          stock: product.stock,
          price: product.price
        })),
        pending_categories: pendingCategories > 0 ? {
          count: pendingCategories,
          message: `You have ${pendingCategories} pending categor${pendingCategories > 1 ? 'ies' : 'y'} awaiting approval`
        } : null
      }
    };

    return res.json({
      success: true,
      message: 'Seller dashboard data retrieved successfully',
      data: dashboardData
    });
  } catch (error) {
    console.error('Seller dashboard error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch seller dashboard data',
      error: error.message
    });
  }
};

