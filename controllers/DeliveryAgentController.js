import db from '../models/index.js';
import { logAudit, auditContext } from '../utils/audit.js';
import { sendNotificationEmail } from '../utils/notificationHelper.js';

const { User, DeliveryAgent, DeliveryJob, Order, OrderItem, Product, Shop, Notification } = db;

export const register = async (req, res) => {
  try {
    const userId = req.user.id;
    const { vehicle_type, operating_zone, id_document_url } = req.body;

    if (req.user.role !== 'delivery_agent') {
      return res.status(403).json({
        success: false,
        message: 'Only users with delivery_agent role can register as agents'
      });
    }

    const idDocUrl = id_document_url || (req.files?.id_document?.[0]?.filename ? `/uploads/${req.files.id_document[0].filename}` : null);

    let agent = await DeliveryAgent.findOne({ where: { user_id: userId } });
    if (agent) {
      if (vehicle_type !== undefined) agent.vehicle_type = vehicle_type;
      if (operating_zone !== undefined) agent.operating_zone = operating_zone;
      if (idDocUrl) agent.id_document_url = idDocUrl;
      await agent.save();
    } else {
      agent = await DeliveryAgent.create({
        user_id: userId,
        vehicle_type: vehicle_type || null,
        operating_zone: operating_zone || null,
        id_document_url: idDocUrl,
        is_available: false
      });
    }

    await logAudit({
      ...auditContext(req),
      action: 'delivery_agent.register',
      actor_user_id: userId,
      target_type: 'delivery_agent',
      target_id: agent.id,
      metadata: { vehicle_type: agent.vehicle_type, operating_zone: agent.operating_zone }
    });

    return res.json({
      success: true,
      message: 'Delivery agent profile updated',
      data: {
        id: agent.id,
        user_id: agent.user_id,
        vehicle_type: agent.vehicle_type,
        operating_zone: agent.operating_zone,
        is_available: agent.is_available
      }
    });
  } catch (error) {
    console.error('Delivery agent register error:', error);
    return res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const agent = await DeliveryAgent.findOne({
      where: { user_id: userId },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone_number'] }]
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Delivery agent profile not found'
      });
    }

    return res.json({
      success: true,
      message: 'Profile retrieved',
      data: {
        id: agent.id,
        user: agent.user,
        vehicle_type: agent.vehicle_type,
        operating_zone: agent.operating_zone,
        is_available: agent.is_available,
        decline_count: agent.decline_count
      }
    });
  } catch (error) {
    console.error('Get agent profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: error.message
    });
  }
};

export const setAvailability = async (req, res) => {
  try {
    const userId = req.user.id;
    const { is_available } = req.body;

    const agent = await DeliveryAgent.findOne({ where: { user_id: userId } });
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Delivery agent profile not found'
      });
    }

    agent.is_available = !!is_available;
    await agent.save();

    await logAudit({
      ...auditContext(req),
      action: 'delivery_agent.availability.update',
      actor_user_id: userId,
      target_type: 'delivery_agent',
      target_id: agent.id,
      metadata: { is_available: agent.is_available }
    });

    return res.json({
      success: true,
      message: 'Availability updated',
      data: { is_available: agent.is_available }
    });
  } catch (error) {
    console.error('Set availability error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update availability',
      error: error.message
    });
  }
};

