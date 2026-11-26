# Shop seeds and shared loan category

## Local checkpoint — 2026-10-14

Apple & All: shop 6, 17 active offers. Seed and manifest: `scripts/seed-apple-all.js`, `scripts/data/apple-all.js`. User confirmed the malformed iPhone 16 Pro Max price as MWK 5,300,000. The unrelated front phone photograph is excluded. Watch SE 2 case size remains unspecified. The supplied 16-inch M5 / 32 GB M5 Max descriptions remain explicitly unverified seller claims. Receipts and supplied photographs: sibling `../shop-seed-apple-all/`.

Stock galleries show catalogue photography first, then selected shop evidence, then other catalogue photographs. `scripts/backfill-stock-photos.js` and `scripts/data/stock-photos-20261013.json` cover 27 models: 24 missing stock images added and three existing images retained. Original catalogue photographs are preserved when the primary pointer changes. Source evidence includes manufacturer pages and two model-family retailer/catalogue fallbacks. Verification checked all 27 image URLs, all 17 offers, duplicate-free reruns and unchanged hashes for protected shops/offers/photos. Frontend: 44 tests passed, final focused eight tests and production build passed. Browser visual verification remains unavailable because the IAB backend was not discovered.

Saeed Enterprise: shop 7, eight active offers, six missing unverified devices and eight variants created. Manifest: `scripts/data/saeed-enterprise.js`; CLI: `scripts/seed-saeed-enterprise.js --apply`. Logo and receipts: sibling `../shop-seed-saeed-enterprise/`. No contacts/location fabricated; new condition and quantity one follow the agreed local seed defaults.

| Offer | Cash price MWK | Physical RAM / storage GB |
|---|---:|---|
| itel Power 80 | 630,000 | 4 / 128; extended RAM 4 |
| Tecno Pova Slim 5G | 1,150,000 | 8 / 256; extended RAM 8 |
| Oteeto M17 Pro Max | 400,000 | 8 / 256 |
| Lenovo Chromebook Duet 11M889 | 900,000 | unspecified |
| Oale 17 Pro Max 4G | 370,000 | 8 / 128 |
| Xiaomi 17 Pro Max | 4,500,000 | 16 / 512 |
| Redmi 9T | 420,000 | unspecified / 128 |
| Tecno Spark 50 | 610,000 | unspecified |

Duplicate Oteeto adverts consolidate at the highest supplied price. User explicitly requested Spark 50 charging and memory remain unspecified. Free accessory contents and loan duration/total repayment remain unknown. No financing checkout or promotional campaign was invented. Saeed photographs beyond its logo were not supplied; existing canonical media are reused where available, and missing photos use the existing unavailable-photo state.

## Shared Loans category

Migration `202610140001_listing_categories.js` adds an offer/category junction without replacing canonical device categories or duplicating stock/listings. `services/marketplace/category-filter.js` filters eligible seller offers when Loans is requested. Smartphones keeps its existing device category filter. `CategoryController` counts available loan devices; `V2MarketplaceController` requires approved active sellers and positive stock as before.

Current explicit loan source: Saeed itel Power 80, deposit MWK 207,000, month MWK 95,000, day MWK 3,000, with duration unspecified. Its same offer appears in Loans (category 5) and Smartphones (category 1). Loan membership is seeded idempotently; future loan offers must be explicitly assigned in `seller_listing_categories`. Cash-only offers are not automatically classified as loans.

Applied only this targeted migration using `scripts/run-migrations.js up --only=202610140001_listing_categories.js`; the pre-existing migration-ledger discrepancy remains unresolved. Live API checks verified both categories return the same itel device, loan count one, and cash-only Apple & All seller filtering returns zero loan devices. Two focused category tests passed, including SQL identity validation. Saeed full reruns create zero duplicates and preserve other shops/offers. Local totals: seven shops, 188 offers.

Local uploads use localhost:8000; public media base configuration is needed before remote deployment. All commits are local; no push performed.
