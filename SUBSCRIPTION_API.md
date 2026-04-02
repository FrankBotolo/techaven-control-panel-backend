# Subscription API (reference only)

Base URL: `/api` (e.g. `http://localhost:8000/api`).

There are **two** subscription mechanisms in this server:

| System | Who it’s for | Plans table | Payments | Main routes |
|--------|----------------|-------------|----------|-------------|
| **User subscription access** | Per **user** (JWT); gates features via middleware | `subscription_packages` | `subscription_payments` + simulated provider (replace with real PSP later) | **`GET /plans`**, **`POST /subscribe`**, **`GET /subscription/transactions`**, **`GET /subscription/status/:userId`**, **`GET /subscription/ping`** |
| **Shop subscription (Malipo)** | Per **shop**; seller dashboard + Malipo mobile money | `subscription_packages` | Malipo collect + webhook | **`/api/sellers/:shopId/subscription/**` |

Use **one** model per product, or bridge them later. Full architecture: **`docs/SUBSCRIPTION_ACCESS_ARCHITECTURE.md`**. Platform-wide API: **`API_DOCUMENTATION.md`**.

---

## Authentication

| Role | Header |
|------|--------|
| **Public** | None |
| **Seller** | `Authorization: Bearer <access_token>` — role `seller` (approved shop where `/sellers/...` routes require it) |
| **Admin** | `Authorization: Bearer <access_token>` — role `admin` |

Shop subscription routes require `:shopId` === authenticated user’s **`shop_id`**.

---

## User subscription access

Plans are **active** rows from **`subscription_packages`**. Subscriptions are stored in **`user_subscriptions`**; each payment attempt in **`subscription_payments`** with a **unique `transaction_ref`**.

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/plans` | No | All **active** plans as `{ id, name, price, duration, features }` (`price` = MWK, `duration` = days). |
| `POST` | `/api/subscribe` | Seller or admin | Body: **`planId`** (number), **`method`** (string, e.g. `simulated`, `malipo` placeholder). **User is taken only from the JWT** — never send `userId` in the body for authorization. Creates **`pending`** payment → simulated provider → on **success** extends or creates **`user_subscriptions`** (`active`, `end_date` in future); on **failure** payment = **`failed`**, no subscription change. **402** if payment failed. |
| `GET` | `/api/subscription/transactions` | Seller or admin | **`data.transactions`** — all **`subscription_payments`** for the caller (**seller**: own rows only; **admin**: entire table). Query: **`page`**, **`limit`** (max 100), **`status`** (`pending` \| `success` \| `failed`), **`user_id`** (admin only), **`plan_id`**, **`from`** / **`to`** (ISO date bounds on **`createdAt`**). Each item: **`id`**, **`user_id`**, **`plan_id`**, **`amount`**, **`method`**, **`status`**, **`transaction_ref`**, **`provider_payload`**, **`created_at`**, **`updated_at`**, nested **`plan`**, and **`user`** (admin only: id, name, email, phone). |
| `GET` | `/api/subscription/status/:userId` | JWT | **`has_access`** + **`subscription`** for an **active**, **`payment_status: paid`**, in-period row. Caller must be **`userId`** themselves or **admin**. |
| `GET` | `/api/subscription/ping` | JWT + **active subscription** | Example route using **`requireActiveSubscription`** middleware; returns **403** without valid access. |

### User-subscription flow

1. **`GET /api/plans`** → pick **`planId`**.  
2. **`POST /api/subscribe`** with `{ "planId": 1, "method": "simulated" }`.  
3. On **201** / success **`data`**: **`payment`** (`status`, `transaction_ref`, …) and **`subscription`** (`start_date`, `end_date`, `status`, **`payment_status`** = **`paid`**, nested **`plan`**).  
4. Gate sensitive routes with **`requireActiveSubscription`** (see architecture doc).

### Environment (user subscription system)

| Variable | Meaning |
|----------|---------|
| `SUBSCRIPTION_PAYMENT_SIMULATE_FAILURE` | If `true`, simulated provider returns failure (no subscription update). |
| `SUBSCRIPTION_EXPIRY_CRON` | node-cron pattern (UTC) for daily job marking **`expired`** when `end_date` passed (default `5 0 * * *`). |

### Response shapes (`/subscription/status/...` and successful `/subscribe`)

| Field | Meaning |
|-------|---------|
| `has_access` | **`true`** iff an **active** subscription exists with **`end_date` > now. |
| `subscription` | `id`, `user_id`, `plan_id`, `start_date`, `end_date`, `status`, **`payment_status`** (`paid` after successful checkout), optional nested **`plan`** (`id`, `name`, `price`, `duration`). |
| `payment` (on subscribe) | `id`, `status` (`pending` / `success` / `failed`), `amount`, `method`, `transaction_ref`. |

---

## Environment (shop / Malipo subscriptions)

| Variable | Meaning |
|----------|---------|
| `SUBSCRIPTION_AUTO_ACTIVATE` | Default (unset / not `true`): shop **`POST .../subscription/subscribe`** creates **`pending_payment`** until Malipo or non-empty **`payment_reference`**. **`true`** = dev-only skip to **`active`** + **`paid`**. |
| `MALIPO_API_KEY` / `MALIPO_APP_ID` | Required for `POST .../subscription/pay/malipo`. |
| `WEBHOOK_CAPTURE_ONLY` | If `true`, Malipo webhooks are captured only — **no** subscription (or order) activation. |

---

## Public — catalog (shop flow)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/subscription-packages` | No | Active packages (full schema: `slug`, `price_mwk`, `duration_days`, …). |
| `GET` | `/api/plans` | No | Simplified plan list for **user subscription** flow (see above). |

