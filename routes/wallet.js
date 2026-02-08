import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as WalletController from '../controllers/WalletController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/', WalletController.getWallet);
router.get('/transactions', WalletController.getTransactions);
router.post('/topup', WalletController.topUpWallet);

export default router;

