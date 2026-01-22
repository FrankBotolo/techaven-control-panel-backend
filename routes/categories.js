import express from 'express';
import * as CategoryController from '../controllers/CategoryController.js';

const router = express.Router();

router.get('/', CategoryController.index);
router.get('/:id/products', CategoryController.getProductsByCategory);

export default router;

