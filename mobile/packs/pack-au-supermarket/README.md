# pack-au-supermarket

Offline packaged-food resource pack for 食衡. **Not** bundled into the APK.

## Contents

- `manifest.json` — pack metadata, ODbL attribution, SHA-256 hashes
- `foods.db` — SQLite catalog (same `foods` / `foods_fts` schema as the main catalog)
- `pack-au-supermarket-v1.0.0.foods.db.gz` — gzip of `foods.db` for smaller GitHub Release uploads

## Regenerate

```bash
cd mobile
pnpm fetch:off          # computer-side only; writes data-raw/openfoodfacts-au.jsonl
pnpm pack:build         # writes packs/pack-au-supermarket/
```

Optional: `FOOD_PACK_VERSION=1.0.1 pnpm pack:build`

Quality filters match `import:off` (AU/GTIN 93, name, barcode ≥8, energy, some macros; Woolworths/Coles preferred). IDs are `au:gtin:<barcode>` (never `off-gen-…`).

## Publish to GitHub Release

Create a release tagged `pack-au-supermarket-v1.0.0` and attach:

| Asset | Expected SHA-256 |
| --- | --- |
| `foods.db` | `4c213ad2aebf3f9d894c769a035731dc0b6913b8aee4780298fdfd61ad845bc5` |
| `manifest.json` | (commit this file; app also fetches it) |
| `pack-au-supermarket-v1.0.0.foods.db.gz` | `c53cb142bf5129df5843980555b42e4b5576edadfbdb805c8047d5d3d6eca684` |

Download URL pattern used by the app:

`https://github.com/MGMTopia/shiheng/releases/download/pack-au-supermarket-v{version}/{asset}`

Example foods.db URL:

`https://github.com/MGMTopia/shiheng/releases/download/pack-au-supermarket-v1.0.0/foods.db`

## Licence

Open Food Facts Australia packaged foods (ODbL 1.0)

Contains information from Open Food Facts (https://openfoodfacts.org/), which is made available under the Open Database License (ODbL 1.0). Product data is community-contributed; always prefer the package label.

Current build: **612** foods (from 612 quality matches), version **1.0.0**, created **2026-09-09T05:15:43.747Z**.
