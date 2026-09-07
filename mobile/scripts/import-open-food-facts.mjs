/**
 * Filter a local Open Food Facts extract into generated packaged foods.
 *
 * Use a computer-side dump or `pnpm fetch:off` (writes data-raw/openfoodfacts-au.jsonl).
 * Do not call the live search API from the phone.
 *
 * Output: src/data/generated/off-packaged-foods.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const mobileRoot = join(root, '..');
const sourcePath = join(mobileRoot, 'data-raw', 'openfoodfacts-au.jsonl');
const outPath = join(mobileRoot, 'src', 'data', 'generated', 'off-packaged-foods.ts');

const MIN = 500;
const MAX = 2000;

function number(value) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function kcalFrom(product) {
  const nutriments = product.nutriments ?? {};
  return number(nutriments['energy-kcal_100g'])
    ?? (number(nutriments.energy_100g) != null ? number(nutriments.energy_100g) / 4.184 : null);
}

function isAustralia(product) {
  const tags = [...(product.countries_tags ?? []), ...(product.countries_hierarchy ?? [])].map((tag) => String(tag).toLowerCase());
  const text = `${product.countries ?? ''} ${product.purchase_places ?? ''}`.toLowerCase();
  const code = String(product.code ?? product._id ?? '').replace(/\D/g, '');
  return tags.some((tag) => tag.includes('australia')) || text.includes('australia') || code.startsWith('93');
}

function guessCategory(product, name) {
  const hay = `${(product.categories_tags ?? []).join(' ')} ${name}`.toLowerCase();
  if (/\b(milk|yoghurt|yogurt|cheese|cream|dairy|oat drink|almond drink)\b/.test(hay)) return 'dairy';
  if (/\b(bread|cereal|oat|rice|noodle|pasta|grain|biscuit|cracker)\b/.test(hay)) return 'staple';
  if (/\b(fruit)\b/.test(hay) && !/\b(juice|yoghurt|yogurt|bar)\b/.test(hay)) return 'fruit';
  if (/\b(vegetable|salad)\b/.test(hay)) return 'vegetable';
  if (/\b(meat|chicken|beef|pork|tuna|fish|tofu|bean|egg|protein)\b/.test(hay)) return 'protein';
  return 'snack';
}

function quality(product) {
  const nutriments = product.nutriments ?? {};
  const energy = kcalFrom(product);
  const barcode = String(product.code ?? product._id ?? '').replace(/\D/g, '');
  const name = String(product.product_name ?? product.product_name_en ?? '').trim();
  if (!isAustralia(product) || !name || barcode.length < 8 || energy == null || energy <= 0 || energy > 900) return null;
  if (nutriments.proteins_100g == null && nutriments.carbohydrates_100g == null && nutriments.fat_100g == null) return null;
  const serving = number(product.serving_quantity) ?? 100;
  const stores = `${product.stores ?? ''}`.toLowerCase();
  return {
    barcode,
    nameEn: name.slice(0, 80),
    brand: String(product.brands ?? '').split(',')[0].trim().slice(0, 40),
    category: guessCategory(product, name),
    energyKcal: Math.round(energy * 10) / 10,
    proteinG: number(nutriments.proteins_100g),
    carbsG: number(nutriments.carbohydrates_100g),
    fatG: number(nutriments.fat_100g),
    fibreG: number(nutriments.fiber_100g),
    sodiumMg: number(nutriments.sodium_100g) != null ? Math.round(number(nutriments.sodium_100g) * 1000) : number(nutriments.salt_100g) != null ? Math.round(number(nutriments.salt_100g) * 400) : null,
    saturatedFatG: number(nutriments['saturated-fat_100g']),
    sugarG: number(nutriments.sugars_100g),
    servingGrams: serving > 0 && serving <= 1000 ? serving : 100,
    stores,
    supermarket: stores.includes('woolworth') || stores.includes('coles'),
  };
}

if (!existsSync(sourcePath)) {
  console.error(`Missing ${sourcePath}`);
  console.error('Run pnpm fetch:off, or save an Open Food Facts JSONL extract there. See https://world.openfoodfacts.org/data');
  process.exit(1);
}

const seen = new Set();
const accepted = [];
for (const line of readFileSync(sourcePath, 'utf8').split(/\n/)) {
  if (!line.trim()) continue;
  let product;
  try { product = JSON.parse(line); } catch { continue; }
  const row = quality(product);
  if (!row || seen.has(row.barcode)) continue;
  seen.add(row.barcode);
  accepted.push(row);
}

accepted.sort((a, b) => Number(b.supermarket) - Number(a.supermarket) || a.nameEn.localeCompare(b.nameEn));
const chosen = accepted.slice(0, MAX);

if (chosen.length < MIN) {
  console.error(`Only ${chosen.length} quality AU products; need at least ${MIN}.`);
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
