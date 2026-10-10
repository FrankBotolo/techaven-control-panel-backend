import db from '../models/index.js';
import { createListingFromLegacy } from '../services/catalogue/legacyMigration.js';
import { CatalogueError, sendCatalogueError } from '../services/catalogue/errors.js';

const { LegacyProductCatalogueLink, Product, DeviceVariant, SellerListing, CatalogueProductRequest, sequelize } = db;

export async function listMappings(req, res) {
  try {
    const where = req.query.status ? { match_status: req.query.status } : {};
    const rows = await LegacyProductCatalogueLink.findAll({ where, include: [{ model: Product, as: 'product' }, { model: DeviceVariant, as: 'candidate_variant' }, { model: SellerListing, as: 'seller_listing' }], order: [['id', 'ASC']] });
    return res.json({ success: true, message: 'Legacy mappings retrieved', data: rows });
  } catch (error) { return sendCatalogueError(res, error); }
}

export async function reviewMapping(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const link = await LegacyProductCatalogueLink.findByPk(req.params.id, { include: [{ model: Product, as: 'product' }], transaction, lock: transaction.LOCK.UPDATE });
    if (!link) throw new CatalogueError('LEGACY_MAPPING_NOT_FOUND', 'Legacy mapping not found', 404);
    if (req.body.status === 'rejected') {
      await link.update({ match_status: 'rejected', reviewed_by: req.user.id, reviewed_at: new Date() }, { transaction });
    } else if (req.body.status === 'confirmed') {
      const variantId = Number(req.body.device_variant_id || link.candidate_variant_id);
      if (!await DeviceVariant.findByPk(variantId, { transaction })) throw new CatalogueError('VARIANT_NOT_FOUND', 'Variant not found', 404);
      const listing = await createListingFromLegacy(link.product, variantId, transaction);
      await link.update({ candidate_variant_id: variantId, seller_listing_id: listing.id, match_status: 'confirmed', reviewed_by: req.user.id, reviewed_at: new Date() }, { transaction });
    } else throw new CatalogueError('INVALID_REVIEW_STATUS', 'status must be confirmed or rejected');
    await transaction.commit();
    return res.json({ success: true, message: 'Legacy mapping reviewed', data: link });
  } catch (error) { await transaction.rollback(); return sendCatalogueError(res, error); }
}

export async function listProductRequests(req, res) {
  try { return res.json({ success: true, message: 'Product requests retrieved', data: await CatalogueProductRequest.findAll({ order: [['id', 'ASC']] }) }); }
  catch (error) { return sendCatalogueError(res, error); }
}

export async function reviewProductRequest(req, res) {
  try {
    if (!['approved', 'rejected'].includes(req.body.status)) throw new CatalogueError('INVALID_REVIEW_STATUS', 'status must be approved or rejected');
    const request = await CatalogueProductRequest.findByPk(req.params.id);
    if (!request) throw new CatalogueError('PRODUCT_REQUEST_NOT_FOUND', 'Product request not found', 404);
    await request.update({ status: req.body.status, resolution_notes: req.body.resolution_notes || null, reviewed_by: req.user.id, reviewed_at: new Date() });
    return res.json({ success: true, message: 'Product request reviewed', data: request });
  } catch (error) { return sendCatalogueError(res, error); }
}