export const listJobs = async (req, res) => {
  try {
    const userId = req.user.id;
    const agent = await DeliveryAgent.findOne({ where: { user_id: userId } });
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Delivery agent profile not found'
      });
    }

    const { status } = req.query;
    const where = { agent_id: agent.id };
    if (status && ['pending', 'assigned', 'accepted', 'picked_up', 'in_transit', 'delivered'].includes(status)) {
      where.status = status;
    }

    const jobs = await DeliveryJob.findAll({
      where,
      include: [
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'order_number', 'seller_id', 'shipping_address', 'shipping_phone', 'shipping_city'],
          include: [
            {
              model: User,
              as: 'seller',
              attributes: ['id', 'shop_id'],
              include: [{ model: Shop, as: 'shop', attributes: ['id', 'name'], required: false }]
            }
          ]
        }
      ],
      order: [['id', 'DESC']]
    });

    const formatted = jobs.map(j => ({
      job_id: j.id,
      order_id: j.order_id,
      order_number: j.order?.order_number,
      shop_name: j.order?.seller?.shop?.name || null,
      pickup_address: j.pickup_address,
      dropoff_address: j.dropoff_address,
      parcel_summary: j.parcel_summary,
      delivery_fee: j.delivery_fee ? parseFloat(j.delivery_fee) : undefined,
      status: j.status,
      accepted_at: j.accepted_at,
      picked_up_at: j.picked_up_at,
      delivered_at: j.delivered_at,
      created_at: j.createdAt
    }));

    return res.json({
      success: true,
      message: 'Jobs retrieved',
      data: { jobs: formatted }
    });
  } catch (error) {
    console.error('List jobs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to list jobs',
      error: error.message
    });
  }
};

export const getAvailableJobs = async (req, res) => {
  try {
    const userId = req.user.id;
    const agent = await DeliveryAgent.findOne({ where: { user_id: userId } });
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Delivery agent profile not found'
      });
    }

    const jobs = await DeliveryJob.findAll({
      where: {
        status: 'pending',
        agent_id: null
      },
      include: [
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'order_number', 'seller_id', 'shipping_address', 'shipping_phone'],
          include: [
            {
              model: User,
              as: 'seller',
              attributes: ['id', 'shop_id'],
              include: [{ model: Shop, as: 'shop', attributes: ['id', 'name'], required: false }]
            }
          ]
        }
      ],
      order: [['id', 'ASC']],
      limit: 20
    });

    const formatted = jobs.map(j => ({
      job_id: j.id,
      order_id: j.order_id,
      order_number: j.order?.order_number,
      shop_name: j.order?.seller?.shop?.name || null,
      pickup_address: j.pickup_address,
      dropoff_address: j.dropoff_address,
      parcel_summary: j.parcel_summary,
      delivery_fee: j.delivery_fee ? parseFloat(j.delivery_fee) : undefined,
      status: j.status
    }));

    return res.json({
      success: true,
      message: 'Available jobs retrieved',
      data: { jobs: formatted }
    });
  } catch (error) {
    console.error('Get available jobs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get jobs',
      error: error.message
    });
  }
};

