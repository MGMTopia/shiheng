/**
 * Build an optional offline food pack (manifest.json + foods.db).
 *
 * Source: data-raw/openfoodfacts-au.jsonl (from `pnpm fetch:off`)
 * Output: packs/pack-au-supermarket/
 *
 * Pack IDs use au:gtin:<barcode>. Do not bake this pack into the APK.
 * Publish Release assets from the output directory (see packs/.../README.md).
 */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  createWriteStream, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { finished } from 'node:stream/promises';
import { createGzip } from 'node:zlib';
import { PACK_MAX, PACK_MIN, rowToFood, selectQualityRows } from './off-quality.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const mobileRoot = join(root, '..');
const sourcePath = join(mobileRoot, 'data-raw', 'openfoodfacts-au.jsonl');
const packId = 'pack-au-supermarket';
const packVersion = process.env.FOOD_PACK_VERSION || '1.0.0';
const outDir = join(mobileRoot, 'packs', packId);
const repoSlug = process.env.FOOD_PACK_REPO || 'MGMTopia/shiheng';

const LABEL = 'Open Food Facts Australia packaged foods (ODbL 1.0)';
const ATTRIBUTION = [
  'Contains information from Open Food Facts (https://openfoodfacts.org/),',
  'which is made available under the Open Database License (ODbL 1.0).',
  'Product data is community-contributed; always prefer the package label.',
].join(' ');

function searchText(food) {
  const names = [food.nameZh, food.nameEn, ...(food.aliases ?? []), food.brand, food.barcode, ...(food.tags ?? [])]
    .filter(Boolean)
    .join(' ');
  const zh = `${food.nameZh}${(food.aliases ?? []).join('')}`.replace(/[^\u4e00-\u9fff]/g, '');
  return `${names} ${[...zh].join(' ')}`.trim();
}

