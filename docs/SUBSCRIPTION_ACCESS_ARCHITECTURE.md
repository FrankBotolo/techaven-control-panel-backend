# User subscription access system (architecture)

This module implements **user-centric** subscriptions: **plan → pending payment → provider → success → active subscription**. It sits **alongside** the existing **shop + Malipo** seller flow (`shop_subscriptions`, `/api/sellers/.../subscription`). Use **one** model per product surface, or bridge them later.

## Layers

| Layer | Responsibility |
|-------|----------------|
| **Routes** (`routes/subscription-access.js`) | HTTP mapping, auth roles |
| **Controllers** (`controllers/SubscriptionAccessController.js`) | Request/response, never encodes business rules beyond input checks |
| **Services** (`services/subscription/*`) | Plans, payment simulation, subscribe orchestration, listing payments, expiry queries |
| **Middleware** (`middleware/requireActiveSubscription.js`) | **Source of truth for access** on protected routes |
| **Models** (`SubscriptionPayment`, `UserSubscription`) | Persistence; **Plan** reuses `subscription_packages` |
| **Jobs** (`jobs/subscriptionExpiryJob.js`) | Daily `status = expired` when `end_date < now` |

## Data model

- **Plan** → table `subscription_packages` (existing): `price_mwk` → API field `price`, `duration_days` → `duration`.
- **Payment** → `subscription_payments`: unique `transaction_ref`, `status` pending | success | failed.
- **Subscription** → `user_subscriptions`: `start_date`, `end_date`, `status` active | expired | canceled, **`payment_status`** pending | paid | failed | refunded (set to **`paid`** only after a successful `subscription_payments` row), optional `payment_id`.

## Subscribe flow (async)

1. Validate active plan.
2. **DB transaction A:** insert `subscription_payments` with `status = pending`, unique `transaction_ref`.
3. **Payment provider** (`services/subscription/paymentProvider.js`) — simulated; replace with Malipo/Stripe and keep the same success/failure contract.
4. **DB transaction B** (with `User` row lock for concurrency):
   - Reload payment with `FOR UPDATE`; if not `pending`, return idempotent result.
   - If provider failed → `payment.status = failed` → **stop** (no subscription change).
   - If success → `payment.status = success` → **extend or create** subscription (see below).

## Single active subscription & renewal (Option B)

- If there is a row with `status = active` **and** `end_date > now`, **extend** `end_date` by `plan.duration_days + plan.trial_days` from `max(now, current_end)`.
- Otherwise **expire** all `active` rows for that user and **create** a new `active` row from `now`.

## Access rule (middleware)

Allow iff:

- `status === 'active'` **and**
- `end_date > now`

The **frontend must not** decide access; only the backend (middleware + services) does.

## HTTP API (mounted under `/api`)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/plans` | No | List active plans |
| POST | `/subscribe` | Seller or admin JWT | Body `{ planId, method }` — user from token |
| GET | `/subscription/transactions` | Seller or admin JWT | Paginated `subscription_payments`; seller = own rows; admin = all + filters |
| GET | `/subscription/status/:userId` | JWT | Self or admin |
| GET | `/subscription/ping` | JWT + **active subscription** | Example gated route |

## Applying the gate to existing seller routes

Stack after `authenticate` (and after `requireApprovedSeller` if used):

```js
import { requireActiveSubscription } from '../middleware/requireActiveSubscription.js';

router.post(
  '/:shopId/products',
  shopOwner,
  requireActiveSubscription,
  SellerProductController.create
);
```

Ensure the **seller user** (`req.user.id`) is the same user receiving `user_subscriptions` (typically the shop owner).

## Database

- SQL migration: `database/migrations/user_subscriptions_subscription_payments.sql`
- Development: Sequelize `sync` can create tables if enabled in `server.js`.

## Configuration

| Env | Meaning |
|-----|---------|
| `SUBSCRIPTION_PAYMENT_SIMULATE_FAILURE=true` | Provider returns failure |
| `SUBSCRIPTION_EXPIRY_CRON` | node-cron pattern (default `5 0 * * *`) |
