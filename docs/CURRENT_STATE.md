Publication checkpoint - 2026-11-07: frontend source 6a702ea and backend source 011b1fd are pushed to GitHub main. Both linux/amd64 images are built and smoke-tested under tag 20261107-customer-setup. Docker Hub uploads are blocked by insufficient_scope on the current login; registry publication is NOT complete. latest unchanged, no production migration/deployment. See deploy/release-20261107.json.

Customer setup checkpoint - 2026-11-07: implemented and verified. Frontend 76 tests, backend 44 unit tests and four isolated MySQL integration checks pass; production frontend build passes. New-component lint passes; global TypeScript retains 45 existing diagnostics, with none in the new components or changed account/product routes. Browser checks cover home, Shops, product and sign-in at 320/390/430/768/1440px; account address-to-payment flow verified with disposable local data. No production migration/deployment. Apply only 202611070001-customer-setup.js before backend/frontend rollout. Existing accounts remain exempt. See docs/CUSTOMER_SETUP_20261107.md.

# Current State

Mobile commerce checkpoint — 2026-11-06: mobile product-first home/history, compact shop cards/footer, optional Geoapify addresses and private payment proof/admin review APIs implemented. Frontend 61 tests, backend 42 unit/eight isolated MySQL tests, production builds/health and completed responsive browser matrix pass. Global TypeScript still reports 46 existing strict-typing errors outside the added components. Versioned Docker images published (release-20261106.json); no production rollout. Manual transfers stay disabled until real account/WhatsApp details, private volume and future admin UI are ready. Geoapify keys still required for real location lookup. Exact single-migration commands and rollout are in docs/MOBILE_COMMERCE_20261106.md. Next: apply only 202611060001-mobile-commerce.js against backed-up production, mount private proof volume, and deploy the versioned backend/frontend. Never reseed restored production data.


Dokploy packaging checkpoint — 2026-11-02: three Linux amd64 production images built and locally healthy; runtime URLs, external Dokploy databases, persistent uploads, private export and dry-run media rewrite are documented. Validation: 55 frontend / 19 CMS / two migration tests pass; Compose, HTTP forwarding and backup checksums pass. All three Docker Hub images published and both tags verified; exact digests are in the release receipt. Private backup is ../migration-backups/2026-10-31-release. No remote data migration. See docs/DOKPLOY_DEPLOYMENT.md and deploy/release-20261031.json.

Shop onboarding checkpoint — 2026-10-22: eight new shops / 167 offers (19 shops / 423 offers total), 20 held items, separate evidence and unavailable-photo reports. Factual heroes/contact details replace promotional copy across all 19 seeded shops. Raw source fields are filtered from catalogue, individual listing and basket responses. Full rerun created zero records and protected unrelated offers. Eight backend tests, 13 frontend tests, production build and nine HTTP checks pass. Browser visual inspection unavailable; 92 new offers / 74 model families intentionally show unavailable photos. See docs/SHOP_ONBOARDING_20261022.md and docs/SHOP_ONBOARDING_HELD_20261022.md. No push/deployment.


PAYGO/shop expansion checkpoint — 2026-10-14: 11 shops / 256 offers, four new shops and 68 priced offers plus Tech Central price enquiry. PAYGO ID 5 renamed; /paygo includes Saeed/Innovative and Yellow guide. Edited shop heroes expose contacts/delivery/warranty/VAT facts. Exact offer verification, duplicate-free rerun, three backend tests, 12 frontend tests, build and rendered HTTP checks passed. See docs/SHOP_EXPANSION_PAYGO.md. Browser visual check and public media URL deployment remain outstanding.

Brand navigation checkpoint — 2026-10-14: categories API exposes available brand counts/images. Image-led brand menu and category hero link to URL-driven API filters; all pages fetched. Eight live smartphone brand counts/isolation checked, final eight frontend tests and production build passed. IAB visual check unavailable. See docs/BRAND_NAVIGATION.md.

Latest checkpoint: Apple & All 17 offers; Saeed Enterprise eight offers; seven shops / 188 offers. Loans shares eligible seller offers with Smartphones, verified live with itel Power 80; cash-only sellers excluded. Eight backend tests passed. Stock-first galleries and earlier frontend build/tests verified. See docs/SHOP_SEEDS_AND_LOANS.md. Remaining: public upload base, missing Saeed photos, unavailable IAB visual check, pre-existing migration ledger discrepancy.

