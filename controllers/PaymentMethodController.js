import db from '../models/index.js';

// TODO: Create PaymentMethod model
// const { PaymentMethod } = db;

export const getPaymentMethods = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // TODO: Implement payment methods from database
    const paymentMethods = [];
    const availableProviders = [
      { type: 'mobile_money', provider: 'Airtel Money', icon: 'airtel_money' },
      { type: 'mobile_money', provider: 'TNM Mpamba', icon: 'tnm_mpamba' },
      { type: 'bank_transfer', provider: 'National Bank', icon: 'national_bank' }
    ];
    
    return res.json({
      success: true,
      message: 'Payment methods retrieved',
      data: {
        payment_methods: paymentMethods,
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

