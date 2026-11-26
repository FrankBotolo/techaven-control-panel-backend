# Selective store and stock import

Scope: import local active, approved shop profiles and active positive-quantity seller listings onto the existing production catalogue. Include listing prices, quantities, conditions, warranties and images. Do not import users, orders, payments, carts, subscriptions, catalogue products, variants or colors. Existing shop fields and existing listings are never overwritten. Imported shops remain admin-managed until owner accounts are linked separately.

## Implementation plan and acceptance

1. Export a private JSON bundle with `scripts/export-store-stock.js`, including exact product slugs and canonical variant keys. Acceptance: no account or order records, no source primary keys used as destination IDs.
2. Plan in `services/catalogue/store-stock-import.js`; execute in `scripts/import-store-stock.js`. Acceptance: dry run writes no rows, missing/ambiguous identities are held, applies are atomic, reruns never add stock or overwrite production changes. Proposed commit: `Add selective reviewed store and stock import`.
3. Verify unit cases and isolated MySQL transactions, including held items, mid-import failure rollback, rerun and unchanged protected records. Publish scripts and provide the private bundle separately; inspect production dry run before applying.

## Export

Run against the intended local source database:

```sh
node scripts/export-store-stock.js /private/new-stores-stock.json
```

The exporter uses the backend database configuration and a repeatable-read transaction. Existing output files are never overwritten. Store contact details and private listing metadata can be present; transfer privately and never commit the JSON bundle.

## Production preview

From the actual production API repository root, with the deployed `.env` and current source:

```sh
node scripts/import-store-stock.js /root/stores-stock.json \
  --media-base https://images.techavenmw.com \
  --report /root/store-stock-preview.json
```

Choose a new report filename each time. This does not create shops or listings. All reports are private. Matching requires the exact product slug, canonical variant key, variant specifications and optional color identity. Never infer an equivalent variant from display names or numeric IDs. Review `held` before applying. If the deployed database has only a small test catalogue, many local stock records will be held; do not run a full commerce restore to resolve that.

Shop matching uses normalized exact names and refuses conflicting contacts. Existing matched shops are reused without changing their profile, status or ownership. Original merchant SKUs identify imported listings; where absent, `stock-import-v1-<source listing ID>` is used. Conflicting existing stock is held, not overwritten. Exact reruns skip identical listings. Concurrent applies should not be attempted.

## Apply after review

Take a successful logical backup of the production MySQL database first and stop API/background writes. Run the same command with a fresh report filename and `--apply`. Any held records prevent the entire apply; `--allow-held` supports an explicitly reviewed partial import. An apply touches only shops, seller listings, listing images and additive CMS catalogue-feed events, in one serializable transaction. Do not use `migrate:fresh`, `seed` or `commerce.sql` for this selective operation.

No product, variant, color, account or transaction records are copied or updated. Imported shops do not include source sales totals, loyalty balances, verification documents, ownership assignments or subscription/payment state. Source approval/verification flags are preserved only for the reviewed active shop profiles.

`--media-base` rewrites local commerce `/uploads/` links onto that public base, preserving nested paths. It does not upload any image files; upload the public backend upload tree with its directories separately. Existing manufacturer/remote URLs remain unchanged. Images stored elsewhere must be verified separately.

After apply, check counts, individual listing prices/stock, shop eligibility, public images and the API health endpoint; restart the API and save PM2. A failed database operation rolls back all imported rows. If restoration from the backup is needed, stop writes first and restore using the established database recovery process.

## Validation

Unit tests: `node --test tests/unit/store-stock-import.test.js`.

The integration test only runs when the actual database name is `techaven_store_stock_import_test`; it creates isolated fixtures and checks dry run, all-or-nothing holds, database failure rollback, idempotence and unchanged user/order/catalogue records. Never target production with this test.
