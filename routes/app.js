import express from 'express';
import * as AppController from '../controllers/AppController.js';

const router = express.Router();

router.get('/info', AppController.getAppInfo);

export default router;

