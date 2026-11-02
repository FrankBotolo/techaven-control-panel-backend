# Dokploy images and seeded-data migration

Prepared 31 October 2026. This release packages application code only; the seeded MySQL/PostgreSQL contents and uploaded logos/artwork must be restored separately. No remote database has been created or changed by this work.

## Implementation checkpoint before validation

- Frontend: production Node/Nitro Dockerfile, non-root runtime, port 3001, `/healthz`. Commerce SSR and `/api/*` forwarding read `TECHAVEN_API_URL` at runtime. CMS SSR and same-origin `/cms/*` forwarding read `PROMOTIONS_API_URL` at runtime. Browser requests stay on the storefront origin; service hostnames are not compiled into client assets. `/uploads/*` forwards to commerce. Existing Cloudflare builds keep their original default unless `NITRO_PRESET` is specified.
- Backend: existing production Dockerfile, non-root runtime, port 8000 and `/health`. No database or uploaded files are baked into the image. The Dokploy template sets `DB_BOOTSTRAP=false`; restore the existing schema/data rather than running fresh migrations or automatic seeders.
- CMS: reproducible multi-stage source build, non-root runtime, port 1337 and `/api/health`. PostgreSQL credentials and Strapi keys are runtime environment variables. Uploaded artwork stays on its persistent volume.
- Registry targets: `gshaibu/techaven-frontend`, `gshaibu/techaven-backend`, `gshaibu/techaven-cms`, tags `20261031` and `latest`. These are Linux amd64 images; the target server must support that architecture.
- Deployment files: `deploy/dokploy.compose.yml`, `deploy/dokploy.env.example`. Uses existing Dokploy-managed MySQL 8.4 and PostgreSQL 17 services through their internal hostnames on `dokploy-network`. Apps share an additional private Compose network.
- Migration tools: `scripts/export-local-data.mjs` exports both databases and both upload trees to a new private folder outside Git, with SHA-256 checksums. `scripts/rewrite-media-origins.js` defaults to a dry run and updates only public commerce media fields when `--apply` is explicit; manufacturer URLs and private provenance stay unchanged.
- At this checkpoint implementation/documentation is prepared. Image validation, smoke tests and registry publication follow this checkpoint; do not interpret this section as a passing test receipt.

## Dokploy setup

1. Create a MySQL **8.4** database and PostgreSQL **17** database in Dokploy. Record their internal hosts, database names, users and passwords. Avoid exposing their ports publicly. Connect the app services to the same `dokploy-network`; adjust the template if your instance uses another network name.
2. Create a Compose service using `deploy/dokploy.compose.yml`. It pulls the three prebuilt images, without installing Node packages or compiling on the server. Fill the environment values from `deploy/dokploy.env.example` in Dokploy's Environment panel. Do not commit the filled file.
3. Set real HTTPS origins for `FRONTEND_URL`, `BACKEND_PUBLIC_URL`, `CMS_PUBLIC_URL`. Add Dokploy domains for storefront port **3001**, API port **8000**, and CMS/admin port **1337**. Enable HTTPS. No host ports need to be published in Compose.
4. For a data migration, securely reuse the current Strapi `APP_KEYS`, token salts, `ADMIN_JWT_SECRET`, `JWT_SECRET` and `ENCRYPTION_KEY` from your local configuration. Encryption keys must match encrypted data. `CMS_APP_KEYS` accepts comma-separated keys. Copy secrets directly to Dokploy; do not put them in image build arguments. `COMMERCE_SYNC_TOKEN` must match the CMS commerce-feed token. Keep automatic reconciliation/reset/seeding disabled until the restored catalogue references are checked.
5. Configure SMTP and Google OAuth separately if those integrations are needed. Add the production storefront origin/client configuration to the identity provider. Payments/SMS remain configured through their existing backend environment variables; the minimal Compose template does not enable them.

## Export the current local data

From the backend repository, with the four local containers running:

