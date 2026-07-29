# Airtel Money integration (direct)

## Overview

Airtel Money is the only mobile-money payment method in this app — payments go **directly** to Airtel's Collection API (Airtel Africa Open API), with no aggregator in between. Two halves:

- **Outbound push** — `POST /api/orders/:id/pay/airtel` initiates a payment prompt on the customer's phone. Handler: [`controllers/OrderController.js`](../controllers/OrderController.js) (`payWithAirtel`), using [`utils/airtelCollect.js`](../utils/airtelCollect.js) for the OAuth2 + Collection API call.
- **Inbound webhook** — Airtel calls back once the customer confirms (or the payment fails/times out). Handler: [`controllers/AirtelWebhookController.js`](../controllers/AirtelWebhookController.js). Every inbound call is persisted to the `airtel_transactions` table regardless of outcome, for the admin transaction log.

Register the callback URL in the **Airtel Money developer portal (Malawi)** merchant account under your Collection API app.

## Initiating a payment (outbound)

```
POST /api/orders/:id/pay/airtel
Body: { "msisdn": "0991234567" }
```

- Looks up the order, requires it to belong to the requesting user and not already be paid.
- Fetches an OAuth2 token (warmed up on server start when credentials are set, auto-refreshed before expiry) and pushes a Collection request to `POST {base}/merchant/v1/payments/` with `reference: order.order_number`, a unique random `transaction.id` (e.g. `RFYYGhuhSerrIhUY`), and `transaction.amount` as a string in MWK.
- Base URL is staging (`openapiuat.airtel.mw`) unless `AIRTEL_ENV=production` (`openapi.airtel.mw`). Override with `AIRTEL_API_BASE_URL` if needed.
- Airtel success response shape: `{ data: { transaction: { id, status } }, status: { success, code, message, ... } }`.
- Returns 500 with a clear message if `AIRTEL_CLIENT_ID`/`AIRTEL_CLIENT_SECRET` aren't set.

## Callback URL (inbound)

```
{APP_URL}/api/webhooks/airtel
```

`APP_URL` comes from `.env`. Currently set to:

```
http://localhost:8000/api/webhooks/airtel
```

**Local/dev only** — Airtel's servers cannot reach `localhost` directly. To actually receive callbacks before going live, expose your local server with a tunnel (e.g. `ngrok http 8000`) and register the resulting `https://xxxx.ngrok.app/api/webhooks/airtel` URL in the portal instead.

**Before going live:** set `APP_URL` to your real public HTTPS domain and register `https://<your-domain>/api/webhooks/airtel` in the portal — Airtel requires a public HTTPS endpoint, it will not deliver to `http://` or unreachable hosts.

## Required environment variables

| Variable | Purpose |
|---|---|
| `AIRTEL_CLIENT_ID` / `AIRTEL_CLIENT_SECRET` | OAuth2 client credentials for the outbound Collection API (token + push). Required for `pay/airtel` to work. |
| `AIRTEL_ENV` | `production` to use `https://openapi.airtel.mw`; anything else (or unset) uses staging `https://openapiuat.airtel.mw`. |
| `AIRTEL_API_BASE_URL` | Optional override for the Airtel Open API host (no trailing slash). |
| `AIRTEL_TOKEN_REFRESH_BUFFER_SEC` | Seconds before the 180s token expiry to refresh proactively (default `30`). |
| `AIRTEL_WEBHOOK_SECRET` | HMAC-SHA256 secret used to verify the `x-airtel-signature` header on inbound callbacks (get this from the Airtel developer portal when you register the callback). If unset, the endpoint accepts unsigned requests and logs a warning — set this before going live. |

## What Airtel sends after a transaction

Airtel Money's Collection API posts a JSON body to the callback URL once a transaction reaches a final (or intermediate) state. The handler accepts both shapes below.

**Nested shape (standard Airtel Africa Collection callback):**

```json
{
  "transaction": {
    "id": "CI250722.1344.B0AE1B",
    "message": "Paid MWK 5000 to Chiwaya Merchant",
    "status_code": "TS",
    "airtel_money_id": "MP250722.1345.A01234"
  },
  "reference": "ORD-000123",
  "msisdn": "265991234567",
  "amount": "5000"
}
```

**Flat shape (also accepted, some integrations use this form):**

```json
{
  "transaction_id": "CI250722.1344.B0AE1B",
  "status_code": "TS",
  "status": "SUCCESS",
  "reference": "ORD-000123",
  "msisdn": "265991234567",
  "amount": "5000",
  "message": "Paid MWK 5000 to Chiwaya Merchant"
}
```

### Field reference

