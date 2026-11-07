import * as Setup from '../controllers/CustomerSetupController.js';
import express from 'express';
import * as UserController from '../controllers/UserController.js';
import * as PointsController from '../controllers/PointsController.js';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

router.get('/points/balances', PointsController.getPointBalances);
router.post('/points/redeem', PointsController.redeemPoints);

router.get('/setup', Setup.getSetup);
router.post('/setup/address-complete', Setup.completeAddress);
router.post('/setup/payment-skip', Setup.skipPayment);

router.get('/profile', UserController.profile);
router.put('/profile', UserController.updateProfile);
router.post('/avatar', upload.single('avatar'), UserController.uploadAvatar);
router.put('/password', UserController.changePassword);
router.post('/change-password', UserController.changePassword);
router.delete('/account', UserController.deleteAccount);

export default router;

