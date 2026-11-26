import express from 'express';
import multer from 'multer';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { uploadDeliveryProof, uploadImage, uploadPaymentProof } from '../controllers/UploadController.js';

const router = express.Router();

/**
 * Files are held in memory so their bytes are verified before anything is stored.
 * Field "file" is preferred; "image" is still accepted for existing callers.
 */
const receive = (maxBytes, label) => {
  const handler = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1 }
  }).fields([{ name: 'file', maxCount: 1 }, { name: 'image', maxCount: 1 }]);
  return (req, res, next) =>
    handler(req, res, (error) => {
      if (error) {
        const tooLarge = error.code === 'LIMIT_FILE_SIZE';
        return res.status(tooLarge ? 413 : 400).json({
          success: false,
          message: tooLarge ? `${label} is too large` : `${label} upload is invalid`
        });
      }
      req.file = req.files?.file?.[0] || req.files?.image?.[0];
      return next();
    });
};

const windows = new Map();
const limitRate = (req, res, next) => {
  const now = Date.now();
  const existing = windows.get(req.user.id);
  const entry = existing && existing.until > now ? existing : { count: 0, until: now + 60000 };
  if (windows.size > 5000) {
    for (const [id, value] of windows) if (value.until < now) windows.delete(id);
  }
  windows.set(req.user.id, entry);
  if (++entry.count > 30) {
    return res.status(429).json({ success: false, message: 'Please wait a minute and try again' });
  }
  return next();
};

const imageLimit = parseInt(process.env.PROMOTION_MAX_FILE_SIZE, 10) || 10485760;

router.post(
  '/image',
  authenticate, authorizeRoles('admin', 'seller'), limitRate,
  receive(imageLimit, 'Image'), uploadImage
);
router.post(
  '/delivery-proof',
  authenticate, limitRate,
  receive(10 * 1024 * 1024, 'Proof'), uploadDeliveryProof
);
router.post(
  '/payment-proof',
  authenticate, limitRate,
  receive(10 * 1024 * 1024, 'Receipt'), uploadPaymentProof
);

// Promotion artwork in the admin portal uses the same verified R2 upload.
export const receivePromotionImage = receive(imageLimit, 'Image');

export default router;
