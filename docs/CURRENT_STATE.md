# Current State

Last updated: 2026-10-10 (Africa/Blantyre)
Repository/workspace: `techaven_backend`
Branch: `main`
Checkpoint commit: `471dc46` adds the v2 promotions feed and marketplace eligibility alignment
Working tree: documentation handoff changes may be pending; verify at session start

## Project in One Paragraph

This is a MySQL/Sequelize Express API. Legacy `/api/products`, cart, order, and mobile contracts remain v1. An additive `/api/v2` separates Techaven-owned brands/devices/variants/colors/media from shop-owned listings, listing images, stock, price, carts, and orders.

## Current Objective

Catalogue Marketplace API v2 is implemented. The repository also has a two-service Docker Compose stack for the backend and MySQL; a live container smoke test awaits an available Docker daemon.

## Current Phase / Status

- Implemented: ordered migration runner; canonical schema/models; admin catalogue management; TechAPI importer; seller listings and product requests; public catalogue/marketplace reads; v2 cart/checkout; staged legacy mapping; documentation.
- Implemented: multi-stage backend `Dockerfile`, MySQL 8.4 Compose service, health checks, named volumes, non-root runtime, fresh-database bootstrap, and Node-specific environment template.
- Implemented: token-protected promotions feeds for canonical devices and shops, durable cursor events, idempotent backfill, marketplace ID/slug lookup, and approved-shop eligibility enforcement.
- Verified locally: module syntax/loading, model associations, route registration, importer dry run, and 17 isolated unit tests.
- Needs verification: apply the promotions-event migration and run its backfill after Docker/MySQL is available and the TechAPI import has finished.

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

- Migrations have not been executed because no dedicated test database was configured.
- Docker previously passed backend/database health checks, but the Docker Desktop daemon was unavailable during the promotions rollout checkpoint.
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
- Docker image build/start: not run successfully because the installed Docker CLI could not connect to the Docker Desktop daemon.
- Not run: `npm run test:integration`, migration application/rollback, server startup, or external payment/email/SMS checks because no dedicated MySQL test environment was supplied.

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
- Push authorization: not authorized; all commits remain local.

## Next Concrete Actions

1. Start Docker Desktop/Engine and confirm whether `techaven-techapi-import` completed before changing catalogue schema.
2. Apply `202610100005-create-promotion-catalogue-events.js`, run `npm run catalog:backfill-promotions`, and verify authenticated feed pagination.
3. Only then run the CMS one-time v2 reference reset and enable reconciliation; keep both flags false on any failure.
