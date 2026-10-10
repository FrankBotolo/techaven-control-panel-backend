import db from '../models/index.js';
import { CatalogueError, sendCatalogueError } from '../services/catalogue/errors.js';

const { Cart, SellerListing, ListingImage, DeviceVariant, Device, Shop } = db;
const listingInclude = { model: SellerListing, as: 'seller_listing', include: [{ model: ListingImage, as: 'images' }, { model: Shop, as: 'shop', attributes: ['id', 'name'] }, { model: DeviceVariant, as: 'variant', include: [{ model: Device, as: 'device' }] }] };

const dto = (item) => ({
  id: `item_${item.id}`,
  seller_listing_id: item.seller_listing_id,
  quantity: item.quantity,
  unit_price: Number(item.seller_listing.price),
  subtotal: Number(item.seller_listing.price) * item.quantity,
  is_available: item.seller_listing.status === 'active' && item.seller_listing.quantity >= item.quantity,
  listing: item.seller_listing
});

export async function getCart(req, res) {
  try {
    const rows = await Cart.findAll({ where: { user_id: req.user.id, product_id: null }, include: [listingInclude], order: [['id', 'DESC']] });
    const items = rows.filter((row) => row.seller_listing).map(dto);
    return res.json({ success: true, message: 'Cart retrieved', data: { id: `cart_${req.user.id}`, items, summary: { subtotal: items.reduce((sum, item) => sum + item.subtotal, 0), currency: 'MWK', item_count: items.reduce((sum, item) => sum + item.quantity, 0) } } });
  } catch (error) { return sendCatalogueError(res, error); }
}

export async function add(req, res) {
  try {
    const quantity = Number(req.body.quantity || 1);
    if (!Number.isInteger(quantity) || quantity < 1) throw new CatalogueError('INVALID_QUANTITY', 'quantity must be at least one');
    const listing = await SellerListing.findByPk(req.body.seller_listing_id);
    if (!listing || listing.status !== 'active') throw new CatalogueError('LISTING_NOT_FOUND', 'Active listing not found', 404);
    if (listing.quantity < quantity) throw new CatalogueError('INSUFFICIENT_STOCK', 'Insufficient listing stock', 409);
    const [item, created] = await Cart.findOrCreate({ where: { user_id: req.user.id, seller_listing_id: listing.id }, defaults: { product_id: null, quantity } });
    if (!created) throw new CatalogueError('DUPLICATE_CART_ITEM', 'Listing is already in the cart', 409);
    return res.status(201).json({ success: true, message: 'Listing added to cart', data: { item_id: `item_${item.id}` } });
  } catch (error) { return sendCatalogueError(res, error); }
}

export async function update(req, res) {
  try {
    const quantity = Number(req.body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) throw new CatalogueError('INVALID_QUANTITY', 'quantity must be at least one');
    const id = String(req.params.item_id).replace('item_', '');
    const item = await Cart.findOne({ where: { id, user_id: req.user.id, product_id: null }, include: [listingInclude] });
    if (!item) throw new CatalogueError('CART_ITEM_NOT_FOUND', 'Cart item not found', 404);
    if (item.seller_listing.status !== 'active' || item.seller_listing.quantity < quantity) throw new CatalogueError('INSUFFICIENT_STOCK', 'Listing is unavailable or has insufficient stock', 409);
    item.quantity = quantity;
    await item.save();
    return res.json({ success: true, message: 'Cart item updated', data: dto(item) });
  } catch (error) { return sendCatalogueError(res, error); }
}

export async function remove(req, res) {
  try {
    const id = String(req.params.item_id).replace('item_', '');
    const removed = await Cart.destroy({ where: { id, user_id: req.user.id, product_id: null } });
    if (!removed) throw new CatalogueError('CART_ITEM_NOT_FOUND', 'Cart item not found', 404);
    return res.json({ success: true, message: 'Cart item removed', data: null });
  } catch (error) { return sendCatalogueError(res, error); }
}

export async function clear(req, res) {
  try {
    await Cart.destroy({ where: { user_id: req.user.id, product_id: null } });
    return res.json({ success: true, message: 'Cart cleared', data: null });
  } catch (error) { return sendCatalogueError(res, error); }
}
