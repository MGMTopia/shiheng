/**
 * Build the precomputed SQLite catalog used by native FoodRepository.
 * Run after catalog imports: pnpm catalog:build
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const mobileRoot = join(root, '..');
const sourceRoot = pathToFileURL(`${mobileRoot}/src/`).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      return { shortCircuit: true, url: `${sourceRoot}${specifier.slice(2)}.ts` };
    }
    return nextResolve(specifier, context);
  },
});

const { foods, featuredFoods } = await import('../src/data/foods.ts');
const { catalogMeta } = await import('../src/data/catalog-meta.ts');
const { buildClusterIndex } = await import('../src/domain/catalog-groups.ts');

function rootId(parent, id) {
  const seen = new Set();
  let current = id;
  while (parent.get(current) && parent.get(current) !== current && !seen.has(current)) {
    seen.add(current);
    current = parent.get(current);
  }
  return current;
}

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

const parent = buildClusterIndex(foods);
const featuredIds = new Set(featuredFoods.map((food) => food.id));
const outDir = join(mobileRoot, 'assets', 'catalog');
mkdirSync(outDir, { recursive: true });
const dbPath = join(outDir, 'foods.db');
if (existsSync(dbPath)) unlinkSync(dbPath);

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = DELETE');
db.exec('DROP TABLE IF EXISTS foods_fts');
db.exec('DROP TABLE IF EXISTS foods');
db.exec(`
  CREATE TABLE foods (
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
  );
`);
db.exec(`
  CREATE VIRTUAL TABLE foods_fts USING fts5(
    id UNINDEXED,
    search,
    tokenize = 'unicode61 remove_diacritics 2'
  );
`);

const insertFood = db.prepare(`
  INSERT INTO foods (
    id, cluster_id, category, is_featured, is_supermarket, is_fsanz, is_overseas,
    has_composition, name_zh, name_en, search_extra, json
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertFts = db.prepare('INSERT INTO foods_fts (id, search) VALUES (?, ?)');

db.exec('BEGIN');
for (const food of foods) {
  insertFood.run(
    food.id,
    rootId(parent, food.id),
    food.category,
    featuredIds.has(food.id) ? 1 : 0,
    food.tags.includes('supermarket') ? 1 : 0,
    food.tags.includes('fsanz') ? 1 : 0,
    food.tags.includes('overseas') ? 1 : 0,
    food.composition ? 1 : 0,
    food.nameZh,
    food.nameEn,
    searchExtra(food),
    JSON.stringify(food),
  );
  insertFts.run(food.id, searchText(food));
}
db.exec('COMMIT');
db.exec('CREATE INDEX IF NOT EXISTS foods_cluster_id ON foods(cluster_id)');
db.exec('CREATE INDEX IF NOT EXISTS foods_featured ON foods(is_featured)');
db.exec('CREATE INDEX IF NOT EXISTS foods_category ON foods(category)');

const sourceHash = createHash('sha256')
  .update(foods.map((food) => `${food.id}|${food.source.dataset}|${food.nutrientsPer100g.energyKcal}|${food.nameZh}`).join('\n'))
  .digest('hex');
const counts = {
  total: foods.length,
  featured: featuredIds.size,
  supermarket: foods.filter((food) => food.tags.includes('supermarket')).length,
  fsanz: foods.filter((food) => food.tags.includes('fsanz')).length,
  overseas: foods.filter((food) => food.tags.includes('overseas')).length,
  recipe: foods.filter((food) => food.source.dataset === 'recipe-estimate').length,
  openFoodFacts: foods.filter((food) => food.source.dataset === 'open-food-facts').length,
};
db.exec(`
  CREATE TABLE catalog_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);
const insertMeta = db.prepare('INSERT INTO catalog_meta (key, value) VALUES (?, ?)');
for (const [key, value] of Object.entries({
  version: catalogMeta.version,
  builtAt: new Date().toISOString(),
  sourceHash,
  ...Object.fromEntries(Object.entries(counts).map(([key, value]) => [key, String(value)])),
})) {
  insertMeta.run(key, value);
}

db.close();

writeFileSync(join(outDir, 'README.md'), [
  'Precomputed food catalog for native FoodRepository. Regenerated by `pnpm catalog:build`.',
  '',
  `- version: ${catalogMeta.version}`,
  `- foods: ${counts.total}`,
  `- supermarket: ${counts.supermarket}`,
  `- fsanz: ${counts.fsanz}`,
  `- overseas: ${counts.overseas}`,
  `- recipe estimates: ${counts.recipe}`,
  `- open food facts: ${counts.openFoodFacts}`,
  `- sourceHash: ${sourceHash}`,
  '',
  'Commit this database with source changes. CI runs `pnpm catalog:check` to verify freshness.',
  '',
].join('\n'));
console.log(`Wrote ${dbPath} (${foods.length} foods, ${catalogMeta.version}, ${sourceHash.slice(0, 12)}…)`);
