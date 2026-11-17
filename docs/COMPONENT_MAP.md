Customer setup: controllers/CustomerSetupController.js and routes/user.js own setup state; models/User.js holds enrollment/completion. controllers/PaymentMethodController.js and models/CustomerPaymentMethod.js persist owner-scoped preferences separately from provider catalogue. Migration 202611070001-customer-setup.js exempts existing users. Frontend CustomerExperience.tsx coordinates dialogs; PaymentMethods.tsx/account.index.tsx own forms; ShopProductPreview.tsx owns lazy seller-specific previews.

# Codebase Navigation Map

PAYGO/shop expansion: scripts/seed-shop-expansion.js + scripts/data/shop-expansion.js own four-shop source seed; migration 202610140002_shop_profiles.js adds shop profile/offer details. ShopController exports profile/address; final-price.js protects tax-exclusive quotations at cart/order boundaries. Frontend ShopHero.tsx and routes/paygo.tsx own edited shop heroes and the Yellow guide. See docs/SHOP_EXPANSION_PAYGO.md.

Brand navigation: controllers/CategoryController.js owns live stock-qualified brand facets. Frontend BrandTiles.tsx/Header.tsx render navigation; catalog-api.ts maps facets; category.$slug.tsx and resolve-catalog.ts own URL brand filters and category pagination. See docs/BRAND_NAVIGATION.md.

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
| Promotions catalogue feed | `routes/v2/promotion-sync.js` | Token-protected event feed, full snapshots, and catalogue projections | `services/catalogue/promotionSync.js`, `promotion_catalogue_events`; CMS remains non-authoritative. |
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
| Manufacturer media backfill | `scripts/backfill-device-media.js`, `scripts/data/seeded-device-media.json` | Exact device identity and manufacturer URL checks; preserves existing photos and records provenance. Dry run unless `--apply`; no schema or commerce changes. |
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




## Supplied shop onboarding (2026-10-22)

- `scripts/data/shop-onboarding-20261022.js`, `services/marketplace/onboarding.js`: reviewed identity, conditions, SIM/extended RAM and highest-price deduplication.
- `scripts/seed-shop-onboarding.js`, `scripts/clean-seeded-storefronts.js`, `scripts/audit-shop-onboarding.js`: local transactional import, factual cleanup and protected-record/API audits. Source/held/photo evidence lives beside the manifest; public DTOs strip source commentary.

Dokploy packaging: deploy/dokploy.compose.yml and docs/DOKPLOY_DEPLOYMENT.md own image/runtime configuration. scripts/export-local-data.mjs exports private logical database/media backups; scripts/rewrite-media-origins.js updates restored public commerce media URLs with an explicit apply flag.

## Mobile commerce additions
- routes/manual-payments.js owns public configuration, reverse lookup, customer payment contexts/private proof and admin review.
- models/PaymentSubmission.js and database/migrations-js/202611060001-mobile-commerce.js own review persistence and optional delivery/order fields.
- services/manual-payment-policy.js validates configuration, receipt signatures, exact money and geographic data. services/manual-payment-settlement.js is shared by manual review and existing payment completion.
- Frontend sibling: MobileHomeCatalog/browsing-history; AddressLocation/AddressMap; ManualPayment/manual-payments.
Catalog cleanup: services/catalogue/deviceIdentity.js resolves canonical aliases. services/catalogue/reviewedIdentity.js owns reviewed catalog and onboarding model rules. scripts/merge-catalog-devices.js produces and applies reviewed plans. controllers/DeviceFavoriteController.js owns marketplace saves under the existing wishlist route. See docs/CATALOG_CLEANUP_DRY_RUN.md.
