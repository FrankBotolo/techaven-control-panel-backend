import { listActivePlans } from '../services/subscription/planService.js';
import {
  runSubscribeFlow,
  SubscribeFlowError
} from '../services/subscription/subscribeFlowService.js';
import { findEffectiveActiveSubscription } from '../services/subscription/userSubscriptionService.js';
import { listSubscriptionPayments } from '../services/subscription/subscriptionPaymentListService.js';

function subscriptionToStatusDto(sub) {
  if (!sub) return null;
  const row = sub.get ? sub.get({ plain: true }) : sub;
  const plan = row.plan || sub.plan;
  return {
    id: row.id,
    user_id: row.user_id,
    plan_id: row.plan_id,
    start_date: row.start_date,
    end_date: row.end_date,
    status: row.status,
    payment_status: row.payment_status ?? null,
    plan: plan
      ? {
          id: plan.id,
          name: plan.name,
          price: parseFloat(plan.price_mwk),
          duration: plan.duration_days
        }
      : null
  };
}

export const listPlans = async (req, res) => {
  try {
    const plans = await listActivePlans();
    return res.json({ success: true, data: { plans } });
  } catch (error) {
    console.error('listPlans error:', error);
    return res.status(500).json({ success: false, message: 'Failed to list plans' });
  }
};

/**
 * POST /api/subscribe
 * Body: { planId, method } — user is always taken from JWT (never trust client userId for access).
 */
export const subscribe = async (req, res) => {
  try {
    const userId = req.user.id;
    const { planId, method } = req.body || {};

    if (planId == null || method == null || String(method).trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'planId and method are required'
      });
    }

    const pid = parseInt(planId, 10);
    if (!pid || Number.isNaN(pid)) {
      return res.status(400).json({ success: false, message: 'Invalid planId' });
    }

    const result = await runSubscribeFlow({
      userId,
      planId: pid,
      method: String(method).trim()
    });

    const pay = result.payment;
    const paymentDto = {
      id: pay.id,
      status: pay.status,
      amount: parseFloat(pay.amount),
      method: pay.method,
      transaction_ref: pay.transaction_ref
    };

    if (pay.status === 'failed') {
      return res.status(402).json({
        success: false,
        message: 'Payment failed — subscription was not created or extended',
        data: { payment: paymentDto }
      });
    }

    return res.status(201).json({
      success: true,
      message: result.idempotent ? 'Payment already processed' : 'Subscription updated',
      data: {
        payment: paymentDto,
        subscription: subscriptionToStatusDto(result.subscription)
      }
    });
  } catch (error) {
    if (error instanceof SubscribeFlowError) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    console.error('subscribe error:', error);
    return res.status(500).json({ success: false, message: 'Subscribe failed' });
  }
};

/**
 * GET /api/subscription/status/:userId
 * Self or admin only.
 */
export const getStatus = async (req, res) => {
  try {
    const paramId = parseInt(req.params.userId, 10);
    if (!paramId || Number.isNaN(paramId)) {
      return res.status(400).json({ success: false, message: 'Invalid userId' });
    }

    if (req.user.id !== paramId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const sub = await findEffectiveActiveSubscription(paramId);
    const now = new Date();

    return res.json({
      success: true,
      data: {
        has_access: !!sub,
        checked_at: now.toISOString(),
        subscription: subscriptionToStatusDto(sub)
      }
    });
  } catch (error) {
    console.error('getStatus error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load status' });
  }
};

export const protectedPing = async (req, res) => {
  return res.json({
    success: true,
    message: 'Subscription gate passed',
    data: {
      subscription_id: req.activeSubscription.id,
      end_date: req.activeSubscription.end_date
    }
  });
};

/**
 * GET /api/subscription/transactions
 * Seller: own subscription payment rows only. Admin: all (optional filters).
 * Query: page, limit, status (pending|success|failed), user_id (admin), plan_id, from, to (ISO dates on createdAt).
 */
export const listTransactions = async (req, res) => {
  try {
    const data = await listSubscriptionPayments({
      viewerUserId: req.user.id,
      viewerRole: req.user.role,
      query: req.query || {}
    });
    return res.json({
      success: true,
      message: 'Subscription transactions retrieved',
      data
    });
  } catch (error) {
    console.error('listTransactions error:', error);
    return res.status(500).json({ success: false, message: 'Failed to list transactions' });
  }
};
