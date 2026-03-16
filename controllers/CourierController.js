import db from '../models/index.js';

const { CourierService } = db;

/** Public: List active courier services for customer to select when placing order */
export const listActive = async (req, res) => {
  try {
    const services = await CourierService.findAll({
      where: { is_active: true },
      order: [['sort_order', 'ASC'], ['name', 'ASC']],
      attributes: ['id', 'name', 'description', 'logo_url']
    });
    return res.json({
      success: true,
      message: 'Courier services retrieved',
      data: services
    });
  } catch (error) {
    console.error('List courier services error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to list courier services',
      error: error.message
    });
  }
};
