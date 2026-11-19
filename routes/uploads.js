import express from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { uploadPromotionImage } from '../middleware/upload.js';
import { publicBaseUrl } from '../utils/promotion.js';

/**
 * POST /api/uploads/image (multipart field "image") → { path, url }
 * Shared image upload for the admin and seller portals (logos, product photos, banners, slides…).
 * Images only (JPEG/PNG/GIF/WebP), 10MB default limit. Store `url` (or `path`) on the record.
 */
const router = express.Router();

router.post('/image', authenticate, authorizeRoles('admin', 'seller'), (req, res) => {
  uploadPromotionImage.single('image')(req, res, (error) => {
    if (error) {
      const tooLarge = error.code === 'LIMIT_FILE_SIZE';
      return res.status(tooLarge ? 413 : 400).json({ success: false, message: tooLarge ? 'Image is too large' : error.message });
    }
    if (!req.file) return res.status(400).json({ success: false, message: 'image file is required' });
    const path = `uploads/${req.file.filename}`;
    return res.status(201).json({ success: true, message: 'Image uploaded', data: { path, url: `${publicBaseUrl()}/${path}` } });
  });
});

export default router;
