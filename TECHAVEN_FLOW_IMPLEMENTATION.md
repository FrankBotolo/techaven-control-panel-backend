# Techaven Flow Implementation Summary

This document summarizes the implementation of the Techaven App Flow Diagram (v1.0) as applied to the server codebase.

## 1. Shared Authentication Flow

- **Sign Up / Log In**: Existing (`/api/auth/register`, `/api/auth/login`)
- **OTP Verification**: Existing (`/api/auth/verify-otp`, `/api/auth/send-login-otp`)
- **Forgot Password**: Existing (`/api/auth/forgot-password`, `/api/auth/reset-password`)
- **Delivery Agent Registration**: **NEW** `POST /api/auth/register-delivery-agent` – creates user with role `delivery_agent` and DeliveryAgent profile

## 2. Buyer Flow

- **Browse, Search, Checkout**: Existing
- **Payment**: Existing (Wallet, Malipo Airtel Money/Mpamba, `completePayment` for escrow hold)
- **Escrow Holds**: Existing – funds locked when payment completed
- **Order Tracking**: Existing via order status
- **Confirm or Dispute**: 
  - **Confirm**: `POST /api/orders/:order_id/delivery/confirm` – releases escrow to seller
  - **Dispute**: **NEW** `POST /api/orders/:order_id/disputes` – freezes escrow, sends to Admin
- **72-Hour Auto-Confirm**: **NEW** `npm run auto-confirm` – run via cron (e.g. hourly)

## 3. Seller Flow

- **Apply to Become Seller**: Existing (`/api/auth/register-seller` – docs, admin approval)
- **Admin Approval**: Existing
- **Create Listings**: Existing
- **Accept Order**: **NEW** `POST /api/sellers/orders/:order_id/accept` – accepts order, optionally sets `delivery_method`
- **Reject Order**: **NEW** `POST /api/sellers/orders/:order_id/reject` – cancels order, refunds buyer from escrow
- **Delivery Method**: `self_ship`, `platform_agent`, `third_party_courier` – stored on order
- **Withdrawal**: Existing – **NEW** `cash_pickup` added to withdrawal methods

## 4. Delivery Agent Flow

- **Register**: `POST /api/auth/register-delivery-agent` (auth) + `POST /api/delivery-agents/register` (profile)
- **ID Verification**: `id_document` upload supported
- **Availability**: `PATCH /api/delivery-agents/availability`
- **Jobs**: 
  - `GET /api/delivery-agents/jobs/available` – list unassigned jobs
  - `POST /api/delivery-agents/jobs/:job_id/accept` – accept job
  - `POST /api/delivery-agents/jobs/:job_id/decline` – decline (job reassigned)
  - `POST /api/delivery-agents/jobs/:job_id/pickup` – mark picked up
  - `POST /api/delivery-agents/jobs/:job_id/deliver` – mark delivered (starts 72h buyer window)

## 5. Admin / Moderator Flow

- **Dashboard**: Existing
- **Approve Seller**: Existing
- **Disputes**: **NEW**
  - `GET /api/admin/disputes` – list with filters
  - `GET /api/admin/disputes/:id` – details
  - `POST /api/admin/disputes/:id/resolve` – resolve with `refund_buyer`, `pay_seller`, `partial`, `replacement`
- **Withdrawal Approval**: Existing

## 6. Escrow System

- **Escrow Lifecycle**: Implemented per doc
- **Frozen on Dispute**: Escrow status `frozen` when buyer opens dispute
- **Auto-Confirm**: 72-hour window after `delivered_at`; auto-confirm script releases funds
- **Commission**: Platform fee deducted at release (handled in wallet logic)
- **Withdrawal Approval**: Admin must approve all seller withdrawals

## 7. New Models

- **Dispute**: `order_id`, `buyer_id`, `seller_id`, `reason`, `status`, `resolution_type`, `refund_amount`, `seller_amount`, `admin_notes`
- **DeliveryAgent**: `user_id`, `vehicle_type`, `operating_zone`, `id_document_url`, `is_available`, `decline_count`
- **DeliveryJob**: `order_id`, `agent_id`, `pickup_address`, `dropoff_address`, `status`, timestamps

## 8. Order Model Updates

- `delivery_method`: `self_ship`, `platform_agent`, `third_party_courier`
- `seller_accepted_at`: when seller accepts order
- `delivered_at`: when order marked delivered (72h window starts)
- `escrow_status`: added `frozen` for disputes

## 9. Cron / Scheduled Tasks

Run `npm run auto-confirm` periodically (e.g. every hour) to auto-confirm deliveries past the 72-hour window.
