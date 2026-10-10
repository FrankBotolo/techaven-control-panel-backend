# Catalogue Marketplace API v2

## Purpose

API v2 separates Techaven-owned catalogue facts from seller-owned commercial offers:

```text
brand → device → variant → supported color → seller listing → listing images
```

The existing `products` API remains v1. Reviews, favorites, banners, and legacy promotional flags still refer to v1 products.

## Database Rollout

The ordered migrations live in `database/migrations-js/` and are recorded in `schema_migrations`.

1. Back up the target database using the deployment environment's approved MySQL backup process.
2. Run `npm run migrate:v2:status` and review pending migrations.
3. Run `npm run migrate:v2:dry-run` to list pending migration names.
4. Apply with `npm run migrate:v2` before starting code that queries v2 models.
5. Validate table counts, constraints, v1 reads, and v2 smoke tests before exposing v2 routes to clients.

`npm run migrate:v2:down` reverts only the latest migration. MySQL DDL may implicitly commit, so a failed multi-statement migration cannot be assumed to roll back atomically. Restore from the verified backup if a partial DDL failure cannot be repaired safely. Do not roll back the listing-commerce migration after v2 cart/order data exists without first planning data retention.

Development `sequelize.sync({ alter: false })` is not a substitute for applying these migrations to an existing database.

## Public Catalogue

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v2/catalog/brands` | Active canonical brands. |
| GET | `/api/v2/catalog/devices` | Active devices; filters include `brand`, `category_id`, `search`, `page`, and `limit`. |
| GET | `/api/v2/catalog/devices/:id` | Canonical device, specs, media, variants, and valid colors. |
| GET | `/api/v2/catalog/devices/:id/variants` | Dynamic `variant_axes` and valid variant combinations. |
| GET | `/api/v2/catalog/variants/:id` | One active variant and its device/colors. |
| GET | `/api/v2/catalog/variants/:id/colors` | Valid manufacturer colors for a variant. |

## Public Marketplace

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v2/marketplace/devices` | Devices with active, in-stock offers. Supports catalogue, price, condition, color, and variant filters. |
| GET | `/api/v2/marketplace/devices/:id` | Canonical device with seller offers ordered by price. |
| GET | `/api/v2/marketplace/listings/:id` | One active seller offer with canonical and seller media. |

Catalogue media is resolved from the most specific variant/color match toward generic device media. Seller listing images remain separate evidence of the offered item.

## Seller Listings

All endpoints require an authenticated, verified seller with an approved active shop. `:shopId` must equal the authenticated seller's assigned shop.

| Method | Endpoint |
|---|---|
| GET, POST | `/api/v2/sellers/:shopId/listings` |
| GET, PATCH, DELETE | `/api/v2/sellers/:shopId/listings/:id` |
| POST | `/api/v2/catalog/product-requests` |

Create body:

```json
{
  "device_variant_id": 1003,
  "device_variant_color_id": 7004,
  "merchant_sku": "A26-256-BLK",
  "condition": "new",
  "currency": "MWK",
  "price": 940000,
  "quantity": 3,
  "warranty_months": 12,
  "status": "active",
  "images": []
}
```

Conditions are `new`, `used`, `refurbished`, and `open_box`. Used, refurbished, and open-box listings require at least one image. Only one active listing may exist per shop, variant, color, and condition.

## V2 Cart and Checkout

| Method | Endpoint |
|---|---|
| GET, DELETE | `/api/v2/cart` |
| POST | `/api/v2/cart/items` |
| PUT, DELETE | `/api/v2/cart/items/:item_id` |
| POST | `/api/v2/orders` |

Cart items use `seller_listing_id`. Checkout accepts `shipping_address_id` plus optional `items`; when items are omitted, it checks out the v2 cart. Checkout locks listings, revalidates active status and quantity, groups items into one order per shop, decrements stock transactionally, and stores canonical/listing snapshots on order items.

## Admin Catalogue

Authenticated administrators manage brands, devices, variants, normalized colors, variant-color assignments, and media beneath `/api/v2/admin/catalog`. `DELETE` for brands, devices, and variants deactivates them; historical references are retained. The same prefix exposes product-request review and legacy-mapping review.

## Stable Error Codes

V2 errors use the existing JSON envelope with a stable `code`, including `DEVICE_NOT_FOUND`, `VARIANT_NOT_FOUND`, `VARIANT_INACTIVE`, `COLOR_NOT_AVAILABLE_FOR_VARIANT`, `DUPLICATE_LISTING`, `INVALID_PRICE`, `INVALID_QUANTITY`, `LISTING_IMAGE_REQUIRED`, `INSUFFICIENT_STOCK`, and `CATALOGUE_PRODUCT_REQUIRED` where applicable.

## TechAPI Import

TechAPI data is an import source, not the production schema. Data is licensed CC-BY-SA 4.0; retain attribution to “Data from TechAPI” and comply with share-alike obligations for redistributed adapted datasets.

```bash
npm run catalog:import:techapi -- \
  --data-dir /path/to/TechAPI/data/smartphone \
  --category-id 1 \
  --brand samsung \
  --year 2025 \
  --dry-run \
  --report /tmp/techapi-report.json
```

Remove `--dry-run` only after reviewing the report and applying v2 migrations. The importer records source paths, URLs, verification state, and Git revision when available. Malformed records are reported and skipped. Existing verified values are preserved over lower-confidence imports.

## Promotions Catalogue Synchronization

The promotions CMS consumes durable canonical-device and shop events rather than polling v1 products. Configure the same long random `COMMERCE_SYNC_TOKEN` in the backend and `TECHAVEN_COMMERCE_API_TOKEN` in the CMS, then call:

```text
GET /api/v2/integrations/promotions/devices?after=0&limit=250
GET /api/v2/integrations/promotions/shops?after=0&limit=250
Authorization: Bearer <shared token>
```

Each standard response envelope contains `items`, `next_cursor`, and `has_more`. Device identities use `device:<id>` and tombstones set `active` to `false`. Apply migrations and run `npm run catalog:backfill-promotions` once before enabling CMS reconciliation.

## Legacy Migration

```bash
npm run catalog:migrate-legacy -- --dry-run --batch-size 100 --report /tmp/legacy-report.json
```

Unique matches scoring at least `0.85` are converted idempotently; uncertain matches remain `candidate` or `unmatched`. Administrators can confirm or reject mappings through `/api/v2/admin/catalog/legacy-mappings`. Original `products` rows and all v1 endpoints remain unchanged.
