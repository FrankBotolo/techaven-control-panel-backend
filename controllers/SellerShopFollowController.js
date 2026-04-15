import db from '../models/index.js';

const { ShopFollow, User } = db;

export const listFollowers = async (req, res) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    if (!shopId || Number.isNaN(shopId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid shop id',
        data: null
      });
    }

    const { page, limit: limitParam, per_page } = req.query;
    const perPage = Math.min(parseInt(limitParam || per_page, 10) || 30, 100);
    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const offset = (currentPage - 1) * perPage;

    const { count, rows } = await ShopFollow.findAndCountAll({
      where: { shop_id: shopId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone_number', 'avatar_url', 'role']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: perPage,
      offset
    });

    const totalPages = Math.ceil(count / perPage);

    const followers = rows.map((f) => {
      const u = f.user;
      return {
        follow_id: f.id,
        followed_at: f.createdAt || f.created_at,
        user: u
          ? {
              id: u.id,
              name: u.name,
              email: u.email,
              phone_number: u.phone_number,
              avatar_url: u.avatar_url || null,
              role: u.role
            }
          : null
      };
    });

    return res.json({
      success: true,
      message: 'Followers retrieved',
      data: {
        followers,
        pagination: {
          current_page: currentPage,
          per_page: perPage,
          total_items: count,
          total_pages: totalPages,
          has_next: currentPage < totalPages,
          has_prev: currentPage > 1
        }
      }
    });
  } catch (error) {
    console.error('List shop followers error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to list followers',
      data: null,
      error: error.message
    });
  }
};