export const acceptJob = async (req, res) => {
  try {
    const userId = req.user.id;
    const { job_id } = req.params;
    const agent = await DeliveryAgent.findOne({ where: { user_id: userId } });
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Delivery agent profile not found'
      });
    }

    const job = await DeliveryJob.findByPk(job_id, {
      include: [{ model: Order, as: 'order' }]
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    if (job.status !== 'assigned' && job.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Job cannot be accepted. Status: ${job.status}`
      });
    }

    job.agent_id = agent.id;
    job.status = 'accepted';
    job.accepted_at = new Date();
    await job.save();

    await logAudit({
      ...auditContext(req),
      action: 'delivery_agent.job.accept',
      actor_user_id: userId,
      target_type: 'delivery_job',
      target_id: job.id,
      metadata: { order_id: job.order_id, order_number: job.order?.order_number }
    });

    return res.json({
      success: true,
      message: 'Job accepted',
      data: {
        job_id: job.id,
        order_id: job.order_id,
        status: job.status,
        pickup_address: job.pickup_address,
        dropoff_address: job.dropoff_address
      }
    });
  } catch (error) {
    console.error('Accept job error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to accept job',
      error: error.message
    });
  }
};

export const declineJob = async (req, res) => {
  try {
    const userId = req.user.id;
    const { job_id } = req.params;
    const agent = await DeliveryAgent.findOne({ where: { user_id: userId } });
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Delivery agent profile not found'
      });
    }

    const job = await DeliveryJob.findByPk(job_id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    if (job.agent_id !== agent.id && job.status !== 'assigned') {
      return res.status(400).json({
        success: false,
        message: 'Job not assigned to you'
      });
    }

    agent.decline_count = (agent.decline_count || 0) + 1;
    await agent.save();

    job.agent_id = null;
    job.status = 'pending';
    await job.save();

    await logAudit({
      ...auditContext(req),
      action: 'delivery_agent.job.decline',
      actor_user_id: userId,
      target_type: 'delivery_job',
      target_id: job.id,
      metadata: { order_id: job.order_id }
    });

    return res.json({
      success: true,
      message: 'Job declined. Platform will reassign to another agent.'
    });
  } catch (error) {
    console.error('Decline job error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to decline job',
      error: error.message
    });
  }
};

export const markPickedUp = async (req, res) => {
  try {
    const userId = req.user.id;
    const { job_id } = req.params;
    const agent = await DeliveryAgent.findOne({ where: { user_id: userId } });
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Delivery agent profile not found'
      });
    }

    const job = await DeliveryJob.findByPk(job_id, {
      include: [{ model: Order, as: 'order' }]
    });

    if (!job || job.agent_id !== agent.id) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    if (job.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: `Cannot mark picked up. Status: ${job.status}`
      });
    }

    job.status = 'in_transit';
    job.picked_up_at = new Date();
    await job.save();

    const order = job.order;
    if (order) {
      order.status = 'shipped';
      await order.save();

      const pickedUpNotification = await Notification.create({
        user_id: order.user_id,
        title: 'Order Picked Up',
        message: `Your order ${order.order_number} has been picked up and is on the way.`,
        type: 'order',
        order_id: order.id,
        read: false
      });
      sendNotificationEmail(pickedUpNotification, order);
    }

    await logAudit({
      ...auditContext(req),
      action: 'delivery_agent.job.pickup',
      actor_user_id: userId,
      target_type: 'delivery_job',
      target_id: job.id,
      metadata: { order_id: job.order_id, order_number: order?.order_number }
    });

    return res.json({
      success: true,
      message: 'Parcel marked as picked up. Live tracking started.',
      data: { job_id: job.id, status: job.status }
    });
  } catch (error) {
    console.error('Mark picked up error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update',
      error: error.message
    });
  }
};

export const markDelivered = async (req, res) => {
  try {
    const userId = req.user.id;
    const { job_id } = req.params;
    const agent = await DeliveryAgent.findOne({ where: { user_id: userId } });
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Delivery agent profile not found'
      });
    }

    const job = await DeliveryJob.findByPk(job_id, {
      include: [{ model: Order, as: 'order' }]
    });

    if (!job || job.agent_id !== agent.id) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    if (job.status !== 'in_transit') {
      return res.status(400).json({
        success: false,
        message: `Cannot mark delivered. Status: ${job.status}`
      });
    }

    job.status = 'delivered';
    job.delivered_at = new Date();
    await job.save();

    const order = job.order;
    if (order) {
      order.status = 'delivered';
      order.delivered_at = new Date();
      await order.save();

      const deliveredNotification = await Notification.create({
        user_id: order.user_id,
        title: 'Order Delivered',
        message: `Your order ${order.order_number} has been delivered. Please confirm receipt within 72 hours.`,
        type: 'order',
        order_id: order.id,
        read: false
      });

      await logAudit({
        ...auditContext(req),
        action: 'delivery_agent.job.deliver',
        actor_user_id: userId,
        target_type: 'delivery_job',
        target_id: job.id,
        metadata: { order_id: job.order_id, order_number: order.order_number }
      });
      sendNotificationEmail(deliveredNotification, order);
    }

    return res.json({
      success: true,
      message: 'Delivery marked complete. Buyer 72-hour confirmation window started.',
      data: {
        job_id: job.id,
        status: job.status,
        delivery_fee: job.delivery_fee ? parseFloat(job.delivery_fee) : undefined
      }
    });
  } catch (error) {
    console.error('Mark delivered error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update',
      error: error.message
    });
  }
};