## Apple Guy / Edgicate seed checkpoint — 2026-10-13

Completed user-supplied offer seed (`9860fe1`): Apple Guy ID 4 with two used iPhone offers; Edgicate Store ID 5 with nine used laptop offers. Created eight missing, unverified laptop devices, nine laptop variants, 11 offers and 22 listing photos, with both supplied logos. Both disputed storage values were confirmed as 128 GB; all conditions and retail prices are recorded in `docs/APPLE_EDGICATE_SEED.md`. Source/receipts: sibling `../shop-seed-apple-edgicate/`. Local totals: five shops, 163 offers.

Verified: six focused catalogue unit tests, exact offer price/stock/storage/condition checks, all marketplace detail endpoints, 24 media URLs returning matching image bytes, full rerun with zero duplicates, and identical full-record hashes for the original three shops/152 offers. No existing device/variant updates or schema changes. Next check: visual storefront verification when the browser becomes available; current session had no in-app browser backend. Media URLs use local localhost:8000 and need an explicit public media base before remote deployment. Earlier unrelated media/handoff files remain unstaged.

## Laptop seed checkpoint — 2026-10-13

Completed local TechAPI laptop import: 1,966 source records at revision `db1dea0c38ff07fcf400aa05d8c8e4393348eb25`, category Laptops ID 2, 1,230 model families and 1,909 configurations across 23 brands. Source checkout/receipts: sibling `../techapi-laptop-data/`. Configuration-aware importer checkpoint: `685748f`; contract and mapping: `docs/TECHAPI_LAPTOP_IMPORT.md`.

Validation: 27 backend unit tests passed; all stored configurations/shared specs matched source; catalogue list/detail HTTP 200; full rerun created zero duplicates or errors. Existing 36,999 smartphones, three shops and 152 offers retained identical protected-record hashes. One unverified duplicate intentionally preserved a verified variant. Next step for storefront availability: sellers add laptop offers with real prices and stock. No schema migrations, price changes or provider configuration occurred. Earlier unrelated media/handoff work remains unstaged.

Last updated: 2026-10-12 (Africa/Johannesburg)
Repository/workspace: `techaven_backend`
Branch: `main`
Checkpoint commit: `78dff35` validates backend auth transaction ordering; frontend auth is `b46adc0` in the sibling repository.
Working tree: auth is split into focused local commits; unrelated media/UI handoff changes remain unstaged. No auth commits pushed.

## Project in One Paragraph

This is a MySQL/Sequelize Express API. Legacy `/api/products`, cart, order, and mobile contracts remain v1. An additive `/api/v2` separates Techaven-owned brands/devices/variants/colors/media from shop-owned listings, listing images, stock, price, carts, and orders.

## Current Objective

Customer authentication API v2 is implemented and running locally alongside the existing catalogue. Session/password flows are verified; live Google sign-in and email delivery await provider configuration. See the auth checkpoint below.

## Current Phase / Status

