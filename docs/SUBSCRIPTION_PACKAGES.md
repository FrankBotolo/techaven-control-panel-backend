# Seller subscription packages

## Overview

- **Admin** creates **subscription packages** (plans): price in MWK, billing period, duration, feature list, optional quotas (`limits` JSON).
- **Sellers** (per **shop**) **subscribe** to a package. One “active-like” subscription per shop at a time; switching plans cancels the previous row and creates a new one.
- **Public** catalog: `GET /api/subscription-packages` (no auth) for pricing pages / app.

## Environment

| Variable | Meaning |
|----------|---------|
| `SUBSCRIPTION_AUTO_ACTIVATE` | Only when set to **`true`**: seller subscribe creates **paid** + **active** without Malipo (local dev). **Production:** leave unset or not `true` so new rows stay **`pending_payment`** until the Malipo webhook/collect (or non-empty **`payment_reference`** on subscribe, or admin **PATCH**). |

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
| GET | `/api/sellers/:shopId/subscription` — current + recent history + **`malipo_payment_options`**; each subscription includes **`subscribed`** (`true` only when **`status: active`**, **`payment_status: paid`**, and before **`current_period_end`**). |
| POST | `/api/sellers/:shopId/subscription/subscribe` — body: `package_id`, optional `payment_reference`, `replace_existing`, `auto_renew`; when pending payment, response includes **`malipo_payment_options`**. |
| POST | `/api/sellers/:shopId/subscription/pay/malipo` — body: `subscription_id`, `msisdn`, and **one of** `psp_id` (1=Airtel, 2=TNM), `payment_method_id`, or `provider_slug`. **Response `data`** includes a full **`subscription`** object after a successful collect call. |
| POST | `/api/sellers/:shopId/subscription/cancel` — body: `immediately` (boolean); default = cancel at period end |
| POST | `/api/sellers/:shopId/subscription/resume` — undo cancel-at-period-end |

## Paying with Malipo (seller)

Requires **`MALIPO_API_KEY`** and **`MALIPO_APP_ID`** (same as order checkout).

1. **`POST /api/sellers/:shopId/subscription/subscribe`** with `package_id` (and `replace_existing: true` if switching plans). Unless **`SUBSCRIPTION_AUTO_ACTIVATE=true`** or a non-empty **`payment_reference`** is sent, the API returns **`status: pending_payment`** and **`payment_status: pending`**.
2. Load network choices from **`malipo_payment_options`** on **`GET /api/sellers/:shopId/subscription`** or subscribe response, or **`GET /api/payment-methods`** (authenticated). **`POST /api/sellers/:shopId/subscription/pay/malipo`** with **`subscription_id`**, **`msisdn`**, and **one of** **`psp_id`** (`1` / `2`), **`payment_method_id`** (row `id` from the list), or **`provider_slug`** (`airtel` / `tnm`). Amount charged is the package **`price_mwk`** (rounded). **Order** checkout Malipo is unchanged: **`msisdn`** + **`psp_id`** only.
3. Customer confirms on the phone (unless Malipo’s collect response already reports success/paid). **Malipo** calls **`POST /api/webhooks/malipo`** with **`merchant_txn_id`** matching **`SUB-{subscription_id}`** plus a per-attempt suffix (e.g. `SUB-42-ld0abc`) so Malipo never sees a duplicate **order id** on retry.
4. On a **success** callback (several status strings are accepted, e.g. `success`, `successful`, `completed`, `paid`), the server sets **`status: active`**, **`payment_status: paid`**, and updates metadata (**`subscribed_via: malipo_webhook`** — or **`malipo_collect_response`** when activation happens from the collect API body). Webhook and collect success paths share the same activation logic. If **`amount`** is present, it is checked against the package price (±1 MWK); if **`amount` is missing**, the subscription is still activated on success. **Orders** still use `merchant_txn_id` = **`order_number`** (`ORD-…`). Do not set **`WEBHOOK_CAPTURE_ONLY=true`** in production or callbacks will not activate subscriptions.

**Client check:** after payment, **`GET /api/sellers/:shopId/subscription`** or **`pay/malipo` `data.subscription`** → **`subscribed === true`** means the shop is fully subscribed (for the current period).

Run **`database/migrations/add_malipo_shop_subscription_id.sql`** so `malipo_transactions.shop_subscription_id` can be populated for admin reporting.

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

See `database/migrations/subscription_packages_and_shop_subscriptions.sql` for raw SQL. In development, Sequelize `sync` can create tables if enabled. Also apply **`add_malipo_shop_subscription_id.sql`** if you link Malipo rows to subscriptions.
