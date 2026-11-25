# Device catalogue seed

| Step | Command | Writes to |
| --- | --- | --- |
| 1. Build (optional, output is committed) | `npm run catalog:build -- --data-dir <TechAPI>/data --revision <sha>` | `scripts/data/device-catalogue.json.gz` |
| 2. Find photos (optional, output is committed) | `npm run catalog:images:resolve` | `scripts/data/device-images.json` |
| 3. Download photos | `npm run catalog:images:download` | `uploads/devices/` (git-ignored, run on each server) |
| 4. Preview | `npm run seed:catalogue` | nothing |
| 5. Seed | `npm run seed:catalogue:apply` | database |

Options for steps 4 and 5: `--since 2018`, `--brands samsung,tecno`, `--categories Smartphones,Tablets`, `--with-images-only`, `--database <expected name>`.

The seed only adds rows. Existing devices (matched by slug, or brand + category + model), variants and photos are left as they are.
After step 5 run `npm run catalog:backfill-promotions` if the promotions CMS should see the new devices.

## Sources and licences

- Specifications and variants: Data from [TechAPI](https://github.com/GetTechAPI/TechAPI), CC BY-SA 4.0. Show the credit and share adapted datasets under the same licence.
- Photos with source `wikimedia-commons:*`: free licences that require credit. Author, licence and file page are stored in `devices.source_metadata.image`; show them wherever the photo is displayed.
- Photos with source `manufacturer`: taken from the repository's reviewed manifests. They remain the manufacturer's copyright.
- MobileAPI.dev is not used. Its terms (section 4) bar bulk storage and publishing its content or images on marketplaces without written permission.
