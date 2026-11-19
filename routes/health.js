import express from 'express';
import db from '../models/index.js';

const router = express.Router();

/** GET /api/health — liveness + database connectivity. */
router.get('/', async (req, res) => {
  try {
    await db.sequelize.query('SELECT 1');
    return res.json({ status: 'ok' });
  } catch {
    return res.status(503).json({ status: 'unavailable' });
  }
});

export default router;
