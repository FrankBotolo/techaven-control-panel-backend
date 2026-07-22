# Seller subscription packages

## Overview

- **Admin** creates **subscription packages** (plans): price in MWK, billing period, duration, feature list, optional quotas (`limits` JSON).
- **Sellers** (per **shop**) **subscribe** to a package. One “active-like” subscription per shop at a time; switching plans cancels the previous row and creates a new one.
- **Public** catalog: `GET /api/subscription-packages` (no auth) for pricing pages / app.

## Environment

| Variable | Meaning |
|----------|---------|
| `SUBSCRIPTION_AUTO_ACTIVATE` | Only when set to **`true`**: seller subscribe creates **paid** + **active** without payment (local dev). **Production:** leave unset or not `true` so new rows stay **`pending_payment`** until Pay Changu confirms payment (or non-empty **`payment_reference`** on subscribe, or admin **PATCH**). |

## Admin (Bearer admin JWT)

| Method | Path |
|--------|------|
| GET | `/api/admin/subscription-packages` — optional `?include_inactive=true` |
| GET | `/api/admin/subscription-packages/:id` |
| POST | `/api/admin/subscription-packages` |
| PATCH | `/api/admin/subscription-packages/:id` |
| DELETE | `/api/admin/subscription-packages/:id` — deactivates if subscriptions exist; else deletes |

| Method | Path |
|--------|------|
| GET | `/api/admin/shop-subscriptions` — `?page=&limit=&shop_id=&status=&payment_status=` |
| GET | `/api/admin/shop-subscriptions/:id` |
| PATCH | `/api/admin/shop-subscriptions/:id` — e.g. `payment_status: "paid"` to activate a pending subscription |

## Seller (Bearer seller JWT, approved shop)

All require `shopId` = the authenticated user’s `shop_id`.

| Method | Path |
|--------|------|
| GET | `/api/sellers/:shopId/subscription` — current + recent history + **`paychangu_payment_options`**; each subscription includes **`subscribed`** (`true` only when **`status: active`**, **`payment_status: paid`**, and before **`current_period_end`**). |
| POST | `/api/sellers/:shopId/subscription/subscribe` — body: `package_id`, optional `payment_reference`, `replace_existing`, `auto_renew`; when pending payment, response includes **`paychangu_payment_options`**. |
| POST | `/api/sellers/:shopId/subscription/pay/paychangu` — body: `subscription_id`, `package_id`, `tx_ref`. **Response `data`** includes a full **`subscription`** object after a successful verify call. |
| POST | `/api/sellers/:shopId/subscription/cancel` — body: `immediately` (boolean); default = cancel at period end |
| POST | `/api/sellers/:shopId/subscription/resume` — undo cancel-at-period-end |

## Paying seller subscription (Pay Changu)

1. **`POST /api/sellers/:shopId/subscription/subscribe`** with `package_id` (and `replace_existing: true` if switching plans). Unless **`SUBSCRIPTION_AUTO_ACTIVATE=true`** or a non-empty **`payment_reference`** is sent, the API returns **`status: pending_payment`** and **`payment_status: pending`**.
2. Client completes payment with the Pay Changu SDK (amount = package **`price_mwk`**), then calls **`POST /api/sellers/:shopId/subscription/pay/paychangu`** with **`subscription_id`**, **`package_id`**, and the resulting **`tx_ref`**.
3. The server re-verifies **`tx_ref`** with Pay Changu's API, checks it matches this subscription and amount, then sets **`status: active`**, **`payment_status: paid`**, and records metadata (**`subscribed_via: paychangu_app_confirm`**). If the amount doesn't match the package price (±1 MWK), the call fails with `amount_mismatch`. **Customer orders** (buyer checkout) can instead pay directly via **Airtel Money** — see **`docs/AIRTEL_WEBHOOK.md`** (`POST /api/orders/:id/pay/airtel`, `POST /api/webhooks/airtel`) or Pay Changu (`API_DOCUMENTATION.md`).

**Client check:** after payment, **`GET /api/sellers/:shopId/subscription`** or pay response **`data.subscription`** → **`subscribed === true`** means the shop is fully subscribed (for the current period).

## Package body (admin create example)

```json
{
  "slug": "growth",
  "name": "Growth",
  "description": "For growing stores",
  "price_mwk": 150000,
  "currency": "MWK",
  "billing_period": "monthly",
  "duration_days": 30,
  "trial_days": 7,
  "features": ["Priority listing", "Analytics dashboard"],
  "limits": { "max_products": 500, "max_staff": 3 },
  "is_active": true,
  "is_featured": false,
  "sort_order": 20
}
```

## Database

See `database/migrations/subscription_packages_and_shop_subscriptions.sql` for raw SQL. In development, Sequelize `sync` can create tables if enabled.
