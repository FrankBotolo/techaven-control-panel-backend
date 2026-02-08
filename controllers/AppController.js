export const getAppInfo = async (req, res) => {
  try {
    return res.json({
      success: true,
      message: 'App info retrieved',
      data: {
        app_name: 'Techaven',
        version: '1.0.0',
        min_version: '1.0.0',
        force_update: false,
        update_url: 'https://play.google.com/store/apps/details?id=mw.techaven.app',
        terms_url: 'https://techaven.mw/terms',
        privacy_url: 'https://techaven.mw/privacy',
        support_email: 'support@techaven.mw',
        support_phone: '+265991234567',
        social_links: {
          facebook: 'https://facebook.com/techavenmw',
          instagram: 'https://instagram.com/techavenmw',
          twitter: 'https://twitter.com/techavenmw'
        }
      }
    });
  } catch (error) {
    console.error('Get app info error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve app info',
      error: error.message
    });
  }
};

