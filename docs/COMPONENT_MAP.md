# Codebase Navigation Map

Shop seed and Loans ownership: scripts/seed-apple-all.js, scripts/seed-saeed-enterprise.js and scripts/data/ manifests; scripts/backfill-stock-photos.js owns traced catalogue photos. Migration 202610140001_listing_categories.js and services/marketplace/category-filter.js own shared offer category membership; V2MarketplaceController filters, CategoryController counts. See docs/SHOP_SEEDS_AND_LOANS.md.

## Supplied Apple Guy / Edgicate seed ownership

`scripts/seed-apple-edgicate.js` owns transactional, idempotent shop/offer/photo creation; `scripts/data/apple-edgicate.js` holds transcribed facts and user-confirmed corrections. `docs/APPLE_EDGICATE_SEED.md` records boundaries and verification. Supplied files live in the uploads volume under `apple-edgicate/`; local evidence lives in sibling `../shop-seed-apple-edgicate/`.

## TechAPI laptop import ownership

`services/catalogue/importers/techapi/laptop.js` owns laptop configuration normalization and common model specs. `importer.js` dispatches by category type; `scripts/import-techapi.js --category-type laptop` is the CLI entry point. `tests/unit/techapi-laptop.test.js` verifies CPU/GPU/storage distinctions and duplicate normalization. See `docs/TECHAPI_LAPTOP_IMPORT.md` for mapping, local counts and rerun evidence.

Use this as a task-routing index, not a substitute for reading the relevant implementation and approved contract.

## Entry Points

| Concern | Actual path | Notes |
|---|---|---|
| Application entry | `server.js` | Loads environment support, middleware, routes, database startup, jobs, HTTP listener, and shutdown handling. |
| API route registry | `routes/index.js` | Mounts route modules beneath `/api`. |
| Database connection | `config/database.js` | Creates the shared Sequelize connection from environment configuration. |
| Model registry | `models/index.js` | Imports models, defines associations, and exports the shared database object. |
| Package commands | `package.json` | Start, migration, seed, and integration utility commands; no automated test runner is configured. |
| Database baseline | `database/schema.sql` | SQL schema reference; inspect migrations for subsequent changes. |
| Mobile client entry | `mobile-app/App.js` | Expo application scaffold. |
| Mobile API client | `mobile-app/src/api/client.js` | Client-side base URL, authentication token, and request handling. |

## API Ownership Areas

| Area | Routes | Primary implementation | Data/contracts and notes |
|---|---|---|---|
| Authentication and users | `routes/auth.js`, `routes/user.js` | `controllers/AuthController.js`, `controllers/UserController.js` | `models/User.js`, `models/Otp.js`, `middleware/auth.js` |
| Products, categories, search | `routes/products.js`, `routes/categories.js`, `routes/search.js` | `controllers/ProductController.js`, `controllers/CategoryController.js`, `controllers/SearchController.js` | `models/Product.js`, `models/Category.js`, `utils/productDto.js` |
| Catalogue marketplace v2 | `routes/v2/` | v2 catalogue, marketplace, listing, cart, order, admin, and migration controllers | Canonical catalogue/listing models and `services/catalogue/`; see `docs/CATALOGUE_API_V2.md` |
| Promotions catalogue feed | `routes/v2/promotion-sync.js` | Token-protected cursor feed and catalogue projections | `services/catalogue/promotionSync.js`, `promotion_catalogue_events`; CMS remains non-authoritative. |
| Shops and sellers | `routes/shops.js`, `routes/sellers.js`, `routes/invitations.js` | `controllers/ShopController.js`, seller/admin shop controllers, `controllers/InvitationController.js` | `models/Shop.js`, `models/ShopInvitation.js`, `models/ShopFollow.js` |
| Cart and checkout | `routes/cart.js`, `routes/orders.js`, `routes/shipping-addresses.js` | `controllers/CartController.js`, `controllers/OrderController.js`, `controllers/AddressController.js` | Cart, order, order-item, shipping-address, escrow, dispute, and delivery models |
| Wallet and loyalty | `routes/wallet.js`, `routes/platform-settings.js` | `controllers/WalletController.js`, `controllers/PointsController.js`, platform-setting controllers | Wallet models, `models/UserShopPoints.js`, points and commission utilities |
| Payments and webhooks | `routes/payment-methods.js`, `routes/webhooks.js` | payment, Airtel webhook, and PayChangu callback controllers | Airtel/PayChangu utilities and transaction/callback models; see focused docs |
| Subscriptions | `routes/subscription-packages.js`, `routes/subscription-access.js`, seller/admin routes | subscription controllers and `services/subscription/` | Subscription package, shop subscription, user subscription, and payment models |
| Notifications and messaging | notification and SMS route modules | notification controllers, `services/emailService.js`, `services/smsService.js` | `models/Notification.js`, email templates, `utils/notificationHelper.js` |
| Delivery and couriers | `routes/courier-services.js`, `routes/delivery-agents.js` | courier and delivery-agent controllers | Courier-service, delivery-agent, and delivery-job models |
| Admin | `routes/admin.js`, `routes/admin-notifications.js`, `routes/admin-couriers.js` | `controllers/Admin*.js` | Cross-cutting management endpoints; audit actions use `models/AuditLog.js` and `utils/audit.js` |
| Public/app content | banners, onboarding, help, and app route modules | matching controllers | Banner and onboarding-slide models plus upload middleware where applicable |

