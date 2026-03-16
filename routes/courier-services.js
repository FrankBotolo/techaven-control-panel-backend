import express from 'express';
import * as CourierController from '../controllers/CourierController.js';

const router = express.Router();

router.get('/', CourierController.listActive);

export default router;
