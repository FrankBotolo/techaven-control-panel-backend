import { randomUUID } from 'node:crypto';
import { contentTypeFor, imageExtension, receiptExtension } from '../utils/imageType.js';
import { saveObject } from '../services/storage/objectStore.js';

const failure = (res, error, fallback) => {
  console.error(`${fallback}:`, error);
  const unavailable = error.status === 503;
  return res.status(unavailable ? 503 : 500).json({
    success: false,
    message: unavailable ? 'File storage is unavailable' : fallback
  });
};

/** Staff images (logos, listing photos, courier icons): returns a public URL. */
export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Choose an image to upload' });
    }
    const extension = imageExtension(req.file.buffer);
    if (!extension) {
      return res.status(400).json({
        success: false,
        message: 'Image must be a JPEG, PNG, GIF, or WebP file'
      });
    }
    const { key, url } = await saveObject(
      `images/${randomUUID()}${extension}`, req.file.buffer, contentTypeFor(extension)
    );
    return res.status(201).json({
      success: true,
      message: 'Image uploaded',
      data: { url, key, path: new URL(url).pathname }
    });
  } catch (error) {
    return failure(res, error, 'Failed to upload image');
  }
};

/** Buyer's proof of delivery (photo or PDF), keyed to the uploader and kept private. */
export const uploadDeliveryProof = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Choose a photo or PDF to upload' });
    }
    const extension = receiptExtension(req.file.buffer) || (imageExtension(req.file.buffer) === '.webp' ? '.webp' : null);
    if (!extension) {
      return res.status(400).json({ success: false, message: 'Upload a JPEG, PNG, WebP photo or a PDF' });
    }
    const { key } = await saveObject(
      `delivery-proofs/u${req.user.id}/${randomUUID()}${extension}`,
      req.file.buffer,
      contentTypeFor(extension),
      { visibility: 'private' }
    );
    return res.status(201).json({ success: true, message: 'Proof uploaded', data: { key } });
  } catch (error) {
    return failure(res, error, 'Failed to upload proof');
  }
};

/** Bank-transfer receipts, keyed to the uploader so only they can attach it to a submission. */
export const uploadPaymentProof = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Choose a receipt to upload' });
    }
    const extension = receiptExtension(req.file.buffer);
    if (!extension) {
      return res.status(400).json({ success: false, message: 'Upload a JPEG, PNG or PDF receipt' });
    }
    const { key, url } = await saveObject(
      `payment-proofs/u${req.user.id}/${randomUUID()}${extension}`,
      req.file.buffer,
      contentTypeFor(extension),
      { visibility: 'private' }
    );
    return res.status(201).json({ success: true, message: 'Receipt uploaded', data: { key, url } });
  } catch (error) {
    return failure(res, error, 'Failed to upload receipt');
  }
};
