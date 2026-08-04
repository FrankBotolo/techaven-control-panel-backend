import './utils/loadEnv.js';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './models/index.js';
import routes from './routes/index.js';
import { startSubscriptionExpiryJob } from './utils/subscriptionExpiryScheduler.js';
import { startAirtelTokenWarmup } from './utils/airtelToken.js';
import { corsMiddleware } from './middleware/cors.js';
import { requestLogger } from './middleware/requestLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(corsMiddleware);
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api', routes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Error handling middleware
app.use(async (err, req, res, next) => {
  console.error('Error:', err);

  // A malformed/non-JSON body never reaches AirtelWebhookController — express.json() throws
  // here instead. Still capture it and ack 200 so Airtel's callback URL isn't flagged as broken.
  if (err.type === 'entity.parse.failed' && req.originalUrl && req.originalUrl.includes('/webhooks/airtel')) {
    try {
      await db.AirtelWebhookLog.create({
        method: req.method,
        headers: req.headers,
        raw_body: req.rawBody ? req.rawBody.toString('utf8') : null,
        ip: req.ip,
        note: `JSON parse failed: ${err.message}`
      });
    } catch (logErr) {
      console.error('[Airtel webhook] Failed to log unparsable payload:', logErr);
    }
    return res.status(200).json({ success: true, message: 'Webhook received (unparsable body logged)' });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Database connection and server start
const startServer = async () => {
  try {
    // Test database connection
    await db.sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // Sync database (create tables if they don't exist)
    // In production, use migrations instead
    if (process.env.NODE_ENV !== 'production') {
      await db.sequelize.sync({ alter: false });
      console.log('✅ Database synchronized.');
    }

    startSubscriptionExpiryJob();
    startAirtelTokenWarmup();

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Unable to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await db.sequelize.close();
  process.exit(0);
});

