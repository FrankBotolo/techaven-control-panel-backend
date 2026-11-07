# Customer setup and shop previews - 2026-11-07

## Delivered behavior
- Homepage keeps its featured-shop carousel and existing identity cards. Shops page stacks cards below 768px and preserves larger-screen grids. Both show equal-height, independently scrollable product previews beneath each shop.
- Previews load near the viewport, cache per shop, request up to six products, select only that shop's in-stock offers, and retain the listing ID on product links. Loading, empty and recoverable error states reserve equal space. Inner horizontal overscroll and keyboard events do not move the parent rail.
- A guest Google sign-in dialog appears on the first scroll or header/main click, once per tab session. It can be dismissed; the original action and return destination survive. Google challenge/nonce and existing-account linking are reused, with email fallback. Authentication, help and legal pages are excluded.
- Only new accounts enroll in required address setup. An introduction opens the Account form, using existing optional maps/current-location and manual entry. A successfully saved owned address completes the first step. A completion failure can be retried against the saved address without duplicating it.
- A separate optional mobile-money dialog follows. Provider and number persist, contact-number reuse is explicit, and completion/skipping is remembered. Account lists saved methods and supports adding/removing them and choosing a default when adding. No PIN, verification or charge is involved.
- Mobile gets a shallow campaign banner above its product grid. Category copy, section headers, rail controls, product prices/buttons and account headings are compact. Public contacts are centralized in ContactInfo; merchant receiving-account settings remain unchanged.

## API and ownership
- GET /api/user/setup returns requires_address, offer_payment_setup and payment_setup_status.
- POST /api/user/setup/address-complete checks for an owned saved address; otherwise 409.
- POST /api/user/setup/payment-skip persists dismissal without downgrading completed setup.
- GET /api/payment-methods retains available_providers and now includes owned payment_methods. POST persists type=mobile_money, an available provider slug, normalized Malawi phone_number and optional boolean is_default/use_for_contact. DELETE removes only an owned method; defaults are reassigned safely.
- Customer preferences live in customer_payment_methods, separate from the provider catalogue. Per-customer writes serialize on the user row, and contact conflicts roll back preference changes. Private responses use Cache-Control: no-store.
- CustomerExperience coordinates dialogs; PaymentMethods and account.index own the forms; ShopProductPreview owns seller-specific previews. CustomerSetupController/User hold setup state; PaymentMethodController/CustomerPaymentMethod own customer preferences.

## Rollout
Back up production and apply the migration before deploying the new backend/frontend. Do not seed or run unrelated historical migrations.

```sh
node scripts/run-migrations.js up --only=202611070001-customer-setup.js --dry-run
node scripts/run-migrations.js up --only=202611070001-customer-setup.js
```

The earlier 202611060001-mobile-commerce.js migration remains a prerequisite for delivery-location fields if not already applied. Existing users receive onboarding_required=false; subsequent inserts enroll by default. Migration reruns preserve existing enrollment decisions. No production migration, deployment or image push was performed.

## Verification
Implementation and rollout documentation were completed before tests, as requested.

- Frontend: all 76 tests across 23 files pass; the final focused rerun passes all 15 new experience/preview tests. New-component ESLint and the production build pass.
- Backend: all 44 unit tests and four isolated MySQL integration checks pass. These cover migration reruns, existing-account exemption, SQL/ORM enrollment, owned addresses, validation, deduplication, ownership isolation, contact opt-in/conflict rollback, default reassignment and durable skip state.
- Browser: home, Shops, product details and sign-in show no horizontal page overflow at 320, 390, 430, 768 and 1440px. Shop heights match. Homepage remains a mobile carousel and larger-screen grid. Guest dismissal remains effective after further clicks/scrolls.
- Disposable local account: signed in, saved a manual address with maps unavailable, received the separate payment dialog, saved a number, and confirmed the Account listing without changing contact phone. The isolated database and test servers were removed after verification.
- Provider-issued Google sign-in and actual geolocation/provider lookup were not exercised; Google failure/email fallback and manual address fallback were checked. Real map keys remain required.
- Global TypeScript still reports 45 existing diagnostics outside the new components and changed account/product routes; this is not a clean global type-check claim.

Production-build preview: http://127.0.0.1:3003/ (public catalogue reads). Real sign-in can be restricted by the live backend's origin configuration; authenticated testing used disposable local data. Publication status and immutable image digests are recorded in deploy/release-20261107.json in the backend repository. Production migration/deployment are separate from registry publication.
