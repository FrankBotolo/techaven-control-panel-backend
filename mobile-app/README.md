# TecHaven Mobile App

React Native (Expo) mobile app for the TecHaven API (v2.0).  
**Base URL:** `http://app.comfwb.org/api`

## Features

- **Auth:** Register, Login (password or OTP), Verify OTP, Forgot/Reset password, Logout
- **Profile:** View/update profile, change password
- **Products:** Browse featured, hot sales, search, by category, product detail
- **Shops:** List shops, shop detail with products
- **Orders:** List orders, order detail, create order (checkout), pay with wallet/Malipo (Airtel Money/Mpamba), cancel
- **Wallet:** Balance, top-up, transaction history
- **Shipping addresses:** CRUD, set default
- **Notifications:** List, unread count, mark read
- **Help:** Topics, FAQs, support info
- **About:** App info, stats, onboarding slides

## Setup

```bash
cd mobile-app
npm install
```

Add `assets/icon.png`, `assets/splash.png`, and `assets/adaptive-icon.png` for app icon and splash (or use Expo defaults).

## Run

```bash
npm start
# Then press 'a' for Android or 'i' for iOS simulator, or scan QR with Expo Go.
```

## Configuration

- API base URL is in `src/api/client.js`: `const BASE_URL = 'http://app.comfwb.org/api'`
- Change it to your backend URL (e.g. `http://localhost:8000/api` for local dev).

## Requirements

- Node 18+
- Expo Go app on device (or Android Studio / Xcode for simulators)

## Project structure

- `App.js` – Root navigator (onboarding → auth or main)
- `src/api/client.js` – API client (auth, user, products, orders, wallet, etc.)
- `src/context/AuthContext.jsx` – Auth state and token
- `src/screens/auth/` – Login, Register, VerifyOtp, ForgotPassword, ResetPassword
- `src/screens/main/` – Home, Categories, Search, Orders, Profile, ProductDetail, ShopDetail, CartCheckout, Wallet, Addresses, Notifications, Help, About, EditProfile, OrderDetail, CategoryProducts, AddressForm
- `src/screens/OnboardingScreen.jsx` – First-run slides

## API alignment

The app follows **TecHaven API Documentation v2.0** (Bearer token, Laravel Sanctum–style).  
Endpoints and request/response shapes match the doc; adjust `client.js` if your backend uses different paths or field names.
