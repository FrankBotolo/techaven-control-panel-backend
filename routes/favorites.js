import { updateDeviceFavorite } from "../controllers/DeviceFavoriteController.js";
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as FavoriteController from '../controllers/FavoriteController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/', FavoriteController.getFavorites);
router.post('/', FavoriteController.addToFavorites);
router.post('/devices', updateDeviceFavorite);
router.delete('/devices/:deviceId', updateDeviceFavorite);
router.get('/:productId', FavoriteController.checkFavorite);
router.delete('/:productId', FavoriteController.removeFromFavorites);

export default router;

