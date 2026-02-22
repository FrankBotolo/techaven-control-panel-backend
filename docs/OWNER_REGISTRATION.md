# Shop Owner Registration API

This document describes the API flow for invited shop owners to register and activate their seller account.

---

## Overview

When an admin invites a shop owner, the invitee receives an email (or SMS) with a registration link. The shop owner must:

1. Open the registration link (contains `invite_token`)
2. Register via `POST /api/auth/register` with the `invite_token`
3. Verify OTP via `POST /api/auth/verify-otp`
4. Access the seller dashboard with the returned access token

---

## Base URL

`https://api.techaven.mw` (or your configured `APP_URL`)

**Content-Type:** `application/json`

---

## Registration Link Format

The invitation email contains a link in this format:

```
{Frontend URL}/register?invite_token={token}
```

Example:
```
https://app.techaven.mw/register?invite_token=a1b2c3d4e5f6789012345678901234567890abcdef
```

- **Token validity:** 7 days
- **Frontend must:** Read `invite_token` from URL query params and include it in the registration request body

---

## API Endpoints

### 1. Register (Shop Owner)

**Endpoint:** `POST /api/auth/register`

**Description:** Creates a seller account linked to the invited shop. Include `invite_token` to register as a shop owner.

**Request Body:**

| Field        | Type   | Required | Description                                                  |
|--------------|--------|----------|--------------------------------------------------------------|
| full_name    | string | Yes      | Shop owner's full name                                       |
| email        | string | Yes*     | Email address (must match invited email if invite has email) |
| phone_number | string | Yes*     | Phone number (must match invited phone if invite has phone)  |
| password     | string | Yes      | Account password                                             |
| invite_token | string | Yes      | Token from registration link (`?invite_token=...`)           |

*Either `email` or `phone_number` is required. If the invitation specifies contact details, the registering user must use the same email/phone.

**Example Request (Email invitation):**
```json
{
  "full_name": "John Doe",
  "email": "john.doe@example.com",
  "password": "securePassword123",
  "invite_token": "a1b2c3d4e5f6789012345678901234567890abcdef"
}
```

**Example Request (Phone invitation):**
```json
{
  "full_name": "John Doe",
  "phone_number": "+265991234567",
  "password": "securePassword123",
  "invite_token": "a1b2c3d4e5f6789012345678901234567890abcdef"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Registration successful. Please verify OTP.",
  "data": {
    "user_id": 42,
    "email": "john.doe@example.com",
    "phone_number": null
  }
}
```

**Success Response (Phone-only user - includes OTP for testing):**
```json
{
  "success": true,
  "message": "Registration successful. Please verify OTP.",
  "data": {
    "user_id": 42,
    "email": null,
    "phone_number": "+265991234567",
    "otp": "123456"
  }
}
```

**Error Responses:**

| Status | Message                                           | Cause                                               |
|--------|---------------------------------------------------|-----------------------------------------------------|
| 400    | Invalid or expired invitation token               | Token missing, wrong, expired, or already used      |
| 400    | Invitation token does not match provided email/phone | Email/phone does not match the invitation       |
| 400    | User already exists with this email or phone number | Account already exists                           |
| 400    | Full name and password are required               | Missing required fields                             |
| 400    | Either email or phone number is required          | Neither email nor phone provided                    |

---

### 2. Verify OTP

**Endpoint:** `POST /api/auth/verify-otp`

**Description:** Verifies the OTP sent after registration. On success, returns access and refresh tokens. User is logged in automatically.

**Request Body:**

| Field        | Type   | Required | Description                          |
|--------------|--------|----------|--------------------------------------|
| email        | string | Yes*     | Email used during registration       |
| phone_number | string | Yes*     | Phone used during registration       |
| otp          | string | Yes      | 6-digit OTP code                     |
| type         | string | Yes      | Must be `"signup"`                   |

*Either `email` or `phone_number` is required.

**Example Request:**
```json
{
  "email": "john.doe@example.com",
  "otp": "123456",
  "type": "signup"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Verification successful",
  "data": {
    "user": {
      "id": "usr_42",
      "full_name": "John Doe",
      "email": "john.doe@example.com",
      "phone_number": null,
      "role": "seller",
      "shop_id": 5,
      "created_at": "2025-02-13T10:00:00.000Z"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 3600
  }
}
```

**Error Responses:**

| Status | Message            | Cause                          |
|--------|--------------------|--------------------------------|
| 400    | Invalid or expired OTP | Wrong OTP or OTP expired   |
| 400    | OTP and type are required | Missing fields            |
| 400    | OTP must be exactly 6 digits | Invalid format           |

---

### 3. Resend OTP (Optional)

**Endpoint:** `POST /api/auth/resend-otp`

**Description:** Resends the OTP if the user did not receive it.

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "type": "signup"
}
```

---

## Complete Flow Summary

| Step | Action                             | Endpoint                       |
|------|------------------------------------|--------------------------------|
| 1    | Shop owner receives invitation email | — (email sent by admin)      |
| 2    | Shop owner opens registration link  | `/register?invite_token=xxx`   |
| 3    | Shop owner submits registration     | `POST /api/auth/register`      |
| 4    | Shop owner receives OTP             | Email/SMS                      |
| 5    | Shop owner verifies OTP             | `POST /api/auth/verify-otp`    |
| 6    | Shop owner is logged in (seller)    | Access seller APIs with token  |

---

## Frontend Implementation Notes

1. **Parse invite token:** Read `invite_token` from `window.location.search` or `?invite_token=xxx`.
2. **Pre-fill email/phone:** If the invitation specified contact details, the frontend can pre-fill and disable the field (backend enforces match).
3. **Handle response:** After register success, redirect to OTP verification screen.
4. **Store tokens:** After verify-otp success, store `access_token` and `refresh_token`, then redirect to seller dashboard.

---

## Related Endpoints

- **Admin invites owner:** `POST /api/admin/shops/{shopId}/invite-owner` (requires admin auth)
- **List invitations:** `GET /api/invitations` (admin/seller)
