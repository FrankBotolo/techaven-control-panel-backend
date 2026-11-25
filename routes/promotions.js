import express from 'express';
import * as PromotionController from '../controllers/PromotionController.js';

const router = express.Router();

// Public storefront reads (no auth). Static paths must come before /:slug.
router.get('/active', PromotionController.active);
router.get('/preview/:id', PromotionController.preview);
router.get('/:slug', PromotionController.findBySlug);

export default router;
