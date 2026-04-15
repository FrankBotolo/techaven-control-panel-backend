import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '../uploads');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880 // 5MB default
  },
  fileFilter: fileFilter
});

/** Shop logo: images only (no PDF). WebP allowed. */
const shopLogoFileFilter = (req, file, cb) => {
  const allowedExt = /jpeg|jpg|png|gif|webp$/i;
  const extOk = allowedExt.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = /^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype);
  if (mimeOk && extOk) {
    return cb(null, true);
  }
  cb(new Error('Shop logo must be a JPEG, PNG, GIF, or WebP image.'));
};

export const uploadShopLogo = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880
  },
  fileFilter: shopLogoFileFilter
});

