import express from 'express';
import * as UserController from '../controllers/UserController.js';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/profile', UserController.profile);
router.put('/profile', UserController.updateProfile);
router.post('/avatar', upload.single('avatar'), UserController.uploadAvatar);
router.post('/change-password', UserController.changePassword);

export default router;