- Implemented: ordered migration runner; canonical schema/models; admin catalogue management; TechAPI importer; seller listings and product requests; public catalogue/marketplace reads; v2 cart/checkout; staged legacy mapping; documentation.
- Implemented: multi-stage backend `Dockerfile`, MySQL 8.4 Compose service, health checks, named volumes, non-root runtime, fresh-database bootstrap, and Node-specific environment template.
- Implemented: token-protected promotions feeds for canonical devices and shops, durable cursor events, idempotent backfill, marketplace ID/slug lookup, and approved-shop eligibility enforcement.
- Verified locally: module syntax/loading, model associations, route registration, importer dry run, and 17 isolated unit tests.
- Verified: 92,824 smartphone records from TechAPI revision `db1dea0c38ff07fcf400aa05d8c8e4393348eb25` yielded 132 brands, 36,999 devices, and 78,567 variants in category `Smartphones` (ID 1), with zero import errors.
- Verified local shop seed: Mnex Electronics (128 active offers), Pixie Electronics (24), and B24 Electronics (logo/shop only). 162 source price rows were consolidated to 152 offers using the highest redundant price per shop/configuration/condition. Stock 1 and unlabelled condition new were explicitly approved by the user. See `../shop-seed/README.md` and `result.json` for source assumptions and mappings.
- Verified storefront: marketplace exposes 94 distinct devices, all shop logos load, and homepage renders all three shop names. All 152 offers passed price, stock, condition, and uniqueness checks. Promotion events were emitted for these seeded shops and devices; full catalogue backfill remains outstanding.
- Verified manufacturer media backfill: 90 missing device photos inserted through `DeviceMedia`, with source URLs and model provenance in `Device.source_metadata`; four pre-existing photos preserved. All 94 seeded devices have photos. A second apply skipped all 90 manifest entries with zero errors or duplicates. Full shop/listing record hashes were identical before/after (three shops, 152 offers). Two India CDN URLs were verified from Windows because container fetches failed; their original manufacturer URLs remain recorded.
- Frontend product/header fixes: offer selection after grouped specifications, saved shop logos, variant-aware price/condition/warranty/basket selection, explicit photo fallbacks (including cached-image hydration), 49 locally bundled Solar icons, live-only header menus and generic search placeholder. Validation: 26 frontend tests, focused backend source-validation test, production build, Galaxy A05 128 GB basket check, Pixel 6 seller switch, desktop/mobile visual and keyboard checks. Standalone frontend TypeScript checking still reports pre-existing strictness errors; production build passes.
- Needs follow-up: reconcile migration history with startup-bootstrapped tables, then run the promotions-event backfill before enabling CMS reconciliation.

## Documentation Authority / Approval

- `API_DOCUMENTATION.md` remains the primary backend contract; `docs/CATALOGUE_API_V2.md` is the approved v2 catalogue contract for this work.
- Airtel, owner-registration, and subscription focused-document authority is unchanged.
- Existing reference documentation remains in place. See `docs/DECISIONS.md` for precedence and the accepted v2 decision.

## Module Boundaries / Failure Isolation

- `routes/v2/` is mounted beneath the existing `/api` router and does not replace v1 routes.
- `services/catalogue/` owns normalization, errors, DTOs, media resolution, import, and legacy matching. `services/marketplace/` owns listing rules.
- `services/catalogue/promotionSync.js` owns CMS projections and durable cursor events; its HTTP feed fails closed without a dedicated bearer token.
- Import and legacy migration run as explicit CLI jobs; they are not part of server startup.
- MySQL remains shared infrastructure. V2 handlers fail with structured errors, but database unavailability still affects the whole API.
- Docker startup waits for MySQL health, retries authentication, and optionally bootstraps only missing schema objects with `alter: false` and `force: false`.
- Checkout locks listing rows, validates stock, creates one order per shop, stores immutable snapshots, and decrements listing quantity in one transaction.

## Working Set — Start Here

- `docs/CATALOGUE_API_V2.md` — API, migration, import, and compatibility contract.
- `routes/v2/index.js` — complete v2 route surface.
- `models/index.js` — catalogue/listing/commerce associations.
- `database/migrations-js/` — ordered schema changes.
- `docker-compose.yml` and `Dockerfile` — two-container local/deployment entry points.

## Decisions / Constraints

- V1 remains unchanged and uses legacy product IDs; v2 carts use seller-listing IDs.
- MySQL JSON replaces the prompt's PostgreSQL JSONB suggestion.
- One active offer is allowed per shop/variant/color/condition.
- Ambiguous legacy products stay operational in v1 and unpublished in v2 until reviewed.
- TechAPI imports require attribution and never fetch remote data during a run.

## Known Issues / Risks / Unresolved Questions

- Startup bootstrap created the local schema. `migrate:v2` stops at the existing `brands` table; the migration ledger remains unapplied. No schema was dropped and no migrations were marked applied without verification.
- The local MySQL container publishes port 3307 because host port 3306 is occupied. The backend publishes port 8000.
- MySQL DDL may implicitly commit; backup and staging validation are required before production migration.
- The TechAPI dataset contains inconsistent and duplicate source records; importer reports must be reviewed.
- V2 reviews, favorites, banners, loyalty points, and promotions are intentionally deferred.
- Canonical product naming across Chiwaya/Techaven/TecHaven remains unresolved.

## Verification

