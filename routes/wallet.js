import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as WalletController from '../controllers/WalletController.js';

const router = express.Router();

// Wallet is for sellers only (earnings/withdrawals). Customers pay at checkout via card, mobile money, etc.
router.use(authenticate);
router.use(WalletController.requireSeller);

router.get('/', WalletController.getWallet);
router.get('/transactions', WalletController.getTransactions);
router.post('/topup', WalletController.topUpWallet);

export default router;

