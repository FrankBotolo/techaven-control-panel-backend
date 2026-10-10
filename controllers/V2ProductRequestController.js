import db from '../models/index.js';
import { CatalogueError, sendCatalogueError } from '../services/catalogue/errors.js';

const { CatalogueProductRequest } = db;

export async function create(req, res) {
  try {
    if (!req.body.brand || !req.body.model) throw new CatalogueError('INVALID_PRODUCT_REQUEST', 'brand and model are required');
    const request = await CatalogueProductRequest.create({ ...req.body, shop_id: req.user.shop_id, requested_by: req.user.id, status: 'pending' });
    return res.status(201).json({ success: true, message: 'Catalogue product request submitted', data: request });
  } catch (error) { return sendCatalogueError(res, error); }
}
