# Checkout & Buying Process – Step by Step

This document explains how a customer buys items: from cart to payment to delivery and when the seller gets paid.

---

## Overview (Simple)

1. **Customer** adds items to **cart**.
2. **Customer** goes to **checkout**: creates an **order** (shipping, courier, payment method). No money is taken yet.
3. **Customer** pays **outside the app** (card, mobile money, etc.) using the order total.
4. **App** records that payment is done → money is **held in escrow** (platform holds it).
5. **Seller/Admin** ship the order and mark it **delivered**.
6. **Customer** **confirms delivery** in the app → money is **released from escrow to the seller**.
7. **Seller** can then **withdraw** that balance (seller-only wallet).

Customers do **not** have a wallet; they pay directly at checkout. Sellers get a wallet only for earnings after escrow is released.

---

## Step-by-Step (With APIs)

### Step 1: Customer adds items to cart

- **API:** `POST /api/cart` (add item), `GET /api/cart` (view cart).
- Cart stores: `user_id`, `product_id`, `quantity`.
- No payment here; just preparation for checkout.

---

### Step 2: Checkout – Create order

- **API:** `POST /api/orders`
- **Who:** Customer (authenticated).
- **Body (main fields):**
  - `shipping_address_id` – where to deliver.
  - `courier_service` – e.g. "DHL Express".
  - `payment_method` or `payment_method_id` – e.g. `"mobile_money"`, `"card"`, `"bank_transfer"`, `"cash_on_delivery"`.
  - Optional: `notes`, `courier_service`.

**What the server does:**

1. Loads cart items and checks stock.
2. Computes total (items + shipping, no discount/tax in current logic).
3. Finds the **seller** (shop that sells the products).
4. **Creates the order** with:
   - `status: 'pending'`
   - `payment_status: 'pending'`
   - `escrow_status: 'pending'`
   - `escrow_amount` = seller’s portion (items total for that seller).
5. **Creates order items** and **reduces product stock**.
6. **Clears the cart**.
7. Sends notifications (customer, seller, admin) and returns e.g. `order_id`, `order_number`, `total`, `payment_url`.

**Important:** At this point **no money has been taken**. The order is just “placed”. The response can include a `payment_url` where the customer will pay (e.g. card or mobile money).

---

### Step 3: Customer pays (outside the app)

- The customer pays the **order total** using their chosen method:
  - **Card** – payment gateway / POS.
  - **Mobile money** – e.g. Airtel Money, TNM.
  - **Bank transfer** – bank app or branch.
  - **Cash on delivery** – pay when the parcel arrives.

The **actual deduction** from the customer’s card/mobile money/bank is done by the **payment provider** (gateway, mobile money operator, etc.), not by our app. Our app does **not** store or deduct from a “customer wallet”.

---

### Step 4: Mark payment as complete (money into escrow)

- **API:** `POST /api/orders/:order_id/payment/complete`
- **Who:** Called after the payment provider confirms payment (e.g. by your backend after a webhook, or by support after verifying proof).
- **Body (optional):** `payment_reference`, `payment_proof` (e.g. transaction ID or receipt URL).

**What the server does:**

1. Sets `payment_status = 'paid'`, `escrow_status = 'held'`.
2. Creates an **escrow** record (order, seller, amount, status `held`).
3. **Credits the admin (platform) wallet** with the **escrow amount** – so the platform is “holding” the seller’s money.
4. Notifies customer, admin, and seller (e.g. “Payment received, held in escrow until delivery”).

So: **money is now “in the system”** in the platform’s escrow. The seller sees it as **pending (in escrow)**; they **cannot withdraw** it yet.

---

### Step 5: Fulfilment – Ship and deliver

- **API:** `PATCH /api/orders/:order_id/status` (or admin/seller order status endpoint).
- **Who:** Admin or seller.
- **Body:** e.g. `{ "status": "shipped", "courier_tracking_number": "TRACK123" }`, later `{ "status": "delivered" }`.

**What the server does:**

- Updates order `status` and optionally `courier_tracking_number`.
- When status becomes **`delivered`**, the customer is notified (e.g. “Please confirm delivery to release payment to the seller”).

Still **no release of money** to the seller; it stays in escrow.

---

### Step 6: Customer confirms delivery (release escrow to seller)

- **API:** `POST /api/orders/:order_id/delivery/confirm`
- **Who:** **Customer** who placed the order (authenticated).

**What the server does:**

1. Checks order is `delivered` and escrow is `held`.
2. Sets `delivery_confirmed_at`, `escrow_status = 'released'`, `funds_released_at`.
3. **Debits the admin (escrow) wallet** and **credits the seller’s wallet** by the `escrow_amount`.
4. Notifies customer, seller, and admin.

After this, the **seller’s wallet balance** increases. That balance is **withdrawable** (seller can request withdrawal; admin approves and pays out to mobile money/bank).

---

### Step 7: Seller withdraws (optional)

- **API:** `POST /api/sellers/withdraw` (request), then admin uses `PATCH /api/admin/withdrawals/:id` to approve/reject.
- Sellers can only withdraw their **available wallet balance** (money that has already been released from escrow).

---

## Flow diagram (text)

```
Customer                    Platform / Admin                  Seller
   |                               |                              |
   | 1. Add to cart                |                              |
   | 2. POST /orders (checkout)    |                              |
   |   → order created, pending    |  Notify seller & admin        |
   |                               |                              |
   | 3. Pay via card / mobile money / bank (outside app)          |
   |                               |                              |
   | 4. POST .../payment/complete  |                              |
   |   (after payment confirmed)   |  Escrow: money held          |
   |                               |  Notify seller “pending”     |
   |                               |                              |
   |                               | 5. Admin/Seller: ship        |
   |                               |    then mark “delivered”     |
   | 6. POST .../delivery/confirm  |                              |
   |   “I received it”              |  Release escrow → seller      |
   |                               |  Seller wallet += amount     |
   |                               |                              | 7. Withdraw
   |                               |                              |    (admin approves)
```

---

## API summary (checkout-related)

| Step | API | Who |
|------|-----|-----|
| Checkout | `POST /api/orders` | Customer |
| Payment done | `POST /api/orders/:order_id/payment/complete` | Your backend (e.g. after gateway webhook) or support |
| Update status | `PATCH /api/orders/:id/status` | Admin / Seller |
| Confirm delivery | `POST /api/orders/:order_id/delivery/confirm` | Customer |
| Seller balance/withdraw | `GET /api/sellers/earnings`, `POST /api/sellers/withdraw` | Seller |

---

## Important points

- **No customer wallet:** Customers pay the order total directly (card, mobile money, etc.). No “top up” or “balance” for customers.
- **Escrow:** After payment is “complete”, the seller’s portion is held in escrow until the **customer** confirms delivery. Only then does it move to the seller’s wallet.
- **Payment completion:** In production, `POST .../payment/complete` should be called when your **payment gateway / mobile money webhook** confirms success (so money is only marked paid when it’s really received).

If you want, we can next align this with your real payment gateway (e.g. where the app gets the webhook and calls `payment/complete`).
