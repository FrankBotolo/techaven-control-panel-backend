import { sendSms, getSmsBalance, isSmsConfigured } from '../services/smsService.js';

/** POST /api/sms/send — send SMS (auth required) */
export const send = async (req, res) => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        message: 'phone and message are required',
        data: null
      });
    }
    const result = await sendSms(phone, message);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || 'Failed to send SMS',
        data: null
      });
    }
    return res.json({
      success: true,
      message: 'SMS sent successfully',
      data: null
    });
  } catch (error) {
    console.error('SMS send error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send SMS',
      data: null,
      error: error.message
    });
  }
};

/** GET /api/sms/balance — SMS gateway account balance (auth required) */
export const balance = async (req, res) => {
  try {
    if (!isSmsConfigured()) {
      return res.json({
        success: true,
        message: 'SMS balance',
        data: { balance: 0, currency: 'credits', configured: false }
      });
    }
    const result = await getSmsBalance();
    return res.json({
      success: true,
      message: 'SMS balance retrieved',
      data: result && result.balance != null ? { balance: result.balance, currency: 'credits' } : { balance: 0, currency: 'credits' }
    });
  } catch (error) {
    console.error('SMS balance error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get SMS balance',
      data: null,
      error: error.message
    });
  }
};
