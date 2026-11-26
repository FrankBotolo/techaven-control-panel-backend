/** Returns the file extension for supported image bytes, or null. Never trusts client-supplied names or MIME types. */
export const imageExtension = (bytes) => {
  if (!bytes || bytes.length < 12) return null;
  if (bytes.subarray(0, 3).toString('hex') === 'ffd8ff') return '.jpg';
  if (bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') return '.png';
  if (['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString('latin1'))) return '.gif';
  if (
    bytes.subarray(0, 4).toString('latin1') === 'RIFF' &&
    bytes.subarray(8, 12).toString('latin1') === 'WEBP'
  ) return '.webp';
  return null;
};

const CONTENT_TYPES = {
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf'
};
export const contentTypeFor = (extension) => CONTENT_TYPES[extension];

/** Payment receipts: JPEG, PNG or PDF, detected from bytes. */
export const receiptExtension = (bytes) => {
  if (bytes?.length >= 5 && bytes.subarray(0, 5).toString('latin1') === '%PDF-') return '.pdf';
  const image = imageExtension(bytes);
  return image === '.jpg' || image === '.png' ? image : null;
};
