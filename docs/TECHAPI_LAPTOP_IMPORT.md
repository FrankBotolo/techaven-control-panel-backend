# TechAPI laptop catalogue import

The existing importer supports `--category-type laptop` alongside the default smartphone mode. No schema changes are required. Laptops use the existing Device/DeviceVariant models; shop listings and prices remain separate.

```sh
node scripts/import-techapi.js --data-dir <laptop-folder> --category-id <existing-laptop-category-id> --category-type laptop --source-revision <git-revision> --report <report-file>
```

Run a `--dry-run` first. Verify the target category ID before importing. Dry-run counts represent accepted source rows, not unique entities. Actual imports count newly created brands, devices and variants.

## Mapping and safety

- Laptop devices use `laptop-<base_model_slug>` to avoid collisions with smartphone names. An existing device in another category causes an import error instead of reassignment.
- RAM and storage map to existing variant fields. A stable configuration fingerprint also distinguishes CPU, GPU, display, OS, weight and laptop type. Equivalent configuration records reuse one variant.
- Complete configuration facts are stored in `DeviceVariant.attributes.configuration`; only common facts appear in model-level specs. CPU/OS/release date differences within a model family are omitted from shared fields rather than choosing an arbitrary configuration.
- Source revision, path, URLs, verification flags and image licence/attribution are retained. Source photo URLs are stored without claiming independent image verification.
- Source MSRP is retained as `reference_msrp_usd`, never as a seller price. No listing, stock, order, customer or session records are created or changed.
- Existing verified records cannot be overwritten by unverified records. Repeated imports reuse device slugs and configuration keys.

## Verified local seed: 2026-10-13

Source: [TechAPI laptop data](https://github.com/GetTechAPI/TechAPI/tree/develop/data/laptop), revision `db1dea0c38ff07fcf400aa05d8c8e4393348eb25`.

Category Laptops (ID 2): 1,966 records produced 1,230 model families and 1,909 configurations across 23 brands, creating five new brands. Fifty-seven matching configurations were consolidated. One unverified duplicate preserved an existing verified configuration. Twelve families include source photo URLs.

Checks: 27 backend unit tests passed; every stored laptop configuration and common device-spec object matched normalized source data. Catalogue list/detail requests returned HTTP 200. A complete rerun created zero brands/devices/variants with zero errors. A protected-record hash confirmed all 36,999 smartphone device records, three shops and 152 seller offers were unchanged before/after both imports.

Local source checkout and receipts are in sibling `../techapi-laptop-data/`, documented by `SEED.local.md`. Purchasable storefront results still require sellers to create active laptop listings with prices and stock. The existing migration-ledger reconciliation remains a separate operation; this import does not run pending migrations.
