import db from '../models/index.js';

const { Shop } = db;

export const getStatus = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    if (user.role !== 'seller') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden'
      });
    }

    let onboardingStatus = 'unknown';
    let message = '';
    let shopData = null;

    if (!user.is_verified) {
      onboardingStatus = 'account_unverified';
      message = 'Your account is not yet verified. Please verify OTP to continue.';
    } else if (!user.shop_id) {
      onboardingStatus = 'no_shop';
      message = 'You are not yet linked to any shop.';
    } else {
      const shop = await Shop.findByPk(user.shop_id);

      if (!shop) {
        onboardingStatus = 'no_shop';
        message = 'Your assigned shop could not be found.';
      } else {
        shopData = {
          id: shop.id,
          name: shop.name,
          status: shop.status,
          application_status: shop.application_status,
          is_verified: shop.is_verified,
          logo: shop.logo
        };

        if (shop.application_status === 'pending') {
          onboardingStatus = 'pending_approval';
          message = 'Your shop registration is pending admin approval.';
        } else if (shop.application_status === 'rejected') {
          onboardingStatus = 'rejected';
          message = 'Your shop registration was rejected by admin.';
        } else if (shop.application_status === 'approved' && shop.status === 'active') {
          onboardingStatus = 'approved';
          message = 'Your shop has been approved and is active.';
        } else {
          onboardingStatus = 'inactive';
          message = 'Your shop is currently inactive.';
        }
      }
    }

    return res.json({
      success: true,
      message,
      data: {
        onboarding_status: onboardingStatus,
        seller: {
          id: user.id,
          full_name: user.name,
          email: user.email,
          phone_number: user.phone_number,
          is_verified: user.is_verified,
          shop_id: user.shop_id
        },
        shop: shopData
      }
    });
  } catch (error) {
    console.error('Seller onboarding status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch seller onboarding status',
      error: error.message
    });
  }
};
