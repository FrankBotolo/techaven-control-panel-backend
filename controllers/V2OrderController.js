import { randomUUID } from 'node:crypto';
import db from '../models/index.js';
import { assertFinalPrice } from '../services/marketplace/final-price.js';
import { CatalogueError, sendCatalogueError } from '../services/catalogue/errors.js';
import { getSellerCommissionPercent, computeSellerEscrowSplit } from '../utils/sellerCommission.js';
import { enqueueDevice } from '../services/catalogue/promotionSync.js';

const { Cart, SellerListing, DeviceVariant, Device, Brand, Shop, User, Order, OrderItem, ShippingAddress, CourierService, sequelize } = db;
const orderNumber = () => `ORD${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${Math.floor(Math.random() * 1e8).toString().padStart(8, '0')}`;

export async function checkout(req, res) {
  const shippingAddressId = Number(req.body?.shipping_address_id);
  if (!Number.isInteger(shippingAddressId) || shippingAddressId < 1) {
    return sendCatalogueError(res, new CatalogueError('SHIPPING_ADDRESS_REQUIRED', 'shipping_address_id is required'));
  }
  const transaction = await sequelize.transaction();
  try {
    const address = await ShippingAddress.findOne({ where: { id: shippingAddressId, user_id: req.user.id }, transaction });
    if (!address) throw new CatalogueError('SHIPPING_ADDRESS_NOT_FOUND', 'Shipping address not found', 404);
    // Same contract as the mobile app's POST /api/orders: optional, must be an active courier.
    const fulfilment = req.body.fulfilment === 'pickup' ? 'pickup' : 'delivery';
    let courier = null;
    if (fulfilment === 'delivery' && req.body.courier_service_id != null && req.body.courier_service_id !== '') {
      const courierId = Number(req.body.courier_service_id);
      courier = Number.isSafeInteger(courierId) && courierId > 0
        ? await CourierService.findOne({ where: { id: courierId, is_active: true }, transaction })
        : null;
      if (!courier) throw new CatalogueError('INVALID_COURIER', 'Invalid or inactive courier service selected');
    }
    const requested = Array.isArray(req.body.items) && req.body.items.length
      ? req.body.items.map((item) => ({ seller_listing_id: Number(item.seller_listing_id), quantity: Number(item.quantity || 1) }))
      : (await Cart.findAll({ where: { user_id: req.user.id, product_id: null }, transaction })).map((item) => ({ seller_listing_id: item.seller_listing_id, quantity: item.quantity }));
    if (!requested.length) throw new CatalogueError('EMPTY_CART', 'No listing items supplied');
    const groups = new Map();
    for (const request of requested) {
      if (!request.seller_listing_id || !Number.isInteger(request.quantity) || request.quantity < 1) throw new CatalogueError('INVALID_QUANTITY', 'Every item requires a valid listing and quantity');
      const listing = await SellerListing.findByPk(request.seller_listing_id, { include: [{ model: Shop, as: 'shop' }, { model: DeviceVariant, as: 'variant', include: [{ model: Device, as: 'device', include: [{ model: Brand, as: 'brand' }] }] }], transaction, lock: transaction.LOCK.UPDATE });
      if (!listing || listing.status !== 'active' || !listing.variant?.is_active || !listing.variant?.device?.is_active || !listing.variant?.device?.brand?.is_active || listing.shop?.status !== 'active' || listing.shop?.application_status !== 'approved') throw new CatalogueError('LISTING_NOT_FOUND', `Eligible active listing not found: ${request.seller_listing_id}`, 404);
      assertFinalPrice(listing);
      if (listing.quantity < request.quantity) throw new CatalogueError('INSUFFICIENT_STOCK', `Insufficient stock for listing ${listing.id}`, 409);
      const rows = groups.get(listing.shop_id) || [];
      rows.push({ listing, quantity: request.quantity });
      groups.set(listing.shop_id, rows);
    }
    const commission = await getSellerCommissionPercent();
    const orders = [];
    const checkoutGroup = randomUUID();
    for (const [shopId, items] of groups) {
      const subtotal = items.reduce((sum, item) => sum + Number(item.listing.price) * item.quantity, 0);
      const split = computeSellerEscrowSplit(subtotal, commission);
      const seller = await User.findOne({ where: { shop_id: shopId, role: 'seller' }, transaction });
      const order = await Order.create({
        checkout_group_id: checkoutGroup,
        delivery_location: { latitude: address.latitude, longitude: address.longitude, accuracy: address.location_accuracy, notes: address.delivery_notes },
        user_id: req.user.id, order_number: orderNumber(), shipping_address_id: address.id,
        subtotal, shipping_fee: 0, total_amount: subtotal,
        shipping_address: [address.address, address.city, address.region].filter(Boolean).join(', '),
        shipping_city: address.city, shipping_phone: address.phone,
        payment_method: req.body.payment_method || null, seller_id: seller?.id || null,
        courier_service: courier?.name || null, courier_service_id: courier?.id || null, fulfilment_type: fulfilment,
        escrow_status: 'pending', escrow_amount: split.netToSeller,
        seller_gross_subtotal: split.gross, platform_commission_percent: split.percent,
        platform_fee_amount: split.platformFee, notes: req.body.notes || null
      }, { transaction });
      for (const { listing, quantity } of items) {
        const variant = listing.variant;
        const device = variant.device;
        await OrderItem.create({
          order_id: order.id, product_id: null, seller_listing_id: listing.id,
          product_name: `${device.brand?.name || ''} ${device.name}`.trim(), product_image: device.primary_image_url,
          quantity, price: listing.price, subtotal: Number(listing.price) * quantity,
          canonical_snapshot: { device_id: device.id, device_name: device.name, brand: device.brand?.name || null, variant_id: variant.id, ram_gb: variant.ram_gb, storage_gb: variant.storage_gb, network_generation: variant.network_generation },
          listing_snapshot: { shop_id: listing.shop_id, merchant_sku: listing.merchant_sku, condition: listing.condition, currency: listing.currency, warranty_months: listing.warranty_months }
        }, { transaction });
        listing.quantity -= quantity;
        await listing.save({ transaction });
        await enqueueDevice(device.id, { transaction, reason: `checkout:${order.id}:${listing.id}:${listing.updatedAt.toISOString()}` });
      }
      orders.push(order);
    }
    await Cart.destroy({ where: { user_id: req.user.id, product_id: null }, transaction });
    await transaction.commit();
    return res.status(201).json({ success: true, message: 'Order created successfully', data: { orders } });
  } catch (error) {
    await transaction.rollback();
    return sendCatalogueError(res, error);
  }
}
