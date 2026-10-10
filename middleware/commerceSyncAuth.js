import crypto from 'node:crypto';

export function authenticateCommerceSync(req, res, next) {
  const configured = process.env.COMMERCE_SYNC_TOKEN || '';
  const header = req.headers.authorization || '';
  const supplied = header.startsWith('Bearer ') ? header.slice(7) : '';
  const valid = configured && supplied && configured.length === supplied.length &&
    crypto.timingSafeEqual(Buffer.from(configured), Buffer.from(supplied));
  if (!valid) return res.status(401).json({ success: false, message: 'Invalid commerce sync token', data: null });
  return next();
}
