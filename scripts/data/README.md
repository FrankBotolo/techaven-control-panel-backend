# Seeded shop device media

`seeded-device-media.json` identifies the 90 devices that lacked photos, with exact catalogue IDs/slugs, verified manufacturer models, source pages, image URLs and verification dates. The four IDs in `preserved_existing_device_ids` already had photography. Together these cover all 94 devices offered by the local Mnex/Pixie seed; B24 has no seeded offers.

Sources are Apple Support's model identification page, Google Store's Pixel comparison pages, and exact Samsung and Xiaomi product/specification pages. Samsung images are checked against model codes where localized titles differ. Network-specific Redmi models have explicit matches; storage variants share the corresponding device photograph.

Run from the backend repository:

```powershell
node scripts/backfill-device-media.js --manifest scripts/data/seeded-device-media.json --report media-dryrun.json
node scripts/backfill-device-media.js --manifest scripts/data/seeded-device-media.json --apply --report media-applied.json
```

The script checks identity, manufacturer hosts and image responses, skips devices with existing photos, and transactionally inserts generic device media plus source provenance and a promotion-sync event. Prices, quantities, shop records, schema and public API contracts are untouched. Repeated applies are safe.

Local verification on 2026-10-10: 90 photos added, four preserved, 94/94 devices with images; rerun inserted zero and skipped 90. Three shop records and all 152 listing records remained byte-equivalent after serialization. Redmi 12 5G and A4 5G image URLs were successfully fetched and verified on Windows but failed from Docker; those two entries were applied using the exported backfill function after checking the host verification receipts.

Detailed local receipts and screenshots are in `../../../device-media-backfill/` (`final-verification.json`, `image-verification.json`, `rerun-report.json`, `desktop-product.png`, `mobile-offers.png`).
