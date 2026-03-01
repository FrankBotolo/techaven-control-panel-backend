import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as WalletController from '../controllers/WalletController.js';

const router = express.Router();

// API doc: wallet for all authenticated users (customer + seller)
router.use(authenticate);

router.get('/', WalletController.getWallet);
router.get('/balance', WalletController.getBalance);
router.get('/transactions', WalletController.getTransactions);
router.post('/topup', WalletController.topUpWallet);

export default router;

