import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Always load server/.env regardless of process cwd (PM2, systemd, etc.). */
dotenv.config({ path: path.join(__dirname, '..', '.env') });
