import express from 'express';
import * as PayChanguCallbackController from '../controllers/PayChanguCallbackController.js';
import * as AirtelWebhookController from '../controllers/AirtelWebhookController.js';

const router = express.Router();

/**
 * express.json()/express.urlencoded() (mounted globally in server.js) only read the request
 * stream when Content-Type matches what they expect. If Airtel sends a callback with some other
 * Content-Type (or none), those parsers skip it entirely and the raw bytes are never captured.
 * This reads whatever's left on the stream in that case so nothing sent to this route is lost.
 */
function captureRawBodyIfUnparsed(req, res, next) {
  if (req.rawBody || (req.body && Object.keys(req.body).length > 0)) return next();

  const chunks = [];
  let size = 0;
  const MAX_BYTES = 1024 * 1024; // 1MB safety cap

  req.on('data', (chunk) => {
    size += chunk.length;
    if (size <= MAX_BYTES) chunks.push(chunk);
  });
  req.on('end', () => {
    if (chunks.length) {
      req.rawBody = Buffer.concat(chunks);
      const text = req.rawBody.toString('utf8');
      try {
        req.body = JSON.parse(text);
      } catch {
        req.body = {};
      }
    }
    next();
  });
  req.on('error', next);
}

/** POST — Pay Changu dashboard webhook (JSON + Signature). Prefer this for Flutter / server notifications. */
router.post('/paychangu', PayChanguCallbackController.webhook);
/** GET — Pay Changu browser redirect; query string carries status, tx_ref, … */
router.get('/paychangu/callback', PayChanguCallbackController.callback);
/** POST — Airtel Money direct API webhook. Configure callback URL in Airtel Money developer portal. */
router.post('/airtel', captureRawBodyIfUnparsed, AirtelWebhookController.webhook);
/** GET/HEAD — reachability check for the callback URL (Airtel/uptime monitors probe before delivering). */
router.get('/airtel', (req, res) => res.status(200).json({ success: true, message: 'Airtel webhook endpoint is up' }));
router.head('/airtel', (req, res) => res.sendStatus(200));

export default router;
