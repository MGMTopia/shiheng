/**
 * Shared Open Food Facts quality filters for AU packaged foods.
 * Used by import-open-food-facts.mjs and build-food-pack.mjs.
 */

export const PACK_MIN = 500;
export const PACK_MAX = 2000;

export function number(value) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function kcalFrom(product) {
  const nutriments = product.nutriments ?? {};
  return number(nutriments['energy-kcal_100g'])
    ?? (number(nutriments.energy_100g) != null ? number(nutriments.energy_100g) / 4.184 : null);
}

export function isAustralia(product) {
  const tags = [...(product.countries_tags ?? []), ...(product.countries_hierarchy ?? [])].map((tag) => String(tag).toLowerCase());
  const text = `${product.countries ?? ''} ${product.purchase_places ?? ''}`.toLowerCase();
  const code = String(product.code ?? product._id ?? '').replace(/\D/g, '');
  return tags.some((tag) => tag.includes('australia')) || text.includes('australia') || code.startsWith('93');
}

export function guessCategory(product, name) {
  const hay = `${(product.categories_tags ?? []).join(' ')} ${name}`.toLowerCase();
  if (/\b(milk|yoghurt|yogurt|cheese|cream|dairy|oat drink|almond drink)\b/.test(hay)) return 'dairy';
  if (/\b(bread|cereal|oat|rice|noodle|pasta|grain|biscuit|cracker)\b/.test(hay)) return 'staple';
  if (/\b(fruit)\b/.test(hay) && !/\b(juice|yoghurt|yogurt|bar)\b/.test(hay)) return 'fruit';
  if (/\b(vegetable|salad)\b/.test(hay)) return 'vegetable';
  if (/\b(meat|chicken|beef|pork|tuna|fish|tofu|bean|egg|protein)\b/.test(hay)) return 'protein';
  return 'snack';
}

/** @returns {null | object} quality row or null if rejected */
export function quality(product) {
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
    sodiumMg: number(nutriments.sodium_100g) != null
      ? Math.round(number(nutriments.sodium_100g) * 1000)
      : number(nutriments.salt_100g) != null
        ? Math.round(number(nutriments.salt_100g) * 400)
        : null,
    saturatedFatG: number(nutriments['saturated-fat_100g']),
    sugarG: number(nutriments.sugars_100g),
    servingGrams: serving > 0 && serving <= 1000 ? serving : 100,
    stores,
    supermarket: stores.includes('woolworth') || stores.includes('coles'),
  };
}

export function selectQualityRows(products, { min = PACK_MIN, max = PACK_MAX } = {}) {
  const seen = new Set();
  const accepted = [];
  for (const product of products) {
    const row = quality(product);
    if (!row || seen.has(row.barcode)) continue;
    seen.add(row.barcode);
    accepted.push(row);
  }
  accepted.sort((a, b) => Number(b.supermarket) - Number(a.supermarket) || a.nameEn.localeCompare(b.nameEn));
  const chosen = accepted.slice(0, max);
  return { accepted, chosen, belowMin: chosen.length < min };
}

export function rowToFood(row, { updatedAt = new Date().toISOString().slice(0, 10) } = {}) {
  const stores = [];
  if (row.stores.includes('woolworth')) stores.push('woolworths');
  if (row.stores.includes('coles')) stores.push('coles');
  const id = `au:gtin:${row.barcode}`;
  return {
    id,
    nameZh: row.nameEn,
    nameEn: row.nameEn,
    aliases: [row.barcode, row.brand].filter(Boolean),
    category: row.category,
    servingLabel: row.servingGrams === 100 ? '100g' : `${row.servingGrams}g`,
    servingGrams: row.servingGrams,
    nutrientsPer100g: {
      energyKcal: row.energyKcal,
      proteinG: row.proteinG,
      carbsG: row.carbsG,
      fatG: row.fatG,
      fibreG: row.fibreG,
      sodiumMg: row.sodiumMg,
      saturatedFatG: row.saturatedFatG,
      sugarG: row.sugarG,
    },
    source: {
      type: 'label',
      label: 'Open Food Facts 社区标签摘录；包装标签优先。缺失营养素不是 0。',
      region: 'AU',
      confidence: 'estimate',
      updatedAt,
      dataset: 'open-food-facts',
      externalId: row.barcode,
    },
    tags: ['supermarket', 'packaged', 'food-pack', ...stores],
    barcode: row.barcode,
    brand: row.brand || undefined,
    stores,
  };
}