function searchExtra(food) {
  return [food.brand, food.barcode, ...(food.aliases ?? []), ...(food.stores ?? []), ...(food.tags ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

async function writeGzipCopy(src, dest) {
  if (existsSync(dest)) unlinkSync(dest);
  const gzip = createGzip();
  const input = readFileSync(src);
  const out = createWriteStream(dest);
  gzip.end(input);
  gzip.pipe(out);
  await finished(out);
}

if (!existsSync(sourcePath)) {
  console.error(`Missing ${sourcePath}`);
  console.error('Run `pnpm fetch:off` on a computer first. Do not call OFF from the phone.');
  process.exit(1);
}

const products = [];
for (const line of readFileSync(sourcePath, 'utf8').split(/\n/)) {
  if (!line.trim()) continue;
  try { products.push(JSON.parse(line)); } catch { /* skip */ }
}

const { accepted, chosen, belowMin } = selectQualityRows(products, { min: PACK_MIN, max: PACK_MAX });
if (belowMin) {
  console.error(`Only ${chosen.length} quality AU products; need at least ${PACK_MIN}.`);
  process.exit(1);
}

const updatedAt = new Date().toISOString().slice(0, 10);
const foods = chosen.map((row) => rowToFood(row, { updatedAt }));

mkdirSync(outDir, { recursive: true });
const dbPath = join(outDir, 'foods.db');
if (existsSync(dbPath)) unlinkSync(dbPath);

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

const builtAt = new Date().toISOString();
const sqlParts = [
  'PRAGMA journal_mode = DELETE;',
  `CREATE TABLE foods (
    id TEXT PRIMARY KEY,
    cluster_id TEXT NOT NULL,
    category TEXT NOT NULL,
    is_featured INTEGER NOT NULL,
    is_supermarket INTEGER NOT NULL,
    is_fsanz INTEGER NOT NULL,
    is_overseas INTEGER NOT NULL,
    has_composition INTEGER NOT NULL,
    name_zh TEXT NOT NULL,
    name_en TEXT NOT NULL,
    search_extra TEXT NOT NULL,
    json TEXT NOT NULL
  );`,
  `CREATE VIRTUAL TABLE foods_fts USING fts5(
    id UNINDEXED,
    search,
    tokenize = 'unicode61 remove_diacritics 2'
  );`,
  'BEGIN;',
];

for (const food of foods) {
  sqlParts.push(`INSERT INTO foods (
    id, cluster_id, category, is_featured, is_supermarket, is_fsanz, is_overseas,
    has_composition, name_zh, name_en, search_extra, json
  ) VALUES (
    ${sqlLiteral(food.id)},
    ${sqlLiteral(food.id)},
    ${sqlLiteral(food.category)},
    0,
    ${food.tags.includes('supermarket') ? 1 : 0},
    0, 0, 0,
    ${sqlLiteral(food.nameZh)},
    ${sqlLiteral(food.nameEn)},
    ${sqlLiteral(searchExtra(food))},
    ${sqlLiteral(JSON.stringify(food))}
  );`);
  sqlParts.push(`INSERT INTO foods_fts (id, search) VALUES (${sqlLiteral(food.id)}, ${sqlLiteral(searchText(food))});`);
}

sqlParts.push(
  'COMMIT;',
  'CREATE INDEX IF NOT EXISTS foods_cluster_id ON foods(cluster_id);',
  'CREATE INDEX IF NOT EXISTS foods_category ON foods(category);',
  `CREATE TABLE catalog_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );`,
  `INSERT INTO catalog_meta (key, value) VALUES ('packId', ${sqlLiteral(packId)});`,
  `INSERT INTO catalog_meta (key, value) VALUES ('version', ${sqlLiteral(packVersion)});`,
  `INSERT INTO catalog_meta (key, value) VALUES ('builtAt', ${sqlLiteral(builtAt)});`,
  `INSERT INTO catalog_meta (key, value) VALUES ('foodCount', ${sqlLiteral(String(foods.length))});`,
  `INSERT INTO catalog_meta (key, value) VALUES ('source', 'open-food-facts');`,
  `INSERT INTO catalog_meta (key, value) VALUES ('licence', 'ODbL-1.0');`,
);

const sqlPath = join(outDir, '.build.sql');
writeFileSync(sqlPath, sqlParts.join('\n'));
const sqlite = spawnSync('sqlite3', [dbPath], {
  input: readFileSync(sqlPath),
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});
unlinkSync(sqlPath);
if (sqlite.status !== 0) {
  console.error(sqlite.stderr || sqlite.stdout || 'sqlite3 failed');
  process.exit(1);
}

const dbSha = sha256File(dbPath);
const archiveName = `${packId}-v${packVersion}.foods.db.gz`;
const archivePath = join(outDir, archiveName);
await writeGzipCopy(dbPath, archivePath);
const archiveSha = sha256File(archivePath);

const downloadUrlPattern = `https://github.com/${repoSlug}/releases/download/${packId}-v{version}/{asset}`;
const createdAt = new Date().toISOString();
const manifest = {
  id: packId,
  version: packVersion,
  title: '澳洲超市包装食品包',
  titleEn: 'AU supermarket packaged foods',
  description: 'Open Food Facts Australia 高质量包装食品离线包（约 500–2000 条）。Wi‑Fi 下手动下载，校验后启用。',
  descriptionEn: 'Higher-quality Open Food Facts Australia packaged products for offline barcode/search. Manual Wi‑Fi download only.',
  foodCount: foods.length,
  sha256: {
    'foods.db': dbSha,
    [archiveName]: archiveSha,
  },
  licence: 'ODbL-1.0',
  attribution: ATTRIBUTION,
  source: {
    name: 'Open Food Facts',
    url: 'https://world.openfoodfacts.org/',
    region: 'AU',
  },
  downloadUrlPattern,
  assets: {
    foodsDb: 'foods.db',
    manifest: 'manifest.json',
    archive: archiveName,
  },
  createdAt,
  schema: 'foods+foods_fts',
  notes: [
    'Food IDs are au:gtin:<barcode>.',
    'Main catalog version is independent of this pack version.',
    'Prefer Woolworths/Coles when store tags are present.',
  ],
};

writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(join(outDir, 'README.md'), `# ${packId}

Offline packaged-food resource pack for 食衡. **Not** bundled into the APK.

## Contents

- \`manifest.json\` — pack metadata, ODbL attribution, SHA-256 hashes
- \`foods.db\` — SQLite catalog (same \`foods\` / \`foods_fts\` schema as the main catalog)
- \`${archiveName}\` — gzip of \`foods.db\` for smaller GitHub Release uploads

## Regenerate

\`\`\`bash
cd mobile
pnpm fetch:off          # computer-side only; writes data-raw/openfoodfacts-au.jsonl
pnpm pack:build         # writes packs/${packId}/
\`\`\`

Optional: \`FOOD_PACK_VERSION=1.0.1 pnpm pack:build\`

Quality filters match \`import:off\` (AU/GTIN 93, name, barcode ≥8, energy, some macros; Woolworths/Coles preferred). IDs are \`au:gtin:<barcode>\` (never \`off-gen-…\`).

## Publish to GitHub Release

Create a release tagged \`${packId}-v${packVersion}\` and attach:

| Asset | Expected SHA-256 |
| --- | --- |
| \`foods.db\` | \`${dbSha}\` |
| \`manifest.json\` | (commit this file; app also fetches it) |
| \`${archiveName}\` | \`${archiveSha}\` |

Download URL pattern used by the app:

\`${downloadUrlPattern}\`

Example foods.db URL:

\`https://github.com/${repoSlug}/releases/download/${packId}-v${packVersion}/foods.db\`

## Licence

${LABEL}

${ATTRIBUTION}

Current build: **${foods.length}** foods (from ${accepted.length} quality matches), version **${packVersion}**, created **${createdAt}**.
`);

console.log(`Wrote ${outDir} (${foods.length} foods, v${packVersion})`);
console.log(`foods.db sha256: ${dbSha}`);
console.log(`${archiveName} sha256: ${archiveSha}`);
