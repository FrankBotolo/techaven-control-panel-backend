import db from '../models/index.js';
import { logAudit, auditContext } from '../utils/audit.js';

const { CourierService } = db;

export const listCourierServices = async (req, res) => {
  try {
    const { is_active } = req.query;
    const where = {};
    if (is_active !== undefined) {
      where.is_active = is_active === 'true' || is_active === '1';
    }
    const services = await CourierService.findAll({
      where,
      order: [['sort_order', 'ASC'], ['name', 'ASC']]
    });
    return res.json({
      success: true,
      message: 'Courier services retrieved',
      data: services.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        logo_url: s.logo_url,
        is_active: s.is_active,
        sort_order: s.sort_order,
        created_at: s.createdAt
      }))
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

export const createCourierService = async (req, res) => {
  try {
    const { name, description, logo_url, is_active, sort_order } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'name is required'
      });
    }
    const service = await CourierService.create({
      name: name.trim(),
      description: description || null,
      logo_url: logo_url || null,
      is_active: is_active !== false && is_active !== 'false',
      sort_order: parseInt(sort_order, 10) || 0
    });

    await logAudit({
      ...auditContext(req),
      action: 'admin.courier_service.create',
      actor_user_id: req.user.id,
      target_type: 'courier_service',
      target_id: service.id,
      metadata: { name: service.name }
    });

    return res.status(201).json({
      success: true,
      message: 'Courier service created',
      data: {
        id: service.id,
        name: service.name,
        description: service.description,
        logo_url: service.logo_url,
        is_active: service.is_active,
        sort_order: service.sort_order
      }
    });
  } catch (error) {
    console.error('Create courier service error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create courier service',
      error: error.message
    });
  }
};

export const updateCourierService = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, logo_url, is_active, sort_order } = req.body;
    const service = await CourierService.findByPk(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Courier service not found'
      });
    }
    if (name !== undefined) service.name = name.trim();
    if (description !== undefined) service.description = description;
    if (logo_url !== undefined) service.logo_url = logo_url;
    if (is_active !== undefined) service.is_active = is_active !== false && is_active !== 'false';
    if (sort_order !== undefined) service.sort_order = parseInt(sort_order, 10) || 0;
    await service.save();

    await logAudit({
      ...auditContext(req),
      action: 'admin.courier_service.update',
      actor_user_id: req.user.id,
      target_type: 'courier_service',
      target_id: service.id,
      metadata: { name: service.name }
    });

    return res.json({
      success: true,
      message: 'Courier service updated',
      data: {
        id: service.id,
        name: service.name,
        description: service.description,
        logo_url: service.logo_url,
        is_active: service.is_active,
        sort_order: service.sort_order
      }
    });
  } catch (error) {
    console.error('Update courier service error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update courier service',
      error: error.message
    });
  }
};

export const deleteCourierService = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await CourierService.findByPk(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Courier service not found'
      });
    }
    const serviceName = service.name;
    await service.destroy();

    await logAudit({
      ...auditContext(req),
      action: 'admin.courier_service.delete',
      actor_user_id: req.user.id,
      target_type: 'courier_service',
      target_id: id,
      metadata: { name: serviceName }
    });

    return res.json({
      success: true,
      message: 'Courier service deleted'
    });
  } catch (error) {
    console.error('Delete courier service error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete courier service',
      error: error.message
    });
  }
};
