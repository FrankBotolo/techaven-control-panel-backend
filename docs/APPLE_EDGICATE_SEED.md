# Apple Guy and Edgicate local offer seed

Seeded on 2026-10-13 from the user's supplied text, logos, product photos and posters. The source manifest is `scripts/data/apple-edgicate.js`; the idempotent entry point is `scripts/seed-apple-edgicate.js`.

| Shop | Device | RAM / storage | Retail price (MWK) |
|---|---|---|---:|
| Apple Guy | iPhone 16 Pro Max | 256 GB | 3,600,000 |
| Apple Guy | iPhone 15 Plus | 128 GB | 2,000,000 |
| Edgicate Store | Dell Precision 5550, i7-10875H, Quadro T2000 4 GB | 16 / 512 GB | 2,550,000 |
| Edgicate Store | HP ProBook x360 11 EE G7, Core m3 | 4 / 128 GB | 530,000 |
| Edgicate Store | HP EliteBook 840 G8, i5 11th Gen | 8 / 256 GB | 1,450,000 |
| Edgicate Store | Dell Latitude 5420, i5 11th Gen | 8 / 256 GB | 1,230,000 |
| Edgicate Store | Dell Latitude 5410, i5 10th Gen | 8 / 256 GB | 1,050,000 |
| Edgicate Store | Microsoft Surface Go 2, Core m3 | 8 / 128 GB | 660,000 |
| Edgicate Store | Microsoft Surface Laptop 2, i5 8th Gen | 8 / 128 GB | 1,040,000 |
| Edgicate Store | Dell Latitude 3120, Pentium as advertised | 8 / 128 GB | 600,000 |
| Edgicate Store | Lenovo ThinkPad X1 Yoga Gen 3, i5 8th Gen | 8 / 256 GB | 1,220,000 |

## Confirmed corrections and boundaries

- The user confirmed 128 GB for the iPhone 15 Plus and ProBook. The ProBook poster's 200 GB is retained as original source evidence, with the correction recorded in the manifest and source metadata.
- ProBook retail price is 530,000 from the poster; the text's `k5300,000` was treated as a typo. Wholesale 490,000 remains in the manifest, with no wholesale checkout functionality invented.
- All offers are used. Posters explicitly say fairly used; the user separately confirmed used condition for the Dell Precision and EliteBook. The iPhone battery photos show used devices.
- Quantity is the previously agreed local placeholder of one. Reruns preserve quantities and the highest existing redundant price.
- No warranty, customer reviews, manufacturer verification, shop verification, seller accounts or payment/layby functionality were fabricated. Layby appears only as a supplied shop advertisement note.
- Eight missing laptop models were created as unverified records using only supplied facts. Nine laptop configurations were added, including an 8/128 GB configuration for the existing Surface Laptop 2. Existing canonical device/variant records were not overwritten. Laptop processor/screen claims remain unverified seller-source data.
- Battery-health details belong to the individual phone offer photos, not canonical device specs. The supplied About screenshot containing device identifiers was excluded from public listing media.

## Repeatable local operation

Source files and receipts are in sibling `../shop-seed-apple-edgicate/`. Copy `source-images/` into the backend's persistent uploads volume at `/app/uploads/apple-edgicate/`, and ensure the new script/manifest are deployed to `/app/scripts/`.

```sh
node scripts/seed-apple-edgicate.js --report /tmp/apple-edgicate-preview.json
node scripts/seed-apple-edgicate.js --apply --report /tmp/apple-edgicate-result.json
```

The default media base is local `http://localhost:8000/uploads/apple-edgicate`. Use `--media-base` and `--media-dir` for an explicitly configured target; localhost media URLs must be changed for remote/production access. Both catalogue categories must already exist. No migrations or resets are run.

## Validation and checkpoint

Local results: Apple Guy ID 4 has two active offers; Edgicate Store ID 5 has nine. Created eight devices, nine variants, 11 listings and 22 listing images; logos are stored on the shops. Duplicate photo bytes within a listing were consolidated. Rerun created zero devices, variants, listings or images. Existing three shops and 152 offers retained identical full-record hashes. Total local counts are now five shops and 163 offers.

Every offer was checked against the manifest for price, stock, storage, condition and absent warranty; marketplace detail endpoints exposed all 11 listings. All 24 public media URLs (22 listing images and two logos) returned HTTP 200 with image content types and bytes matching the supplied files. Existing catalogue unit checks were run. Visual browser verification remains pending because no in-app browser backend was available in the current session; no claim of a visual pass is made.

The seed emits existing shop/device promotion events after committing. It does not configure CMS promotions or alter unrelated shop records. Local receipts: `preview.json`, `result.json`, `rerun.json`, `verification.json`.