---

## Webhook — Malipo (shop subscription branch)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/webhooks/malipo` | No | **Shop** subscriptions: **`merchant_txn_id`** matches **`SUB-{shop_subscription_id}`** or **`SUB-{id}-{unique}`** (each **`pay/malipo`** call uses a new unique suffix so Malipo does not reject “order id already exists” on retry). (Does **not** drive **`user_subscriptions`**.) |

**Example payload (illustrative):**

```json
{
  "merchant_txn_id": "SUB-42-ld0abc123xyz",
  "status": "success",
  "transaction_id": "TXN-MALIPO-456",
  "amount": 150000,
  "psp_id": 1
}
```

---

## Seller — shop subscription (`/api/sellers`)

Seller JWT + approved shop + `:shopId` = that seller’s shop.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/sellers/:shopId/subscription` | Latest shop row, **`recent_subscriptions`**, **`malipo_payment_options`**. |
| `POST` | `/api/sellers/:shopId/subscription/subscribe` | Body: **`package_id`**, optional **`replace_existing`**, **`payment_reference`**, **`auto_renew`**. |
| `POST` | `/api/sellers/:shopId/subscription/pay/malipo` | Malipo: **`subscription_id`**, **`msisdn`**, provider selector. |
| `POST` | `/api/sellers/:shopId/subscription/cancel` | Optional **`immediately`**. |
| `POST` | `/api/sellers/:shopId/subscription/resume` | Undo cancel-at-period-end. |

### Typical Malipo flow (shop)

1. Leave **`SUBSCRIPTION_AUTO_ACTIVATE`** unset in production.  
2. Subscribe → **`pending_payment`** + **`malipo_payment_options`**.  
3. **`pay/malipo`** + webhook → **`active`** + **`paid`**.  
4. Use **`data.subscription.subscribed`** on shop DTO when integrating with shop-based UI.

---

## Admin — packages & shop subscriptions

All paths require admin JWT under **`/api/admin`**.

### Subscription packages (plans)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/subscription-packages` | Optional **`include_inactive=true`**. |
| `GET` | `/api/admin/subscription-packages/:id` | One package. |
| `POST` | `/api/admin/subscription-packages` | Create plan. |
| `PATCH` | `/api/admin/subscription-packages/:id` | Update plan. |
| `DELETE` | `/api/admin/subscription-packages/:id` | Deactivate or delete. |

### Shop subscriptions (rows)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/shop-subscriptions` | Filter: **`shop_id`**, **`status`**, **`payment_status`**, pagination. |
| `GET` | `/api/admin/shop-subscriptions/:id` | One row. |
| `PATCH` | `/api/admin/shop-subscriptions/:id` | Manual fixes; **`payment_status: paid`** on **`pending_payment`** activates shop row per existing rules. |

---

## Related — payment method picker (Malipo shop flow)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/payment-methods` | Bearer JWT | Malipo providers for **`pay/malipo`** (`psp_id`, `slug`, …). |

---

## Response shapes — shop subscription object (DTO)

Returned on **`GET .../sellers/.../subscription`**, **`recent_subscriptions`**, **`pay/malipo`** `data.subscription`.

| Field | Meaning |
|-------|---------|
| `status` / `effective_status` / `payment_status` | Shop subscription lifecycle (see main API doc). |
| **`subscribed`** | **`true`** when **`status: active`**, **`payment_status: paid`**, period not ended. |
| `package` | Plan DTO. |

---

## Errors (summary)

**User subscribe:** **400** invalid body; **402** payment failed; **404** inactive plan.  
**User status:** **403** if not self/admin.  
**Shop subscribe:** **409** needs **`replace_existing`**; **400** / **404** as documented in main API.

---

## Further reading

- `docs/SUBSCRIPTION_ACCESS_ARCHITECTURE.md` — user subscription layers, middleware, renewal rules.  
- `docs/SUBSCRIPTION_PACKAGES.md` — shop-focused overview.  
- `API_DOCUMENTATION.md` — full platform API.
