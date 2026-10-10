import '../utils/loadEnv.js';
import db from '../models/index.js';

const attempts = Math.max(Number(process.env.DB_CONNECT_RETRIES) || 30, 1);
const delayMs = Math.max(Number(process.env.DB_CONNECT_RETRY_MS) || 2000, 100);
const bootstrap = String(process.env.DB_BOOTSTRAP || 'false').toLowerCase() === 'true';

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  try {
    await db.sequelize.authenticate();
    console.log('Database is ready.');
    if (bootstrap) {
      await db.sequelize.sync({ alter: false, force: false });
      console.log('Database bootstrap complete (non-destructive sync).');
    }
    await db.sequelize.close();
    process.exit(0);
  } catch (error) {
    if (attempt === attempts) {
      console.error(`Database unavailable after ${attempts} attempts:`, error.message);
      await db.sequelize.close().catch(() => {});
      process.exit(1);
    }
    console.log(`Database not ready (attempt ${attempt}/${attempts}); retrying...`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}