## Shared Infrastructure

| Concern | Actual path | Notes |
|---|---|---|
| Authentication/authorization | `middleware/auth.js`, `middleware/requireActiveSubscription.js` | JWT identity and subscription access gates. |
| HTTP middleware | `middleware/cors.js`, `middleware/requestLogger.js`, `middleware/upload.js` | Cross-origin policy, request logging, and uploads. |
| Database evolution | `database/migrations/`, `scripts/migrate.js` | Ordered SQL migrations and runner; review both schema and model impacts. |
| Catalogue migrations | `database/migrations-js/`, `scripts/run-migrations.js` | Ordered reversible v2 migrations tracked in `schema_migrations`. |
| Database setup/seed | `scripts/create-db.js`, `scripts/migrate-fresh.js`, `scripts/seed.js` | Destructive or environment-dependent operations; inspect before running. |
| Background work | `utils/subscriptionExpiryScheduler.js`, `scripts/auto-confirm-delivery.js` | Subscription expiry starts with the server; delivery confirmation is a separate script. |
| Environment loading | `utils/loadEnv.js` | Imported before application configuration in `server.js`. Never document loaded secret values. |
| Container deployment | `Dockerfile`, `docker-compose.yml` | Two-service backend/MySQL stack with named data, upload, and log volumes. |
| Integration checks | `scripts/test-*.js` | Manual utilities for Airtel, email, notification, SMS, and SMTP; not an automated test suite. |

## Documentation Index

### Approved backend requirements

| Scope | Path | Authority |
|---|---|---|
| General backend API | `API_DOCUMENTATION.md` | Primary approved backend contract. |
| Airtel Money | `docs/AIRTEL_WEBHOOK.md` | Approved within Airtel integration scope. |
| Shop-owner registration | `docs/OWNER_REGISTRATION.md` | Approved within owner-registration scope. |
| Seller subscription packages | `docs/SUBSCRIPTION_PACKAGES.md` | Approved within package/subscription scope. |

### Reference documentation

| Category | Paths | Notes |
|---|---|---|
| Setup and migration | `README.md`, `QUICK_START.md`, `SETUP_GUIDE.md`, `MIGRATION_GUIDE.md` | Operational reference; confirm commands against current package scripts and environment. |
| API/mobile summaries | `API_CHANGES_SUMMARY.md`, `MOBILE_APP_API.md`, `CHECKOUT_API_MOBILE.md`, `mobile-app/README.md` | Reference only; may overlap the approved backend contract. |
| Feature/workflow notes | `CHECKOUT_FLOW.md`, `ESCROW_SYSTEM.md`, `TECHAVEN_FLOW_IMPLEMENTATION.md`, `WALLET_SETUP.md` | Historical or focused implementation reference; verify against code. |
| Email documentation | `AUTOMATIC_EMAILS.md`, `EMAIL_NOTIFICATIONS.md` | Reference only; verify templates and call sites before relying on behavior. |

`SUBSCRIPTION_API.md` and `docs/SUBSCRIPTION_ACCESS_ARCHITECTURE.md` do not exist in this checkout. Do not invent their contents.

## Failure Boundaries and Verification

- Database authentication is a shared startup dependency; failure exits the process before the server listens.
- Route-level work commonly crosses route, controller, service/utility, model, and migration boundaries. Inspect only the relevant chain.
- Global Express error handling returns a sanitized production response, with special handling for malformed Airtel webhook JSON. Verify critical endpoint-specific error contracts independently.
- External payments, email, and SMS depend on configured providers. Do not run integration utilities without appropriate authorization and environment setup.
- No automated unit/integration test directory or test script is currently configured. Record exactly which manual, syntax, startup, or integration checks are run for each change.

## Customer authentication v2 ownership

| Entry point | Owner | State and compatibility |
| --- | --- | --- |
| `/api/v2/auth/*` via `routes/v2/auth.js` | `controllers/v2/AuthController.js`, `services/auth/` | Customer-only Google/password/verification/recovery; rotated cookie sessions in `models/AuthSession.js`. |
| Shared protected routes | `middleware/auth.js` | Recognises v2 session JWTs and checks revocation; preserves legacy access-token clients. |
| Auth schema and maintenance | `database/migrations-js/202610120001-create-auth-v2.js`, `scripts/cleanup-auth-v2.js` | Four additive auth tables; explicit expiry cleanup. |
| Public auth contract | `docs/AUTH_API_V2.md`, linked by `API_DOCUMENTATION.md` | Approved v2 auth bodies, cookies, errors, configuration and Google setup. |

Node unit/integration tests are now configured. Auth integration tests require an explicitly named test database and run sequentially to avoid schema setup races. External Google/email calls are stubbed in integration tests; real provider verification remains a separate setup check.
