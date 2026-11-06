# Mobile commerce — 6 November 2026

## Implemented before validation
Mobile-only home replaces the hero below 768px with eight live products; device-local successful product/shop visits are bounded to 20/30 days and can be cleared. Recent products/shops/categories are fetched in a bounded, failure-tolerant enrichment pass. Tablet/desktop hero stays in place. Mobile shop cards use contained small logos; the footer uses expandable groups and no sample shops/social links. Shared containment fixes protect narrow grids and long labels.

Leaflet is loaded only after opening the delivery map. Browser location is requested only after pressing Use my current location. Geoapify tiles use a restricted browser key; authenticated, rate-limited server lookup uses a separate key. Manual entry remains available without provider keys, permission or lookup. Nullable coordinates/accuracy/notes are additive to shipping address DTOs, and order snapshots retain delivery locations independently of address edits.

Private payment submission supports one JPEG/PNG/PDF up to 10MB, actual signature validation, server order totals, a complete unpaid checkout group, customer ownership and persistent idempotency keys. Pending review does not change payment_status. Rejection retains history and permits resubmission. Approval and provider completion share row-locked settlement so credits and escrow are atomic and repeat-safe. Customer self-completion and payment_status PATCH bypasses are blocked. Audits and in-app notifications are transactional. Customer and admin receipt access is authenticated, attachment-only and no-store. Receipts must never go in public uploads or source images.

## API additions
- GET /api/commerce-config: public manual payment availability/instructions, public restricted map key and configured legal URLs. With placeholders, enabled=false; no placeholder account is exposed.
- GET /api/location/reverse?lat=&lon=: authenticated reverse lookup with bounded upstream timeout/rate and editable address suggestions.
- GET /api/orders/:id/payment-context: owner-only checkout group, server amounts and related proof statuses.
- POST /api/payment-submissions: authenticated multipart receipt, order_ids JSON array, submission_key (16–80 alphanumeric/underscore/hyphen), payer_name and payment_reference (1–160), ISO payment_date (not future). Idempotent by customer/key.
- GET /api/payment-submissions/:id/receipt: owner/admin private receipt download.
- GET /api/admin/payment-submissions?status=pending_review&page=1: admin queue, 30/page.
- POST /api/admin/payment-submissions/:id/approve or /reject: admin only; reject requires reason (1–1000). Same completed decision is repeat-safe; opposite decisions conflict.
- Existing address APIs accept/return optional latitude, longitude, location_accuracy, delivery_notes. Existing order DTOs add delivery_location/checkout_group_id. v2 checkout records the chosen payment method and shared group; frontend preserves every returned order via the payment context.

## Rollout
Back up MySQL and volumes. The restored database has a known migration-ledger discrepancy: DO NOT seed, migrate:fresh, or blindly run all migrations. Apply only database/migrations-js/202611060001-mobile-commerce.js using a reviewed one-migration runner/receipt, then record it in the existing ledger once reconciled. Migration is additive and repeat-safe; MySQL DDL is not fully transactional. No automatic destructive down migration.

Backend: mount a named private volume at /app/private/payment-proofs with ownership node:node (1000:1000), alongside existing public uploads. .env examples contain placeholders only. Keep MANUAL_PAYMENTS_ENABLED=false and MANUAL_PAYMENT_REVIEW_READY=false until receiving details, real WhatsApp E.164 digits, storage and the separate admin review UI are verified. GEOAPIFY_BROWSER_KEY must be origin-restricted; GEOAPIFY_SERVER_KEY stays server-side. Set the production privacy and terms URLs; help-centre links are fallback until supplied. Existing auth signing keys and DB credentials are preserved.

WhatsApp deep links prefill payment/order references and payer/transaction details, without a public receipt URL. Submission is saved before redirect. The user still presses Send; a persistent Open WhatsApp fallback is shown. Payment approval is never inferred from navigation.

## Validation checkpoint
Implementation and documentation were prepared before tests as requested. Verification and publication are complete as recorded below. Full admin UI and production account/provider credentials remain outside this task.

## Verified release checkpoint — 6 November 2026
- Frontend: all 61 tests pass across 21 files, including history expiry/ranking, multi-order visibility, disabled/pending/rejected payment UI and lazy map fallback. Backend: all 42 unit tests pass; eight isolated MySQL tests pass, including ownership, signature validation, idempotent submissions, simultaneous approvals with one escrow credit per order, rejection/resubmission, rollback, address API validation and saved coordinates.
- Production frontend and backend Docker builds succeed and both packaged services return healthy HTTP 200. Configuration endpoint exposes enabled=false with no placeholder account; unauthenticated payment-context requests return 401. Actual payment/provider accounts were not used.
- Browser: phone home shows eight products and hides only the hero below 768px; real product visit changes the heading/recommendations and Clear browsing history resets it. Shop cards measured about 110px on phones. Home/shops/category/sign-in checked at 320/360/390/430/768/1024/1440px. Product listing/detail, shop detail, search, compare and basket checked at least at 320/390/768/1440px. No horizontal document overflow in completed checks. Mobile footer expands correctly. Packaged frontend console has no errors in the inspected mobile home.
- Authenticated proof/map states are covered by component and isolated API tests; a real-device geolocation/Geoapify lookup still needs production API keys. The full TypeScript check remains blocked by 46 existing catalogue/auth/CMS typing diagnostics (duplicate address/phone declarations, strict index access and optional types). No diagnostics remain in the newly added components or changed checkout call. Do not report a clean global typecheck.
- Both versioned linux/amd64 images are published; exact digests are in backend deploy/release-20261106.json. Existing latest tags were not advanced, so rollout can apply the schema before adopting the new backend. Production was not changed by this implementation.

## Exact Dokploy rollout
1. Back up the production MySQL database and volumes; keep customer traffic in maintenance during the additive migration/backend transition.
2. Use the new backend image for a one-off migration with its existing database credentials. Run `node scripts/run-migrations.js up --only=202611060001-mobile-commerce.js --dry-run`, then `node scripts/run-migrations.js up --only=202611060001-mobile-commerce.js`. The --only path was tested against a scratch database and records only this migration, avoiding older outstanding migrations. Never run migrate:fresh or seed.
3. Mount a persistent volume named `techaven-payment-proofs` at `/app/private/payment-proofs`, writable by the image's node user (1000:1000). Retain `/app/uploads` and existing database credentials/signing keys.
4. Deploy backend `gshaibu/techaven-backend:20261106-mobile`, then frontend `gshaibu/techaven-frontend:20261106-mobile`. Existing runtime API/CMS origins and public upload mounts stay configured.
5. Add `GEOAPIFY_BROWSER_KEY` restricted to the storefront origin and a separate `GEOAPIFY_SERVER_KEY` for server-side lookup. Set real `TECHAVEN_PRIVACY_URL` / `TECHAVEN_TERMS_URL`; help-centre links remain the fallback until supplied.
6. Keep `MANUAL_PAYMENTS_ENABLED=false` and `MANUAL_PAYMENT_REVIEW_READY=false`. Only enable both after the future admin review UI is available and real provider/account/WhatsApp details are configured. Confirm private receipt persistence and a fixture review before accepting live transfers.
7. Verify live mobile home, shop list, footer, saved address and order pages after deployment. CMS image does not change for this release.
