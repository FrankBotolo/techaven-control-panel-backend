import db from '../models/index.js';
import { CatalogueError, sendCatalogueError } from '../services/catalogue/errors.js';

const { CatalogueProductRequest } = db;

const EDITABLE = ['brand', 'model', 'model_number', 'ram_gb', 'storage_gb', 'network_generation', 'notes', 'proof_url'];
const pick = (body) => Object.fromEntries(EDITABLE.filter((k) => body[k] !== undefined).map((k) => [k, body[k] === '' ? null : body[k]]));

export async function create(req, res) {
  try {
    if (!req.body.brand || !req.body.model) throw new CatalogueError('INVALID_PRODUCT_REQUEST', 'brand and model are required');
    const request = await CatalogueProductRequest.create({ ...pick(req.body), shop_id: req.user.shop_id, requested_by: req.user.id, status: 'pending' });
    return res.status(201).json({ success: true, message: 'Catalogue product request submitted', data: request });
  } catch (error) { return sendCatalogueError(res, error); }
}

/** GET /api/v2/catalog/product-requests — the seller's own shop requests, newest first. */
export async function listMine(req, res) {
  try {
    const where = { shop_id: req.user.shop_id };
    if (['pending', 'approved', 'rejected'].includes(req.query.status)) where.status = req.query.status;
    const rows = await CatalogueProductRequest.findAll({ where, order: [['id', 'DESC']] });
    return res.json({ success: true, message: 'Product requests retrieved', data: rows });
  } catch (error) { return sendCatalogueError(res, error); }
}

async function ownPending(req) {
  const request = await CatalogueProductRequest.findOne({ where: { id: req.params.id, shop_id: req.user.shop_id } });
  if (!request) throw new CatalogueError('PRODUCT_REQUEST_NOT_FOUND', 'Product request not found', 404);
  if (request.status !== 'pending') throw new CatalogueError('PRODUCT_REQUEST_REVIEWED', 'Reviewed requests can no longer be changed', 409);
  return request;
}

/** PATCH /api/v2/catalog/product-requests/:id — edit while still pending. */
export async function update(req, res) {
  try {
    const request = await ownPending(req);
    const changes = pick(req.body);
    if (changes.brand === null || changes.model === null) throw new CatalogueError('INVALID_PRODUCT_REQUEST', 'brand and model are required');
    await request.update(changes);
    return res.json({ success: true, message: 'Product request updated', data: request });
  } catch (error) { return sendCatalogueError(res, error); }
}

/** DELETE /api/v2/catalog/product-requests/:id — withdraw while still pending. */
export async function remove(req, res) {
  try {
    const request = await ownPending(req);
    await request.destroy();
    return res.json({ success: true, message: 'Product request withdrawn', data: null });
  } catch (error) { return sendCatalogueError(res, error); }
}
