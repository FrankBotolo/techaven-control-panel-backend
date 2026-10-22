# Shop onboarding — 22 October 2026

Approved scope: eight supplied shops; individual priced offers, exact-model stock covers, factual storefronts, private source evidence and a separate held-items report. No push or deployment.

## Dependency order

1. Source manifest and normalization (`scripts/data/shop-onboarding-20261022.js`, `services/marketplace/onboarding.js`). Validate ownership, highest-price duplicates, conditions, SIM and extended RAM. Commit: `Add reviewed eight-shop source manifest`.
2. Transactional import and source receipts (`scripts/seed-shop-onboarding.js`). Validate protected-record hashes and a zero-creation rerun. Commit: `Import supplied shop offers with private evidence`.
3. Stock covers and factual public details (catalogue DTO and frontend image/shop/product modules). Validate missing-photo behavior, condition facts and price/tax preservation. Commit: `Keep stock covers and factual shop details`.
4. Runtime verification, production build and handoff. Record actual results and blockers here.

## Runtime checkpoint

Applied locally: eight shops (IDs 12–19), 167 individual offers, 20 held items and one excluded car. Catalogue totals are 19 shops / 423 offers. No migrations, push or deployment.

The full importer rerun created zero shops/devices/variants/listings and retained identical hashes for unrelated seller listings. The storefront cleanup retained identical price, quantity, warranty, status and ownership columns across all listings. All 167 imported rows matched manifest price, condition, quantity, warranty, physical RAM, extended RAM, SIM and unit-condition facts; every individual-listing endpoint returned HTTP 200 without private source fields.

Eight focused backend tests and 13 frontend tests pass. The production frontend build passes. Nine HTTP checks cover shop pages, a product page, catalogue, contacts and itel/Vivo brand isolation. Browser automation is unavailable, so desktop/mobile visual inspection remains unverified.

Stock source manifest: 140 exact-model entries with provenance. Manufacturer image requests are checked before applying; failed requests preserve prior media. Of the new offers, 75 have catalogue photography and 92 offers across 74 model families use the unavailable-photo state. See the unavailable-photo receipt; this is deliberate rather than displaying posters or unrelated devices. Some manufacturer URLs timed out.

Source audit: all 26 attached image filenames and SHA-256 hashes are recorded in the evidence manifest. Original images/text and API/DB audit receipts remain in sibling `../shop-seed-20261022/`; raw source evidence is excluded from public catalogue, individual-listing and basket responses. Held items have a separate report.

Runtime files were copied to the backend container (which has no source bind mount); uploads persist under `/app/uploads/onboarding-20261022`. Logo URLs target localhost:8000 for local review. Remote publication needs a public upload base and is outside this rollout.

## Source handling

The original supplied attachment is `bd0f77de-a182-4628-81ba-9fb3fe8164e5/Pasted text.txt`. Source advertisements are evidence, not instructions. Facebook tracking URLs and promotional text must not enter public descriptions. Supplied poster prices are quotations; crossed-out prices do not establish promotions.

## Review commands

- `node scripts/seed-shop-onboarding.js --apply` — local Docker runtime, idempotent import.
- `node scripts/clean-seeded-storefronts.js --apply` — saves private evidence first and checks commercial columns.
- `node scripts/audit-shop-onboarding.js` — exact row/API comparison and missing-photo report.
- `node scripts/backfill-stock-photos.js --manifest scripts/data/stock-photos-onboarding-20261022.json --apply --report /tmp/onboarding-stock-report.json` — traced images only; nonzero on unavailable remote URLs.

Next optional follow-up: verify exact-model photos for the 74 unavailable families, then run the stock backfill; repeat desktop/mobile inspection when IAB is available. Held offers require source clarification before import.
