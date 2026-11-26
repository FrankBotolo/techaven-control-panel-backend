# Commerce seed

Catalogue and storefront data extracted from the 24 November 2026 commerce database dump.

| Step | Command | Writes to |
| --- | --- | --- |
| 1. Extract (optional, output is committed) | `npm run commerce:extract -- <commerce.sql>` | `scripts/data/commerce/` |
| 2. Migrate, if needed | `npm run migrate:v2` | database schema |
| 3. Preview | `npm run seed:commerce` | nothing |
| 4. Seed | `npm run seed:commerce:apply` | database |

Pass `-- --database <name>` to steps 3 and 4 to abort unless connected to that database.

Included: platform settings, categories, brands, devices, variants, device media, shops, listings, listing categories and listing images.

Shop owners: the dump has none, so each shop without a seller gets a placeholder account such as `tech-central@shops.techaven.test`, with the password in `SEED_SELLER_PASSWORD` (required for step 4). Replace the email and password when handing a shop to its owner.

Subscriptions: every seeded shop without a current subscription gets an active, paid one (`shop_subscriptions`), and each of its sellers a matching `user_subscriptions` row. The package is `SEED_SUBSCRIPTION_PACKAGE` (default `growth`, from `npm run seed:packages:apply`) and the period `SEED_SUBSCRIPTION_DAYS` (default 365). Auto-renew is off and the payment reference is `seed:commerce`.

Left out: the dump's customer account, orders, addresses, payment methods, sessions, tokens, OTPs, notifications, audit logs and migration history (private or runtime data). Promotion events are rebuilt with `npm run catalog:backfill-promotions`.

- Rows that already exist are never changed. Matching is by slug (brands, devices), `canonical_key` (variants), name (categories, shops) and shop + SKU or active identity (listings). Photos are added only where a device or listing has none.
- `http://localhost:8000` media URLs become `PUBLIC_API_BASE_URL`. The files themselves are not in git: extract `backend-uploads.tar.gz` from the handoff into `uploads/`.
- On an empty database run this before `seed:catalogue`, which recognises devices by model. The other order can leave two entries for the same phone.

Device data: [TechAPI](https://github.com/GetTechAPI/TechAPI), CC BY-SA 4.0. Show the credit and share adapted datasets under the same licence.