```powershell
node scripts/export-local-data.mjs --output ../migration-backups/2026-10-31
```

The exporter uses the database container environment internally and never echoes credentials. It creates `commerce.sql`, `cms.dump`, `backend-uploads.tar.gz`, `cms-uploads.tar.gz`, `manifest.json`. These backups contain application data; transfer them privately to the target host. Do not upload them to GitHub or Docker Hub. Stop writes while taking the four-file cutover snapshot so databases and media stay in sync.

## Restore before accepting traffic

1. Keep the application containers stopped or unreachable during restoration. Restore **into new, empty target databases**. Do not run the backend fresh-migration/seed commands: the local schema's migration ledger is known to differ from the already-created schema, and the dump preserves that exact schema plus seeded records.
2. Restore commerce with a MySQL 8.4 client connected to the new database (set `MYSQL_PWD` privately first):

```sh
mysql --host="$DB_HOST" --port="${DB_PORT:-3306}" --user="$DB_USER" "$DB_NAME" < commerce.sql
```

3. Restore CMS with a PostgreSQL 17 client. Set `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` privately first:

```sh
pg_restore --no-owner --no-acl --dbname="$PGDATABASE" cms.dump
```

4. Restore `backend-uploads.tar.gz` into the volume mounted at `/app/uploads`, owned by the backend `node` user. Restore `cms-uploads.tar.gz` into `/opt/app/public/uploads`, owned by the image's `strapi` user. Use the actual Compose-prefixed volume names shown by Dokploy. Both volume trees are required: SQL alone does not contain logos or CMS artwork. Never replace whole database-engine data directories across hosts; use the logical dumps.
5. Start the three applications after both database restores. Run the following inside the **new backend container**, substituting the real public API origin. Review the dry-run counts, then apply:

```sh
node scripts/rewrite-media-origins.js --from http://localhost:8000 --to https://api.example.com
node scripts/rewrite-media-origins.js --from http://localhost:8000 --to https://api.example.com --apply
```

Repeat with a different `--from` only if that old API origin was actually stored. This changes shop logos/gallery, device/listing photos and legacy product image fields, not prices, stock or source metadata. CMS relative media URLs resolve using runtime `PUBLIC_URL`; inspect any manually authored absolute localhost links before publishing.
6. Check `/health`, `/api/health`, storefront `/healthz`, shop counts, exact offer prices, logos, CMS admin/media, `/api/*` basket/session forwarding, HTTPS cookies and CMS preview links. Restore should preserve **19 shops and 423 seller offers** from the last verified seed checkpoint; use the actual snapshot counts if additional edits were made afterward. Then enable traffic and, only after verifying references, catalogue reconciliation if needed.

## Image updates and rollback

The dated tag selects this prepared release; `latest` is a convenience alias. Record registry digests from the publication receipt and prefer digest pins for exact rollbacks. Update only the image reference in Dokploy for code updates. Keep the named upload volumes and database services intact; do not delete volumes when redeploying. Database backups and rollback compatibility must be considered separately from image rollback.

Official references: [Dokploy databases](https://docs.dokploy.com/docs/core/databases), [Nitro Node runtime](https://nitro.build/deploy/runtimes/node).

## Validation and publication checkpoint — 2 November 2026

Documentation/implementation were completed before running validation, as requested. All 55 frontend tests, 19 CMS tests and two media-origin rewrite tests passed. Production images start as non-root users; all three container health checks passed. HTTP 200 verified for commerce health, storefront health, commerce forwarding (19 shops), CMS forwarding, CMS health/admin, catalogue and a shop page. No image contains a root .env or Git directory. Compose interpolation passed using non-secret validation placeholders.

The private export at `../migration-backups/2026-10-31-release` contains both logical database backups and both upload archives; all four SHA-256 checksums were reverified. No remote database has been restored or changed. Frontend and backend tags are published; the CMS upload is retrying after a registry timeout. Exact publication status/digests are recorded in `deploy/release-20261031.json`.
