# Catalog cleanup dry-run review

The review uses the October 31 local commerce SQL snapshot in the workspace. It contains 423 seller listings and 423 units of stock across all listing statuses. This is a snapshot review. A fresh database dry run is required to generate the approval checksum for an apply.

## Proposed Redmi merges

| Source device | Canonical device | Variants moved | Affected seller listings in snapshot |
| --- | --- | --- | --- |
| 35691, Redmi Note 14 5G Global 256 GB, 24094RAD4G | 35394, Redmi Note 14 5G | 75534 | 67, shop 1, new, MWK 1,089,000, stock 1, no listing images |
| 35692, Redmi Note 14 Pro 4G Global Premium 256 GB, 24116RACCG | 35395, Redmi Note 14 Pro 4G | 75535, 78811 | 68, shop 1, new, MWK 1,350,000, stock 1, no listing images |
| 35693, Redmi Note 14 Pro 4G Global Premium 512 GB, 24116RACCG | 35395, Redmi Note 14 Pro 4G | 75536 | 69, shop 1, new, MWK 1,499,000, stock 1, no listing images |
| 35694, Redmi Note 14 Pro 4G Global Standard 128 GB, 24116RACCG | 35395, Redmi Note 14 Pro 4G | 75537 | None |
| 35695, Redmi Note 14 Pro 4G Global Standard 256 GB, 24116RACCG | 35395, Redmi Note 14 Pro 4G | 75538 | None |

The Redmi Note 14 5G records identify the same generation and 5,110 mAh platform. The global configuration identifies the Dimensity 7025. The Redmi Note 14 Pro 4G records share the Helio G100 platform and 5,500 mAh capacity. The detailed records have the same model number across storage and RAM configurations. The apply fills the known radio, storage, and model number on moved variants and holds a source if any existing variant conflicts. Listing 231 (shop 11, 128 GB, stock 1, image 55) already belongs to canonical device 35394. After the reviewed merge, that device has offers from shops 1 and 11 in the snapshot.

Xiaomi documents the hardware for both families. [Redmi Note 14 5G](https://www.mi.com/global/product/redmi-note-14-5g/), [Redmi Note 14 series hardware](https://www.mi.com/global/product/redmi-note-14/).

## Held for review

| Records | Affected listings | Reason |
| --- | --- | --- |
| Redmi Note 14 35400 and Redmi Note 14 4G 35393 | 35400 has no listings. 35393 has 229, 230, 258, 315, 316 across three shops. | The bare model contains both 4G and China 5G variant records. Resolve identity at variant level first. |
| Redmi Note 14 Pro 35399 and explicit 4G/5G records | 35399 has no listings. | Confirm the variants' radio and regional hardware. |
| Redmi Note 14 Pro+ 5G 35397, 35398, and 35698 | 232 and 70 on the competing records. | The imported 35698 reports 6,200 mAh. The generic record reports 5,110 mAh and contains variants labeled with a different region code. Confirm the actual seller units and regional hardware. |
| Redmi Note 15 Pro 38581 and 5G 38558 | 319 and 237. | The bare offer lacks a verified radio generation. |
| Regional Redmi Note 14 4G/5G imports | No additional listing moves proposed. | NFC, regional model numbers, and variant evidence need review. |
| AirPods listings described only as Gen 4 | No such separate listing found in the snapshot. | Obtain an earbud model number or explicit ANC evidence before reusing either product. |

AirPods 4 (device 38519, listing 178, shop 6, MWK 1,150,000, stock 1, image 36) and AirPods 4 ANC (device 38520, listing 179, shop 6, MWK 1,250,000, stock 1, image 37) are distinct products. Apple identifies standard earbuds as A3053/A3050/A3054 and ANC earbuds as A3056/A3055/A3057. [Apple model identification](https://support.apple.com/en-us/109525).

## Rollout

1. Apply the additive schema migration `202611110001-catalog-identity.js` using the repository migration runner, then deploy the backend and storefront. This enables marketplace Saved Items and alias support. Configure the storefront's `VITE_TECHAVEN_X_URL`, `VITE_TECHAVEN_FACEBOOK_URL`, and `VITE_TECHAVEN_INSTAGRAM_URL` with official HTTPS profiles at build time. The storefront Dockerfile accepts these as build arguments.
2. Run `node scripts/merge-catalog-devices.js` with read access to the intended catalog. Save its JSON as UTF-8 and review every proposal and ambiguity. The automated scan is limited to reviewed aliases and the initial Redmi and AirPods families.
3. Back up the current catalog and verify restore access. Run `node scripts/merge-catalog-devices.js --apply reviewed-report.json` with write access during the cleanup window. The script rechecks the report checksum and compares affected listing and image rows within the transaction.
4. Run the dry run again and check for zero repeat proposals. Compare listing counts and stock with the backup. Open both old and canonical Redmi URLs, compare the listing IDs and offer selector, verify saved references, and check that both AirPods products still resolve independently.

The additive migration, five proposals, apply, and zero-proposal rerun were rehearsed against an isolated MySQL 8.4 restore of the snapshot. The controller returned listings 67 and 231 from two shops for both the old and canonical Redmi Note 14 5G URLs. The rehearsal preserved 423 listings and 423 units, consolidated duplicate saved references, and kept the Redmi 4G and both AirPods hardware models distinct. Production remains untouched.

The storefront was checked with a local API fixture at 390 px and 1440 px. Checks included keyboard cart activation, multi-offer navigation and preselection, single-offer basket insertion, comparison, the selected-offer share URL, recent-product ordering and clearing, footer links, and Saved Items add/remove.
