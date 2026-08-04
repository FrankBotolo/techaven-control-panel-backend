import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, '..', '.env');

/** Always load server/.env regardless of process cwd (PM2, systemd, etc.). */
dotenv.config({ path: ENV_PATH, override: true });

export { ENV_PATH };
