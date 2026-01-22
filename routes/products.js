import express from 'express';
import * as ProductController from '../controllers/ProductController.js';
import * as ProductImageController from '../controllers/ProductImageController.js';

const router = express.Router();

router.get('/', ProductController.index);
router.get('/featured', ProductController.featured);
router.get('/hot-sales', ProductController.hot);
router.get('/special-offers', ProductController.special);
router.get('/search', ProductController.search);
router.get('/category/:id', ProductController.byCategory);

// Product images CRUD routes (must be before /:id route)
router.get('/:id/images', ProductImageController.getImages);
router.post('/:id/images', ProductImageController.addImages);
router.put('/:id/images', ProductImageController.replaceImages);
router.delete('/:id/images', ProductImageController.deleteAllImages);
router.put('/:id/images/:index', ProductImageController.updateImage);
router.delete('/:id/images/:index', ProductImageController.deleteImage);

router.get('/:id', ProductController.show);

export default router;

