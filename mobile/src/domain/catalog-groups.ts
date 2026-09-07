import type { AlternateSource, CatalogSourceFilter, Food } from '@/types/nutrition';
import { translateOfficialName } from '@/domain/en-zh';

export type PresentedFood = Food & { alternateSources: AlternateSource[] };

const STOP = new Set([
  'and', 'with', 'from', 'the', 'for', 'raw', 'fresh', 'cooked', 'commercial', 'all', 'other',
  'added', 'without', 'style', 'type', 'recipe', 'plain', 'including', 'using', 'based',
  'piece', 'serve', 'small', 'medium', 'large', 'regular', 'unpeeled', 'peeled', 'refrigerated',
  'shelf', 'stable', 'natural', 'containing', 'made', 'into', 'per', 'cent', 'skin',
  'hard', 'whole', 'fluid', 'chicken', 'cows', 'cow', 'cattle', 'unflavoured', 'original',
  'not', 'further', 'defined',
]);

const ALLOW_EXTRA = new Set([
  'chicken', 'cow', 'cattle', 'whole', 'fluid', 'skin', 'unsalted',
]);

const VARIETY = new Set([
  'fuji', 'gala', 'granny', 'smith', 'delicious', 'honeycrisp', 'bonza', 'jonathan', 'jonathon',
  'pink', 'lady', 'cavendish', 'golden', 'red', 'green', 'yellow', 'honey', 'crisp', 'royal', 'deliciou',
  'organic', 'lactose', 'vitamin', 'vitamins', 'mineral', 'minerals', 'phytosterol', 'phytosterols',
  'omega', 'polyunsaturated', 'polyunsaturate', 'enriched', 'fortified', 'free',
]);

const COOKING = new Set([
  'stir', 'fry', 'fried', 'boiled', 'steamed', 'grilled', 'baked', 'roasted', 'poached',
  'scrambled', 'mashed',
]);

const PROCESS_ZH: Record<string, string> = {
  juice: '汁', dried: '干', canned: '罐头', baked: '烤', stewed: '炖', puree: '泥',
  fried: '煎', boiled: '煮', steamed: '蒸', grilled: '烤', roasted: '烤',
};

function prepareName(name: string, brand?: string): string {
  let value = ` ${name.toLowerCase()} `;
  if (brand) value = value.replace(brand.toLowerCase(), ' ');
  value = value.replace(/full[-\s]?cream|whole milk|regular fat/g, ' fullfat ');
  value = value.replace(/reduced[-\s]?fat|low[-\s]?fat/g, ' reducedfat ');
  value = value.replace(/hard[-\s]?boiled/g, ' boiled ');
  value = value.replace(/weet[-\s]?bix/g, ' weetbix ');
  return value;
}

function stem(token: string): string {
  if (token.length > 4 && token.endsWith('s')) return token.slice(0, -1);
  return token;
}

export function itemTokens(food: Pick<Food, 'nameEn' | 'brand'>): Set<string> {
  const prepared = prepareName(food.nameEn, food.brand);
  const tokens = new Set<string>();
  for (const part of prepared.match(/[a-z]{3,}/g) ?? []) {
    if (STOP.has(part) || VARIETY.has(part)) continue;
    const stemmed = stem(part);
    if (STOP.has(stemmed) || VARIETY.has(stemmed)) continue;
    tokens.add(stemmed);
  }
  return tokens;
}

export function familyKey(food: Food): string | null {
  if (food.composition) return null;
  const tokens = [...itemTokens(food)].filter((token) => !VARIETY.has(token)).sort();
  const identity = tokens.filter((token) => !COOKING.has(token));
  if (identity.length === 0) return null;
  return `${food.category}:${tokens.join('+')}`;
}

