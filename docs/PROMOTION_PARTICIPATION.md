# Promotion participation

CMS editors can enable `useParticipatingOffers` on a banner rail, side rail, or square tiles promotion and publish it. A published campaign then appears under Promotions in the staff and seller portals.

Staff can select and approve a specific shop's available offer directly. Sellers can request participation using their own available offers; staff approve or reject those requests. Rejection requires a note. Sellers can withdraw their offers. Existing catalogue-based promotions continue to work without opting in.

Only approved offers appear publicly, with their actual shop and listing identity. Offers must remain active, in stock, and attached to an approved active shop and active catalogue records. Changing an approved offer's price, currency, condition, variant, colour, or shop hides it until reviewed again. Each campaign supports at most 12 approved offers. No general catalogue fallback is used for participating campaigns.

## Deployment

Back up the production database, pull this change, then run:

```bash
NODE_ENV=production node scripts/run-migrations.js up --only=202611250001-promotion-participation.js
pm2 restart techaven-api --update-env
```

Deploy and rebuild the CMS and storefront changes as well. `CMS_PROMOTIONS_API_URL` defaults to `https://cms.techavenmw.com`; configure it only if the CMS origin differs. Existing staff/seller authentication is reused. The migration adds a participation table; it does not import stock or orders.

## API

Routes are under `/api/promotion-participation`:

- Public: `GET /campaigns`, `GET /offers/:slug`.
- Staff and approved sellers: `GET /candidates?search=`, `GET /requests?campaign=`, `POST /requests` with `campaign_slug` and `listing_id`, `DELETE /requests/:id` to withdraw.
- Staff only: `PATCH /requests/:id` with `status` (`approved` or `rejected`) and optional `note` (required for rejection).

Sellers are restricted to their own shop. A seller cannot approve a request by submitting a status field. Public responses contain only currently eligible approved offers.
