import db from '../../models/index.js';
import { getActivePlanById } from './planService.js';
import { generateSubscriptionTransactionRef } from './transactionRef.js';
import { simulateProviderCharge } from './paymentProvider.js';
import {
  extendOrCreateSubscription,
  findEffectiveActiveSubscription
} from './userSubscriptionService.js';

const { sequelize, SubscriptionPayment } = db;

export class SubscribeFlowError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * 1) Persist pending payment with unique transaction_ref
 * 2) Call payment provider (simulated)
 * 3) In one DB transaction: finalize payment + subscription only on success
 */
export async function runSubscribeFlow({ userId, planId, method }) {
  const plan = await getActivePlanById(planId);
  if (!plan) {
    throw new SubscribeFlowError('Plan not found or inactive', 404);
  }

  const amount = plan.price_mwk;
  const transactionRef = generateSubscriptionTransactionRef();

  const pending = await sequelize.transaction(async (t) => {
    const payment = await SubscriptionPayment.create(
      {
        user_id: userId,
        plan_id: planId,
        amount,
        method,
        status: 'pending',
        transaction_ref: transactionRef
      },
      { transaction: t }
    );
    return payment;
  });

  const providerResult = await simulateProviderCharge({
    id: pending.id,
    transaction_ref: pending.transaction_ref,
    amount: pending.amount,
    method: pending.method
  });

  const outcome = await sequelize.transaction(async (t) => {
    const payment = await SubscriptionPayment.findByPk(pending.id, {
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!payment) {
      throw new SubscribeFlowError('Payment record missing', 500);
    }

    if (payment.status !== 'pending') {
      const subscription =
        payment.status === 'success'
          ? await findEffectiveActiveSubscription(userId, { transaction: t })
          : null;
      return {
        idempotent: true,
        payment,
        subscription,
        providerResult
      };
    }

    if (!providerResult.success) {
      payment.status = 'failed';
      payment.provider_payload = providerResult.raw ?? { failed: true };
      await payment.save({ transaction: t });
      return { idempotent: false, payment, subscription: null, providerResult };
    }

    payment.status = 'success';
    payment.provider_payload = providerResult.raw ?? { success: true };
    await payment.save({ transaction: t });

    await db.User.findByPk(userId, { transaction: t, lock: t.LOCK.UPDATE });

    const subscription = await extendOrCreateSubscription({
      userId,
      plan,
      paymentId: payment.id,
      transaction: t
    });

    return {
      idempotent: false,
      payment,
      subscription,
      providerResult
    };
  });

  return outcome;
}
