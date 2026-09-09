/**
 * Filter a local Open Food Facts extract into generated packaged foods.
 *
 * Use a computer-side dump or `pnpm fetch:off` (writes data-raw/openfoodfacts-au.jsonl).
 * Do not call the live search API from the phone.
 *
 * Output: src/data/generated/off-packaged-foods.ts
 *
 * Note: optional downloadable packs use `pnpm pack:build` with au:gtin: IDs instead.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PACK_MAX, PACK_MIN, selectQualityRows } from './off-quality.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const mobileRoot = join(root, '..');
const sourcePath = join(mobileRoot, 'data-raw', 'openfoodfacts-au.jsonl');
const outPath = join(mobileRoot, 'src', 'data', 'generated', 'off-packaged-foods.ts');

if (!existsSync(sourcePath)) {
  console.error(`Missing ${sourcePath}`);
  console.error('Run pnpm fetch:off, or save an Open Food Facts JSONL extract there. See https://world.openfoodfacts.org/data');
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

mkdirSync(dirname(outPath), { recursive: true });
const body = chosen.map((row) => {
  const stores = [
    row.stores.includes('woolworth') ? "'woolworths'" : null,
    row.stores.includes('coles') ? "'coles'" : null,
  ].filter(Boolean);
  const storeLit = stores.length ? `[${stores.join(', ')}]` : '[]';
  const n = (value) => (value == null ? 'null' : String(value));
  return `  off(${JSON.stringify(`off-gen-${row.barcode}`)}, ${JSON.stringify(row.nameEn)}, ${JSON.stringify(row.brand || 'Unknown')}, ${JSON.stringify(row.barcode)}, ${JSON.stringify(row.category)}, ${row.servingGrams}, ${row.energyKcal}, ${n(row.proteinG)}, ${n(row.carbsG)}, ${n(row.fatG)}, ${n(row.fibreG)}, ${n(row.sodiumMg)}, ${n(row.saturatedFatG)}, ${n(row.sugarG)}, ${storeLit})`;
}).join(',\n');

writeFileSync(outPath, `import type { Food, FoodCategory, Supermarket } from '@/types/nutrition';

const UPDATED = new Date().toISOString().slice(0, 10);
const LABEL = 'Open Food Facts 社区标签摘录；包装标签优先。缺失营养素不是 0。';

function off(
  id: string, nameEn: string, brand: string, barcode: string, category: FoodCategory, servingGrams: number,
  energyKcal: number, proteinG: number | null, carbsG: number | null, fatG: number | null, fibreG: number | null,
  sodiumMg: number | null, saturatedFatG: number | null, sugarG: number | null, stores: Supermarket[],
): Food {
  return {
    id, nameZh: nameEn, nameEn, aliases: [barcode, brand].filter(Boolean), category,
    servingLabel: servingGrams === 100 ? '100g' : \`\${servingGrams}g\`, servingGrams,
    nutrientsPer100g: { energyKcal, proteinG, carbsG, fatG, fibreG, sodiumMg, saturatedFatG, sugarG },
    source: { type: 'label', label: LABEL, region: 'AU', confidence: 'estimate', updatedAt: UPDATED, dataset: 'open-food-facts', externalId: barcode },
    tags: ['supermarket', 'packaged', 'off-bulk', ...stores], barcode, brand, stores,
  };
}

export const generatedOffFoods: Food[] = [
${body}
];
`);
console.log(`Wrote ${outPath} (${chosen.length} products from ${accepted.length} quality matches). Then run pnpm catalog:build.`);
console.log('For the optional downloadable pack (au:gtin: IDs), run pnpm pack:build instead.');
