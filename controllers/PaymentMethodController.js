import db from '../models/index.js';

const { PaymentMethod } = db;

export const getPaymentMethods = async (req, res) => {
  try {
    const methods = await PaymentMethod.findAll({
      where: { is_active: true },
      order: [['sort_order', 'ASC']],
      attributes: ['id', 'name', 'slug', 'psp_id', 'provider', 'icon']
    });

    const availableProviders = methods.map((m) => ({
      id: m.id,
      name: m.name,
      slug: m.slug,
      psp_id: m.psp_id,
      provider: m.provider,
      icon: m.icon || m.slug
    }));

    return res.json({
      success: true,
      message: 'Payment methods retrieved',
      data: {
        payment_methods: [],
        available_providers: availableProviders
      }
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment methods',
      error: error.message
    });
  }
};

export const addPaymentMethod = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, provider, phone_number, is_default } = req.body;
    
    // TODO: Implement payment method creation
    const paymentMethodId = `pm_${Date.now()}`;
    
    return res.status(201).json({
      success: true,
      message: 'Payment method added',
      data: {
        id: paymentMethodId
      }
    });
  } catch (error) {
    console.error('Add payment method error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add payment method',
      error: error.message
    });
  }
};

export const deletePaymentMethod = async (req, res) => {
  try {
    const userId = req.user.id;
    const { payment_method_id } = req.params;
    
    // TODO: Implement payment method deletion
    
    return res.json({
      success: true,
      message: 'Payment method deleted',
      data: null
    });
  } catch (error) {
    console.error('Delete payment method error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete payment method',
      error: error.message
    });
  }
};