export function sameCatalogItem(a: Food, b: Food): boolean {
  if (a.id === b.id) return true;
  if (a.barcode && b.barcode && a.barcode === b.barcode) return true;
  if (a.category !== b.category) return false;
  if (a.composition || b.composition) return false;
  const left = itemTokens(a);
  const right = itemTokens(b);
  if (left.size === 0 || right.size === 0) return false;
  const extraLeft = [...left].filter((token) => !right.has(token));
  const extraRight = [...right].filter((token) => !left.has(token));
  if (extraLeft.some((token) => !ALLOW_EXTRA.has(token))) return false;
  if (extraRight.some((token) => !ALLOW_EXTRA.has(token))) return false;
  const smaller = left.size <= right.size ? left : right;
  const larger = left.size <= right.size ? right : left;
  return [...smaller].every((token) => larger.has(token));
}

/** Custom foods are extra sources only; they must not replace official cluster members. */
export function attachCustomSources(officialMembers: Food[], customFoods: Food[] = []): Food[] {
  if (!officialMembers.length) return customFoods.slice();
  if (!customFoods.length) return officialMembers;
  const seen = new Set(officialMembers.map((food) => food.id));
  const extras = customFoods.filter((custom) => {
    if (seen.has(custom.id)) return false;
    return officialMembers.some((member) =>
      (Boolean(custom.barcode) && custom.barcode === member.barcode)
      || sameCatalogItem(member, custom),
    );
  });
  return extras.length ? [...officialMembers, ...extras] : officialMembers;
}

export function sourcePriority(food: Food): number {
  const confidence = food.source.confidence === 'high' ? 300 : food.source.confidence === 'medium' ? 200 : 100;
  const datasetScore: Record<string, number> = {
    'fsanz-ausnut': 50,
    'fsanz-afcd': 40,
    'seed-pending-afcd': 25,
    'user-entry': 22,
    'open-food-facts': 15,
    'usda-fdc': 8,
    'recipe-estimate': 5,
  };
  let score = confidence + (datasetScore[food.source.dataset ?? ''] ?? 10);
  if (food.source.dataset === 'usda-fdc' || food.source.region === 'US') score -= 80;
  if (food.tags.includes('imported')) score -= 2;
  return score;
}

export function shortSourceTitle(food: Food): string {
  switch (food.source.dataset) {
    case 'fsanz-ausnut': return '澳洲官方 AUSNUT';
    case 'fsanz-afcd': return '澳洲官方 AFCD';
    case 'usda-fdc': return '美国对照 USDA';
    case 'open-food-facts': return food.brand ? `超市包装 · ${food.brand}` : '超市包装';
    case 'user-entry': return '我录入的';
    case 'recipe-estimate': return '家常估算';
    case 'seed-pending-afcd': return '常见参考';
    default: return food.source.label;
  }
}

function isAnchor(food: Food): boolean {
  return !food.tags.includes('imported') && !food.tags.includes('fsanz') && !food.tags.includes('overseas')
    && !food.tags.includes('off-bulk') && food.source.dataset !== 'user-entry';
}

export function sanitizeInheritedNames(foods: Food[]): Food[] {
  const seeds = foods.filter((food) => isAnchor(food) && /[\u4e00-\u9fff]/.test(food.nameZh) && food.nameZh !== food.nameEn);
  return foods.map((food) => {
    if (isAnchor(food) || food.tags.includes('custom')) return food;
    const donor = seeds.find((seed) => seed.nameZh === food.nameZh);
    if (!donor || sameCatalogItem(food, donor)) return food;
    return {
      ...food,
      nameZh: food.nameEn,
      aliases: food.aliases.filter((alias) => alias !== donor.nameZh),
    };
  });
}

