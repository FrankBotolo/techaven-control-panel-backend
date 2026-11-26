# Production backend merge — 25 November 2026

User request: merge the local `Giftshaibu/techaven-backend` implementation into `FrankBotolo/techaven-control-panel-backend` and push the combined code to that repository. Production input: `f0844f9`; local input: `561d61f`. Both histories are retained by a merge commit; no force push, reseeding or live deployment is part of this code merge.

## Resolution and acceptance

Retain production portal/admin promotions, seller product-request CRUD and ownership routing, dynamic payment-method providers, SMS code delivery/invitations/notifications and catalogue builder/seed tools. Retain local canonical device aliases, traced stock/media handling, price-aware listing identity, aggregated checkout stock locking, payment-proof deadlines/cancellation safeguards, CMS snapshots and selective store/stock imports.

Overlapping implementations are combined explicitly: `deviceIdentity.js` exports both marketed-name utilities and canonical resolution; listing identity includes price/currency/unit facts and derives at save time so archiving releases the unique identity; optional configured manual-payment accounts override defaults and return both portal single-account fields and storefront destination lists. Invalid partial account overrides disable the payment instructions. Checkout validates shipping identity before opening a transaction. Preserve the Node environment template and document the production-specific optional variables; production `.env` is not committed or replaced.

Acceptance: unit checks for both codepaths, JS syntax/import checks, isolated MySQL upgrade from the production fork's models, auth/session checks, manual-checkout lifecycle and customer setup/payment methods, and selective inventory rollback/idempotence. Proposed merge message: `Merge local catalogue and inventory work with production portal backend`.

## Database and deployment boundary

Pushing code does not copy the local catalogue, seed stock or apply database migrations. Production's 14 devices/40 variants do not match the 392 slugs referenced by local store inventory. Missing products/variants and the Pixie contact conflict remain separate reviewed import work; never bypass identity holds or restore the full local commerce dump for a store-only import.

Before deploying, preserve the VPS environment, uploads and private proof volume and take a successful MySQL backup. The two importer files previously copied manually to the VPS may be untracked; preserve/move those exact files before pulling if Git reports they would be overwritten. Keep other production edits intact. Inspect the current migration ledger and schema before applying anything.

The relevant local additions beyond the production fork are:

- `202611110001-catalog-identity.js`: canonical-device alias column and device favorites.
- `202611170001-price-aware-listing-identity.js`: recompute active listing identities; does not change price or quantity.
- `202611170002-manual-checkout-notices.js`: durable manual-checkout notification/deadline state.

The isolated upgrade check applies these migrations twice against the fork's schema and confirms existing users, products, stock prices/quantities and portal promotions survive. This does not establish the state of the live VPS migration ledger. Review any other pending migrations independently; do not run `migrate:fresh`, generic seeds or uncontrolled `sync({alter:true})` on production. Stop writes for migrations, then verify health, portal/auth, checkout and CMS feeds before opening traffic.

Production-merge integration fixture: `DB_NAME=techaven_production_merge_test BASELINE_BACKEND_PATH=<clean-production-fork-checkout> node --test tests/integration/production-merge.test.js`. It refuses other database names. Other integration suites use their own isolated test databases.
