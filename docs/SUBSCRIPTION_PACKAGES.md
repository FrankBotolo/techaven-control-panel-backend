# Seller subscription packages

## Overview

- **Admin** creates **subscription packages** (plans): price in MWK, billing period, duration, feature list, optional quotas (`limits` JSON).
- **Sellers** (per **shop**) **subscribe** to a package. One “active-like” subscription per shop at a time; switching plans cancels the previous row and creates a new one.
- **Public** catalog: `GET /api/subscription-packages` (no auth) for pricing pages / app.

## Environment

| Variable | Meaning |
|----------|---------|
| `SUBSCRIPTION_AUTO_ACTIVATE` | If not set to `false`, seller subscribe calls mark the subscription **paid** + **active** immediately (dev-friendly). For production with real payments, set to `false` and use `payment_reference` + admin **PATCH** to confirm. |

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
| GET | `/api/sellers/:shopId/subscription` — current + recent history |
| POST | `/api/sellers/:shopId/subscription/subscribe` — body: `package_id`, optional `payment_reference`, `replace_existing`, `auto_renew` |
| POST | `/api/sellers/:shopId/subscription/cancel` — body: `immediately` (boolean); default = cancel at period end |
| POST | `/api/sellers/:shopId/subscription/resume` — undo cancel-at-period-end |

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
