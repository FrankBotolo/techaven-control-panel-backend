import express from 'express';
import { Op } from 'sequelize';
import db from '../models/index.js';
import { authenticate, authorizeRoles, requireApprovedSeller } from '../middleware/auth.js';
import { campaignGateway, campaign, eligibleListing, offerSnapshot, unchangedOffer, approvedDevices, ensurePromotionSlot, fail } from '../services/promotion-participation.js';
import { logAudit, auditContext } from '../utils/audit.js';

const router = express.Router();
router.param('id', (req, res, next, value) => {
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) return res.status(400).json({ success: false, message: 'Invalid participation request ID' });
  next();
});
const route = handler => async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try { const data = await handler(req); res.json({ success: true, data }); }
  catch (error) { if (!error.status) console.error('Promotion participation failed:', error.message); res.status(error.status || 503).json({ success: false, message: error.status ? error.message : 'Unable to process promotion participation. Please retry.' }); }
};
router.get('/campaigns', route(() => campaignGateway.load()));
router.get('/offers/:slug', route(req => approvedDevices(req.params.slug)));
router.use(authenticate, authorizeRoles('admin', 'seller'));
router.use((req, res, next) => req.user.role === 'seller' ? requireApprovedSeller(req, res, next) : next());

router.get('/candidates', route(async req => {
  const where = { status: 'active', quantity: { [Op.gt]: 0 }, ...(req.user.role === 'seller' ? { shop_id: req.user.shop_id } : {}) };
  const search = String(req.query.search || '').trim().slice(0, 100);
  return (await db.SellerListing.findAll({ where, limit: 100, order: [['id', 'DESC']], include: [
    { model: db.Shop, as: 'shop', where: { status: 'active', application_status: 'approved' } },
    { model: db.DeviceVariant, as: 'variant', where: { is_active: true }, include: [{ model: db.Device, as: 'device', where: { is_active: true, ...(search ? { name: { [Op.like]: `%${search}%` } } : {}) }, include: [{ model: db.Brand, as: 'brand', where: { is_active: true } }] }] },
  ] })).map(row => ({ id: row.id, shop_id: row.shop_id, shop_name: row.shop.name,
    product_name: row.variant.device.name, condition: row.condition, price: Number(row.price), currency: row.currency, quantity: row.quantity,
    ram_gb: row.variant.ram_gb, storage_gb: row.variant.storage_gb }));
}));
router.get('/requests', route(async req => {
  const replacements = [];
  let where = '1=1';
  if (req.user.role === 'seller') { where += ' AND p.shop_id=?'; replacements.push(req.user.shop_id); }
  if (req.query.campaign) { where += ' AND p.campaign_slug=?'; replacements.push(String(req.query.campaign)); }
  const [rows] = await db.sequelize.query(`SELECT p.*,s.name AS shop_name,d.name AS product_name,l.price AS current_price,l.currency AS current_currency,l.quantity AS current_quantity
    FROM promotion_participations p JOIN shops s ON s.id=p.shop_id JOIN seller_listings l ON l.id=p.listing_id JOIN device_variants v ON v.id=l.device_variant_id JOIN devices d ON d.id=v.device_id
    WHERE ${where} ORDER BY p.updated_at DESC,p.id DESC LIMIT 200`, { replacements });
  return rows;
}));
router.post('/requests', route(async req => {
  const slug = req.body?.campaign_slug;
  await campaign(slug);
  const result = await db.sequelize.transaction(async transaction => {
    const listing = await eligibleListing(req.body.listing_id, transaction);
    if (req.user.role === 'seller' && listing.shop_id !== req.user.shop_id) throw fail('You can submit only your own shop offers', 403);
    const status = req.user.role === 'admin' ? 'approved' : 'pending';
    if (status === 'approved') await ensurePromotionSlot(slug, listing.id, transaction);
    const snapshot = JSON.stringify(offerSnapshot(listing));
    const [existing] = await db.sequelize.query('SELECT * FROM promotion_participations WHERE campaign_slug=? AND listing_id=? FOR UPDATE', { replacements: [slug, listing.id], transaction });
    if (existing.length && req.user.role === 'seller' && ['pending', 'approved'].includes(existing[0].status) && unchangedOffer(listing, existing[0].offer_snapshot))
      return existing[0];
    await db.sequelize.query(`INSERT INTO promotion_participations (campaign_slug,shop_id,listing_id,requested_by,status,offer_snapshot,reviewed_by,reviewed_at)
      VALUES (?,?,?,?,?,CAST(? AS JSON),?,?) ON DUPLICATE KEY UPDATE requested_by=VALUES(requested_by),status=VALUES(status),offer_snapshot=VALUES(offer_snapshot),review_note=NULL,reviewed_by=VALUES(reviewed_by),reviewed_at=VALUES(reviewed_at)`, {
      replacements: [slug, listing.shop_id, listing.id, req.user.id, status, snapshot, status === 'approved' ? req.user.id : null, status === 'approved' ? new Date() : null], transaction,
    });
    const [rows] = await db.sequelize.query('SELECT * FROM promotion_participations WHERE campaign_slug=? AND listing_id=?', { replacements: [slug, listing.id], transaction });
    return rows[0];
  });
  await logAudit({ ...auditContext(req), actor_user_id: req.user.id, action: `promotion.offer.${result.status}`, target_type: 'promotion_participation', target_id: result.id, metadata: { campaign_slug: slug, listing_id: result.listing_id } });
  return result;
}));
router.patch('/requests/:id', authorizeRoles('admin'), route(async req => {
  const status = req.body?.status, note = String(req.body?.note || '').trim().slice(0, 1000);
  if (!['approved', 'rejected'].includes(status)) throw fail('Choose approve or reject');
  if (status === 'rejected' && !note) throw fail('Give the shop a reason for rejection');
  const result = await db.sequelize.transaction(async transaction => {
    const [rows] = await db.sequelize.query('SELECT * FROM promotion_participations WHERE id=? FOR UPDATE', { replacements: [req.params.id], transaction });
    if (!rows[0]) throw fail('Participation request not found', 404);
    const row = rows[0];
    if (row.status === 'withdrawn') throw fail('The shop has withdrawn this offer', 409);
    await campaign(row.campaign_slug);
    const listing = status === 'approved' ? await eligibleListing(row.listing_id, transaction) : null;
    if (listing) await ensurePromotionSlot(row.campaign_slug, listing.id, transaction);
    await db.sequelize.query('UPDATE promotion_participations SET status=?,review_note=?,reviewed_by=?,reviewed_at=NOW(),offer_snapshot=CAST(? AS JSON) WHERE id=?', {
      replacements: [status, note || null, req.user.id, listing ? JSON.stringify(offerSnapshot(listing)) : JSON.stringify(typeof row.offer_snapshot === 'string' ? JSON.parse(row.offer_snapshot) : row.offer_snapshot), row.id], transaction,
    });
    return { id: row.id, status };
  });
  await logAudit({ ...auditContext(req), actor_user_id: req.user.id, action: `promotion.offer.${status}`, target_type: 'promotion_participation', target_id: result.id });
  return result;
}));
router.delete('/requests/:id', route(async req => {
  const [rows] = await db.sequelize.query('SELECT id,shop_id FROM promotion_participations WHERE id=?', { replacements: [req.params.id] });
  if (!rows[0] || (req.user.role === 'seller' && rows[0].shop_id !== req.user.shop_id)) throw fail('Participation request not found', 404);
  await db.sequelize.query("UPDATE promotion_participations SET status='withdrawn' WHERE id=?", { replacements: [req.params.id] });
  return { id: rows[0].id, status: 'withdrawn' };
}));
export default router;