function uniqueNames(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function chineseFromFamilyParts(key: string, familyToZh: Map<string, string>): string | undefined {
  const colon = key.indexOf(':');
  if (colon < 0) return undefined;
  const category = key.slice(0, colon);
  const tokens = key.slice(colon + 1).split('+').filter(Boolean);
  const extras = tokens.filter((token) => PROCESS_ZH[token]);
  const base = tokens.filter((token) => !PROCESS_ZH[token]);
  if (extras.length !== 1 || base.length === 0) return undefined;
  const baseZh = familyToZh.get(`${category}:${base.sort().join('+')}`);
  if (!baseZh) return undefined;
  const extra = extras[0];
  return extra === 'juice' || extra === 'puree' || extra === 'sauce' ? `${baseZh}${PROCESS_ZH[extra]}` : `${PROCESS_ZH[extra]}${baseZh}`;
}

export function inferChineseNames(foods: Food[]): Food[] {
  const seeds = foods.filter((food) => isAnchor(food) && /[\u4e00-\u9fff]/.test(food.nameZh) && food.nameZh !== food.nameEn);
  const familyToZh = new Map<string, string>();
  for (const seed of seeds) {
    const key = familyKey(seed);
    if (key && !familyToZh.has(key)) familyToZh.set(key, seed.nameZh);
  }
  return foods.map((food) => {
    if (food.tags.includes('off-bulk') || food.source.dataset === 'user-entry') return food;
    if (/[\u4e00-\u9fff]/.test(food.nameZh) && food.nameZh !== food.nameEn) return food;
    const key = familyKey(food);
    const nameZh = (key ? familyToZh.get(key) ?? chineseFromFamilyParts(key, familyToZh) : undefined)
      ?? translateOfficialName(food.nameEn);
    if (!nameZh) return food;
    return { ...food, nameZh, aliases: uniqueNames([nameZh, ...food.aliases]) };
  });
}

function toAlternate(food: Food): AlternateSource {
  return {
    foodId: food.id,
    nameZh: food.nameZh,
    nameEn: food.nameEn,
    source: food.source,
    servingLabel: food.servingLabel,
    servingGrams: food.servingGrams,
    nutrientsPer100g: food.nutrientsPer100g,
    brand: food.brand,
    barcode: food.barcode,
    stores: food.stores,
  };
}

export function pickRepresentative(members: Food[], source?: CatalogSourceFilter): Food {
  const pool = (() => {
    if (source === 'official') return members.filter((food) => food.tags.includes('fsanz'));
    if (source === 'overseas') return members.filter((food) => food.tags.includes('overseas') || food.source.dataset === 'usda-fdc');
    if (source === 'supermarket') return members.filter((food) => food.tags.includes('supermarket'));
    const au = members.filter((food) => food.source.dataset !== 'usda-fdc' && food.source.region !== 'US');
    return au.length ? au : members;
  })();
  const ranked = (pool.length ? pool : members).slice().sort((a, b) => {
    const delta = sourcePriority(b) - sourcePriority(a);
    return delta !== 0 ? delta : a.id.localeCompare(b.id);
  });
  return ranked[0];
}

export function presentCluster(members: Food[], source?: CatalogSourceFilter): PresentedFood {
  const primary = pickRepresentative(members, source);
  const named = members.find((food) => /[\u4e00-\u9fff]/.test(food.nameZh) && food.nameZh !== food.nameEn) ?? primary;
  const aliases = [...new Set(members.flatMap((food) => [food.nameZh, food.nameEn, ...food.aliases]))];
  const tags = [...new Set(members.flatMap((food) => food.tags))];
  return {
    ...primary,
    nameZh: named.nameZh,
    aliases,
    tags,
    overseasReference: primary.overseasReference ?? members.find((food) => food.overseasReference)?.overseasReference,
    composition: primary.composition ?? members.find((food) => food.composition)?.composition,
    alternateSources: members.filter((food) => food.id !== primary.id).map(toAlternate),
  };
}

export function buildClusterIndex(foods: Food[]): Map<string, string> {
  const parent = new Map(foods.map((food) => [food.id, food.id]));
  const byId = new Map(foods.map((food) => [food.id, food]));

  const find = (id: string): string => {
    const current = parent.get(id) ?? id;
    if (current === id) return id;
    const root = find(current);
    parent.set(id, root);
    return root;
  };
  const union = (left: string, right: string) => {
    const a = find(left);
    const b = find(right);
    if (a === b) return;
    const foodA = byId.get(a);
    const foodB = byId.get(b);
    const rank = (food?: Food) => (food && isAnchor(food) ? 10 : 0) + (food ? sourcePriority(food) / 1000 : 0);
    if (rank(foodA) >= rank(foodB)) parent.set(b, a);
    else parent.set(a, b);
  };

  const barcodes = new Map<string, string>();
  for (const food of foods) {
    if (!food.barcode) continue;
    const existing = barcodes.get(food.barcode);
    if (existing) union(existing, food.id);
    else barcodes.set(food.barcode, food.id);
  }

  for (const food of foods) {
    const usdaId = food.overseasReference ? `usda-${food.overseasReference.externalId}` : '';
    const usda = usdaId ? byId.get(usdaId) : undefined;
    if (usda && sameCatalogItem(food, usda)) union(food.id, usda.id);
  }

  const anchors = foods.filter(isAnchor);
  for (let i = 0; i < anchors.length; i += 1) {
    for (let j = i + 1; j < anchors.length; j += 1) {
      if (sameCatalogItem(anchors[i], anchors[j])) union(anchors[i].id, anchors[j].id);
    }
  }

  for (const food of foods) {
    if (isAnchor(food) || food.source.dataset === 'user-entry') continue;
    let best: Food | undefined;
    let bestOverlap = -1;
    for (const anchor of anchors) {
      if (anchor.category !== food.category || !sameCatalogItem(anchor, food)) continue;
      const overlap = [...itemTokens(anchor)].filter((token) => itemTokens(food).has(token)).length;
      if (overlap > bestOverlap) {
        best = anchor;
        bestOverlap = overlap;
      }
    }
    if (best) union(food.id, best.id);
  }

  const familyAnchors = new Map<string, string>();
  for (const anchor of anchors) {
    const key = familyKey(anchor);
    if (key && !familyAnchors.has(key)) familyAnchors.set(key, anchor.id);
  }
  const familyGroups = new Map<string, string[]>();
  for (const food of foods) {
    if (food.source.dataset === 'user-entry' || food.tags.includes('off-bulk')) continue;
    const key = familyKey(food);
    if (!key) continue;
    const list = familyGroups.get(key) ?? [];
    list.push(food.id);
    familyGroups.set(key, list);
  }
  for (const [key, ids] of familyGroups) {
    const root = familyAnchors.get(key) ?? ids[0];
    if (ids.length < 2 && !familyAnchors.has(key)) continue;
    for (const id of ids) union(root, id);
  }

  return parent;
}

export function clusterMembers(foods: Food[], clusterOf: Map<string, string>, foodId: string): Food[] {
  const find = (id: string): string => {
    const current = clusterOf.get(id) ?? id;
    if (current === id) return id;
    return find(current);
  };
  const root = find(foodId);
  const members = foods.filter((food) => find(food.id) === root);
  const extras: Food[] = [];
  for (const food of members) {
    const usdaId = food.overseasReference ? `usda-${food.overseasReference.externalId}` : '';
    const usda = usdaId ? foods.find((item) => item.id === usdaId) : undefined;
    if (usda && !members.some((item) => item.id === usda.id) && !extras.some((item) => item.id === usda.id)) extras.push(usda);
  }
  return extras.length ? [...members, ...extras] : members;
}

export function collapseSearchHits(hits: Food[], allFoods: Food[], clusterOf: Map<string, string>, source?: CatalogSourceFilter): PresentedFood[] {
  const find = (id: string): string => {
    const current = clusterOf.get(id) ?? id;
    if (current === id) return id;
    return find(current);
  };
  const groups = new Map<string, Food[]>();
  for (const food of hits) {
    const root = find(food.id);
    const list = groups.get(root) ?? [];
    list.push(food);
    groups.set(root, list);
  }
  return [...groups.values()].map((members) => {
    const full = clusterMembers(allFoods, clusterOf, members[0].id);
    return presentCluster(full.length ? full : members, source);
  });
}