- `npm test`: 17 passed, 0 failed on 2026-10-10.
- Syntax/model/route import checks: passed for new modules.
- TechAPI two-record fixture dry run: passed with zero errors.
- `git diff --check`: required at final checkpoint.
- `docker compose config --quiet`: passed; exactly `backend` and `database` services resolve.
- Docker image build/start: passed; backend and MySQL healthy, `/health` returns HTTP 200.
- Full dataset dry run: 92,824 records, zero errors. Batched import reused the existing reader/normalizer and verified-value precedence; 6,218 lower-confidence conflicts were preserved.
- Seed integrity: zero orphan variants/brands, wrong-category devices, or missing source metadata. Catalogue and brand APIs passed; catalogue pagination reports 36,999 devices.
- Dataset, source revision, batch seed script, attribution, and reports are in sibling folder `../techapi-smartphone-data`; see `SEED.local.md` there for execution details.
- Not run: integration tests, migration rollback, promotions backfill, or external payment/email/SMS checks.

## Chunk Progress / Commit Checkpoints

- `4600736` — test and migration foundation.
- `e9e320c` — canonical catalogue schema.
- `789a72c` — catalogue management services.
- `c7d97b3` — TechAPI importer.
- `a843852` — seller listings and product requests.
- `da589c8` — public catalogue and marketplace reads.
- `556817b` — listing-based cart and checkout.
- `290f4a9` — staged legacy migration and review.
- `7afbb16` — management API completeness.
- `d6fd6c4` — v2 API, migration, importer, and handoff documentation.
- `cb097e7` — listing-stock restoration for v2 order cancellation/rejection.
- `adc6791` — final catalogue v2 handoff checkpoint.
- `b9b06be` — promotions catalogue event/feed contract and eligibility enforcement.
- `471dc46` — marketplace shop filtering and stable shop sync identity.
- `da6409f` — shop, brand, device, and availability event emission.
- Push status: `main` was pushed to `origin/main` on 2026-10-10 with explicit user authorization.

## Next Concrete Actions

1. Reconcile the migration ledger with the schema created by startup bootstrap without dropping the seeded catalogue.
2. Verify the promotions-event schema, run `npm run catalog:backfill-promotions`, and verify authenticated feed pagination.
3. Only then run the CMS one-time v2 reference reset and enable reconciliation; keep both flags false on any failure.

## Auth v2 implementation checkpoint � 2026-10-12

Customer auth is implemented under `/api/v2/auth`, with email/password and Google linking, one-time verification/recovery challenges, rotated HttpOnly refresh cookies, immediate v2 session revocation and v1 access-token compatibility. The storefront uses in-memory access tokens, expiry renewal, same-origin development/production API forwarding and authenticated basket ownership guards.

- Additive auth migration applied to local MySQL; second application made no changes. Existing catalogue ledger discrepancy is preserved, not hidden: only `202610120001-create-auth-v2.js` was selected.
- Checks passed: 23 backend unit tests; 14 auth MySQL integration tests plus the integration foundation check (provider calls replaced by controlled test doubles); 41 frontend tests; production build and built-proxy login/cookie/refresh/profile/logout/origin checks. Desktop/mobile checks confirmed email sign-in, reload restoration, Galaxy A05 basket add/clear, logout, signup fields and keyboard recovery. Temporary local test account and basket were removed.
- Auth working-set TypeScript files have no diagnostics; unrelated existing strictness errors still prevent a clean standalone project typecheck.
- Runtime: backend/frontend remain healthy locally, with an ignored generated v2 secret. New origins must be allowlisted explicitly. Current local Wi-Fi origin is `http://192.168.1.126:3001`; HTTPS tunnel origin remains `https://fleta-noncontinuable-freya.ngrok-free.dev`.
- Outstanding setup: Google OAuth web client and SMTP credentials are absent. Existing verified customers can use email/password; new verification/recovery email delivery and real Google sign-in cannot be declared verified until configured. See `docs/AUTH_API_V2.md` for setup.
- Local commits are split by session foundation, customer endpoints, transaction hardening, storefront integration and verification/setup docs. No auth changes have been pushed. Earlier unrelated UI/media changes remain outside these commits.

Next concrete auth action: create/configure the Google web client and email provider, restart the backend, then verify real Google sign-in/linking and email delivery. The older catalogue/CMS follow-ups above remain separate.
