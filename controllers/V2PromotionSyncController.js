import { feed, snapshot } from '../services/catalogue/promotionSync.js';
import { CatalogueError, sendCatalogueError } from '../services/catalogue/errors.js';

async function send(kind, req, res) {
  try {
    const after = Number(req.query.after || 0);
    const limit = Number(req.query.limit || 100);
    if (!Number.isSafeInteger(after) || after < 0) throw new CatalogueError('INVALID_CURSOR', 'after must be a non-negative integer');
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw new CatalogueError('INVALID_LIMIT', 'limit must be between 1 and 500');
    return res.json({ success: true, message: `Promotion ${kind} feed retrieved`, data: await (req.query.snapshot === 'true' ? snapshot : feed)(kind, after, limit) });
  } catch (error) { return sendCatalogueError(res, error); }
}

export const devices = (req, res) => send('device', req, res);
export const shops = (req, res) => send('shop', req, res);