| Field | Meaning |
|---|---|
| `transaction.id` / `transaction_id` | Airtel's transaction reference for this attempt — matches the `transaction.id` sent in the outbound push. |
| `transaction.airtel_money_id` / `airtel_money_id` | Airtel Money's internal reference (may differ from `transaction.id`). |
| `transaction.status_code` / `status_code` | `TS` = success, `TF` = failed, `TIP` = in progress, `TA` = ambiguous/abandoned. Only `TS` (or a `status`/`Status` string of `success`/`successful`/`succeeded`/`completed`/`complete`/`paid`) is treated as a successful payment. |
| `transaction.message` / `message` | Human-readable status message from Airtel. |
| `reference` / `merchant_txn_id` / `order_id` / `order_number` | **Your** merchant reference — the same `order.order_number` sent in the outbound push, or an encoded shop-subscription reference (see `parseSubscriptionMerchantRef`). This is how the webhook finds what to mark as paid. |
| `msisdn` / `phone` / `mobile` | Payer's phone number. |
| `amount` | Transaction amount (commas are stripped before parsing). |

### Signature header

`x-airtel-signature`: HMAC-SHA256 hex digest of the **raw request body**, signed with `AIRTEL_WEBHOOK_SECRET`. Verified in [`utils/airtelWebhookSignature.js`](../utils/airtelWebhookSignature.js) using a timing-safe comparison.

## What happens on receipt

The endpoint **always responds 200 OK** — no exceptions. Airtel's callback contract only needs an
ack; every real decision (parsed or not, signed or not, matched to an order or not) happens after
that's guaranteed, never as a reason to fail the HTTP response.

1. Every call is unconditionally written to `airtel_webhook_logs` (raw headers + body + raw request
   bytes) — this insert doesn't depend on the payload having any particular shape, being valid JSON,
   or matching a known transaction. Even a request Express itself can't parse as JSON (wrong
   `Content-Type`, malformed body) is still logged here and acked 200, via the `entity.parse.failed`
   branch in `server.js`'s error middleware.
2. Payload is also captured for local debugging (`captureWebhook`, writes to `logs/webhook-captures/`)
   and, if it parses into a recognizable Airtel shape, upserted into `airtel_transactions` (keyed by
   `transaction_id`) — best effort, failures here are logged and swallowed, never surfaced as an error
   response.
3. If `WEBHOOK_CAPTURE_ONLY=true`, processing stops here (log-only mode).
4. Non-success `status_code`/`status` → no state change, `processing_state: 'received'`.
5. Missing `reference` (e.g. Airtel's connectivity-test payload `{ transaction: { id, status_code: "TS", ... } }`
   with no reference) → nothing to reconcile, `processing_state: 'no_reference'`.
6. Invalid/missing `x-airtel-signature` (when `AIRTEL_WEBHOOK_SECRET` is set) → logged, but the
   order/subscription update below is skipped so an unverified payload can't move money state.
7. `reference` resolves to a **shop subscription** merchant ref → activates the subscription via
   `finalizePendingShopSubscriptionPayment` (amount-checked); `processing_state` becomes
   `subscription_activated`, `amount_mismatch`, or `subscription_not_finalized`.
8. Otherwise `reference` is looked up as an **order** (`order_number` or numeric `id`) → marks it paid
   via `completeOrderPaidWithEscrow`; `processing_state` becomes `order_paid` or `order_not_found`.
9. Any unexpected error during steps 4–8 is caught, logged, and still acked 200 — the payload is
   already durable in `airtel_webhook_logs` regardless, so a bug in our matching logic is our problem
   to fix from the log, not something that should make Airtel retry-storm or disable the callback URL.

### `airtel_webhook_logs` table

Created by [`database/migrations/add_airtel_webhook_logs.sql`](../database/migrations/add_airtel_webhook_logs.sql)
(model: [`models/AirtelWebhookLog.js`](../models/AirtelWebhookLog.js)). Run the migration against the
target database once after pulling this change — production doesn't auto-sync on boot (see
`server.js`, `sequelize.sync` only runs when `NODE_ENV !== 'production'`):

```
mysql -u <user> -p <db_name> < database/migrations/add_airtel_webhook_logs.sql
```

## Note on source of truth

The exact payload Airtel Money Malawi sends is defined in your merchant account's **Collection API** section of the developer portal (developers.airtel.africa) — that page requires an authenticated merchant login, so it couldn't be fetched directly here. The shapes documented above are the standard Airtel Africa Collection callback format used consistently across markets (Kenya, Uganda, Rwanda, Zambia, Malawi) in public SDKs and integration guides, and match what this handler already parses. **Confirm against your actual portal page**, and update `parseAirtelPayload` in `AirtelWebhookController.js` / the request shape in `utils/airtelCollect.js` if Malawi's payload differs in practice.
